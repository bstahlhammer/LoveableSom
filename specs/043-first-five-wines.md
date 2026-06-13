# Spec 043 — First Five Wines Onboarding Path

## Problem
A new user who is curious about wine but has no self-knowledge faces three intimidating entry points: "Build my taste profile" (requires self-reporting preferences they don't have), "Scan a wine list" (requires being at a restaurant or shop), or the guided quiz (requires answering abstract questions about preferences they've never interrogated). None of these serve someone who wants to say "I know nothing, teach me as we go." The app has no "start from zero" path that feels welcoming rather than demanding.

## Goals
- Offer a structured "First 5 Wines" experience to new users who have 0 ratings and no taste profile.
- Each bottle teaches a distinct style archetype; rating all 5 produces a real, grounded taste profile.
- The path is optional, low-pressure, and designed to be completed over days/weeks — not in one session.
- The outcome is identical to the existing taste profile: the same archetype system, the same matching engine.

## Non-Goals
- Gamification, badges, or streaks (no behavioral manipulation layer in v1).
- Requiring users to find or buy specific bottles (the 5 wines are illustrative, not prescriptive — users rate whatever they try, the app maps it to the closest archetype).
- Replacing the existing TasteBuilderScreen or quiz flow.

## Behavior

### Entry point
On HomeScreen, for users who are logged in, have 0 ratings, and have no taste profile, replace the "Build my taste profile" button with:

```
[ Start your wine education →  ]
5 styles. 5 wines. Find what you love.
```
Button style: same cobalt outline as current "Build my taste profile." The existing "Build my taste profile" flow remains accessible via a smaller "I already know what I like →" link below.

Also accessible from TasteBuilderScreen as a prominent card at top: "New to wine? Try the guided path →"

### FirstFiveScreen
New screen `src/ui/screens/FirstFiveScreen.jsx`.

**Progress header:**
```
Your wine education   (T.fontDisplay 22px)
5 styles to try       (T.fontBody 13px T.ink400)

[ ◉ ] [ ○ ] [ ○ ] [ ○ ] [ ○ ]   ← dot progress, filled = rated
```

**Current wine card (large, centered):**

```
┌──────────────────────────────────────┐
│ STYLE 1 OF 5                         │  (T.ochre500, uppercase, 10px)
│ The Crisp White                       │  (T.fontDisplay, 26px)
│                                       │
│ A bright, food-friendly white with    │
│ fresh citrus and a clean finish.       │  (T.fontBody, 14px, T.ink600)
│                                       │
│ What to look for:                     │
│   · Sauvignon Blanc, Pinot Grigio     │
│   · Regions: Loire, Marlborough,      │
│     Alto Adige, New Zealand           │
│   · Price range: $12–25               │
│                                       │
│  [I tried this style →]               │  (T.forest500 pill button)
│  [Skip — come back later]             │  (T.ink400 text link)
└──────────────────────────────────────┘
```

### The 5 style slots (static in `src/core/data/firstFiveWines.js`)

| Slot | Style name | Archetype target | Example grapes/bottles |
|---|---|---|---|
| 1 | The Crisp White | Fresh & Bright | Sauvignon Blanc (Loire, Marlborough), Pinot Grigio, Albariño |
| 2 | The Full White | Rich & Rounded | Oaked Chardonnay (Burgundy, California), Viognier |
| 3 | The Light Red | Elegant Explorer | Pinot Noir (Burgundy, Willamette), Gamay, Barbera |
| 4 | The Bold Red | Deep & Structured | Cabernet Sauvignon (Napa, Bordeaux), Syrah, Malbec |
| 5 | The Wildcard | Adventurous | One of: Pét-Nat, Orange wine, Grüner Veltliner, Riesling, Rosé |

### "I tried this style" flow
Tapping the button opens a compact rating panel inline (no navigation):

```
How was it?
★ ★ ★ ★ ★

One word: [ Loved it ▼ ]  (dropdown or horizontal chip row)
  Options: Loved it / Liked it / It was fine / Not for me / Didn't try it

[Save & continue →]
```

On save: the rating is stored via `saveRating` with a special `source: 'first_five'` metadata field. The wine data stored is the style's archetype palate vector (not a real catalog wine, since the user may have tried any bottle in that style).

Progress dot for this slot fills. Next style card appears (slide-in animation).

### Profile generation after slot 5 (or ≥3 rated)
After the user has rated ≥3 slots (can be non-consecutive if some were skipped), a "See what we learned" button appears at the bottom. Tapping it:
1. Calls a new `buildProfileFromFirstFive(ratedSlots)` function in `src/core/engine/firstFiveEngine.js`.
2. Weights slot ratings by stars: loved=1.0, liked=0.7, fine=0.4, not_for_me=-0.5, skipped=0.
3. Interpolates a final palate vector from the weighted combination of slot archetype palates.
4. Calls `nearestTasteProfile(palate)` to find the archetype.
5. Navigates to ProfileRevealScreen with the result (same reveal flow as the existing quiz).

After profile is created, FirstFiveScreen is no longer shown as an entry point. The remaining unrated slots can still be accessed from ProfileScreen (a "Continue your wine education" card in the Words tab, showing remaining slots).

### Persistence
New `first_five_progress` column on `profiles` table: `JSONB`, nullable. Stores `{ slots: { 1: { stars, bucket, skipped }, 2: {...}, ... } }`. Written on each slot save via `useTasteProfileSync`.

### Re-entry
If the user closes the app before completing all 5 slots, HomeScreen shows a "Continue your wine education" button (instead of the original entry point) showing how many slots are complete: "3 of 5 styles rated →".

## Edge Cases
- User rates slot 3 "Not for me" and all others 1–2 stars: the profile still generates but the archetype will reflect consistent dislikes. `buildProfileFromFirstFive` handles negative weights gracefully (clamps output palate values 0–100).
- User skips all 5 slots: "See what we learned" button never appears. The regular "Build my taste profile" path is shown as a fallback.
- User already has a taste profile (built via quiz): FirstFiveScreen entry point is never shown. The 5-wine path is only for profile-less, rating-less new users.
- User starts the first-five path, then separately builds a profile via the quiz: the quiz profile takes precedence (existing logic). The first_five_progress data is retained but the entry point hides.

## Acceptance Criteria
- A new user with no profile and no ratings sees "Start your wine education" on HomeScreen instead of "Build my taste profile".
- Tapping the button navigates to FirstFiveScreen showing Style 1 of 5.
- Rating a style (any star count) fills that dot and advances to the next card.
- After rating ≥3 styles, "See what we learned" button appears.
- Tapping "See what we learned" navigates to ProfileRevealScreen with a valid archetype.
- A user who rated slot 1 "Loved it" (Crisp White, high acidity) and slot 4 "Not for me" (Bold Red, high tannin) receives a profile weighted toward light, crisp styles.
- Re-opening the app after partial completion shows "Continue your wine education" with the correct count.
- Skipping all 5 slots never generates a profile or error.

## Files
- `src/core/data/firstFiveWines.js` — 5 style slot definitions with archetype palate vectors
- `src/core/engine/firstFiveEngine.js` — `buildProfileFromFirstFive(ratedSlots)`
- `src/ui/screens/FirstFiveScreen.jsx` — new screen
- `src/ui/screens/HomeScreen.jsx` — entry point logic (new user detection, re-entry state)
- `src/ui/hooks/useTasteProfileSync.js` — persist `first_five_progress` to profiles
- `supabase/migrations/015_first_five_progress.sql` — add `first_five_progress JSONB` to `profiles`
- App router: register `'firstFive'` → `FirstFiveScreen`
