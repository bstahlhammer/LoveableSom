# Spec 015 — Adaptive Palate: Persistent Profile + Progressive Refinement

**Issue:** #2 — Palate engine mischaracterizes taste; no persistence; no refinement over time.

## Diagnosis

Three distinct problems combine to produce the "bold red drinker" mislabeling:

1. **Profile lives in `localStorage` only.** `useTasteProfileSync.js` never touches Supabase. Any new device, browser clear, or sign-in from a different machine wipes the profile entirely, reverting to coarse defaults.

2. **No varietal aversions.** The engine has no concept of "I don't like Cabernet." Wines with disliked varietals score identically to everything else.

3. **Profile is computed once at quiz completion, never after.** `deriveProfile()` runs in `handleQuizComplete` but not when subsequent wine ratings change. The profile never learns from ongoing use.

*(The AI character mapping itself is working correctly: if the user typed "dry earthy reds with a lot of funk," `describe-palate.ts` would return `earthiness ~65, funk ~82` and `buildTasteIdentity()` would return "The Natural Wine Soul." The label failure is most likely caused by #1 — the profile was lost or never persisted across sessions.)*

---

## Goals

1. Persist the taste profile (palate + character) to Supabase `profiles` so it survives device/session changes.
2. Add a varietal aversion list to the profile; use it to down-rank matches in the match engine.
3. Re-derive and save the profile whenever wine ratings change (not just at quiz completion).

## Non-Goals

- Region aversions (add in a follow-on).
- Automatic varietal detection from scanned label images.
- Changing how the structural palate axes are inferred (that logic is sound).
- A UI for managing aversions beyond a simple tag input on Profile > Words.

---

## Architecture

### A — Supabase migration

Add one JSONB column to the existing `profiles` table:

```sql
alter table profiles
  add column if not exists taste_profile jsonb,
  add column if not exists taste_profile_updated_at timestamptz;
```

Stored shape:
```json
{
  "palate": { "body": 62, "sweetness": 8, "tannin": 55, "acidity": 68 },
  "character": { "earthiness": 65, "funk": 82, "mineral": null, "oak": null, "floral": null },
  "archetype": { "id": "bold-red", "name": "Bold Red Lover", ... },
  "name": "The Natural Wine Soul",
  "description": "Bone-dry, earthy and funky ...",
  "aversions": { "varietals": ["Cabernet Sauvignon"] },
  "inferenceConfidence": 0.7
}
```

**Brian runs this migration** in the Supabase SQL editor on the production project (`bromlnbihmfknqcdbieq`) AND the staging project (`wcarzqsopwnzebhimdbp`).

---

### B — `useTasteProfileSync.js`

Replace the localStorage-only implementation with a Supabase-backed one:

- `saveProfile(profile)` — write to both localStorage (instant local cache) and `profiles.taste_profile` in Supabase (when user is authenticated).
- `loadProfile()` — if user is authenticated, fetch from Supabase; fall back to localStorage if network fails. If not authenticated, read localStorage only.

The hook needs `auth` to know the current user's ID. Two options:
- Accept `userId` as a parameter (preferred — keeps it a pure utility hook).
- Import `supabase` directly (already done elsewhere, fine).

Use the Supabase JS client already in `src/integrations/supabase/client.ts`. The hook should use upsert on `user_id`.

---

### C — Varietal aversions

**Profile data shape** — add `aversions: { varietals: string[] }` to the profile object. Default: `{ varietals: [] }`.

**Profile > Words view** — Below the character-axis sliders, add an "Avoid these varietals" section: a tag input showing the current list (e.g., "Cabernet Sauvignon") with an × to remove each, and a text field to add more. Saving triggers `handleSaveTune`.

**Match engine** (`src/core/engine/matchEngine.js`) — When scoring a wine, if `wine.grape` or `wine.variety` is in `aversions.varietals` (case-insensitive substring match), apply a penalty to the match score (−30 points, not a hard exclude, to avoid empty results). This affects the score shown on `WineCard` and `PersonalizedResultsScreen`.

---

### D — Progressive refinement

In `UncorkApp.jsx`, wire a `useEffect` that watches `quizAnswers.wineRatings`:

```js
useEffect(() => {
  if (!auth.user?.id) return
  if (Object.keys(quizAnswers.wineRatings).length === 0) return
  const profile = deriveProfile(quizAnswers)
  setTasteProfile(profile)
  saveProfile(profile)
}, [quizAnswers.wineRatings])
```

This ensures every wine rating (loved / hated / ok) immediately re-derives and persists the profile without requiring a full quiz re-run.

**Also:** when `saveRating` is called from `useWineRatings.js`, the ratings are in localStorage. The `quizAnswers.wineRatings` state in UncorkApp also needs to stay in sync with any ratings made outside the quiz flow (e.g., from the wine detail screen). Check that `handleRating` in UncorkApp propagates to `quizAnswers`.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| Supabase SQL (Brian runs) | Add `taste_profile` + `taste_profile_updated_at` columns |
| `src/ui/hooks/useTasteProfileSync.js` | Replace localStorage-only with Supabase-backed save/load |
| `src/ui/screens/ProfileScreen.jsx` | Add varietal aversion tag editor to WordsView; wire to `handleSaveTune` |
| `src/core/engine/matchEngine.js` | Apply −30 penalty when wine varietal is in `aversions.varietals` |
| `src/UncorkApp.jsx` | Add `useEffect` to re-derive profile when `wineRatings` change |

---

## Acceptance Criteria

- [ ] Sign in, build a taste profile, sign out, sign back in on same device → profile loads correctly (from Supabase).
- [ ] Describe "dry earthy reds with a lot of funk" in the taste builder → profile label shows "The Natural Wine Soul" or similar character-driven name (not "Bold Red Lover").
- [ ] Add "Cabernet Sauvignon" to varietal aversions → wines with Cabernet in their varietal field show a visibly lower match score on the results screen.
- [ ] Rate a wine "loved" after the initial quiz → profile updates immediately without re-running the quiz.
- [ ] Rate 5 wines as loved/hated → profile confidence score increases (visible on ProfileScreen > Radar).
