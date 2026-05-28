# Spec 004 — Fast Scan (Two-Phase Pipeline)

## Problem
Scan takes 30–45 s. Root causes:
1. Claude Sonnet generates 18+ fields per wine (body, tannin, acidity, tasting, pairings…) — up to 4,096 output tokens of data that already exists in Supabase.
2. `useScan.js` reads the full stream before parsing — nothing fires until Claude finishes.
3. Post-scan catalog merge only copies `imageUrl` + `_catalogId`, discarding real body/tannin/tasting from the 180k catalog.
4. A separate `/api/enrich` round-trip fires after the scan for low-confidence wines.

## Goal
First wines visible in ~5 s, fully enriched (body, tannin, tasting, rating) in ~7–8 s total.

## Non-goals
- No change to the navigation flow (ScanningScreen → AnonResultsScreen).
- No new UI screens or components.
- No Supabase schema changes.

## Changes

### 1. `src/routes/api/scan.ts` — slim prompt + Haiku

**Model**: `claude-haiku-4-5-20251001` (was `claude-sonnet-4-6`)
**max_tokens**: `512` (was `4096`)

**New prompt** — only ask Claude to read what is visible in the image:

```
You are reading text from a photo of a wine list, wine menu, or bottle label.
Extract every wine you can see. For each wine return ONLY fields you can directly
read from the image — do not infer or guess.

For each wine:
- id: sequential integer starting at 1
- name: wine name as printed (string)
- vintage: year as printed, or null if not legible (string | null)
- region: region as printed, or null (string | null)
- grape: varietal as printed, or null (string | null)
- price: price including $ as printed, or null (string | null)
- priceNum: numeric price only, or null (number | null)
- confidence: 0–100, how clearly you could read this label (integer)

Return ONLY raw JSON, no markdown:
{
  "wines": [ ...wine objects... ],
  "readability": "good" | "partial" | "unreadable",
  "retakeReasons": [],
  "message": ""
}

readability rules:
- "good" — read most wines clearly
- "partial" — read some, image cut off or blurry in places
- "unreadable" — could not identify wine text

retakeReasons — zero or more of:
"too_blurry","too_dark","too_far","glare","angle_skewed","label_cut_off","not_a_wine_image","list_too_dense"
```

Streaming stays on (keeps Cloudflare Worker alive).

---

### 2. `src/ui/hooks/useScan.js` — incremental stream parse + full catalog merge

**A. Reduce MAX_EDGE**: `2400` → `1600` (labels are text; resolution past 1600px adds no accuracy).

**B. Incremental stream parsing**: Replace the "accumulate entire response then parse" loop with a streaming JSON object detector. As each complete wine `{...}` is detected in the incoming chunks, call `onWine(wine, count)` immediately. The ScanningScreen already consumes `onWine` to update its "N wines found" counter — this wires it up to fire live.

Parser approach: track brace depth and string state char-by-char. When depth returns to 0 after opening, extract and `JSON.parse` the slice.

**C. Remove the `/api/enrich` call**: The catalog lookup already returns grape/region. No separate round-trip needed.

**D. Full catalog merge**: After the stream completes, run `lookupWineCatalog` in parallel for all wines (already done). Extend the merge to copy ALL catalog fields — not just `imageUrl` and `_catalogId`:

Fields to merge from catalog (prefer catalog value, fall back to scanned):
```
grape, region, tasting, rating, ratingLabel,
body, tannin, sweetness, acidity,
flavorTags, wineStyle, adventurousness,
imageUrl, isValue, isCrowd, pairings, retailers
```

Scanned values that always win (user saw these on the label):
```
price, priceNum, vintage, confidence
```

---

### 3. Results screens — graceful missing-field handling

Wine cards currently render `wine.tasting`, `wine.rating`, `wine.grape`, `wine.region`. After the slim scan, these fields will be `null` until the catalog merge completes (~1–2 s after scan). Both `AnonWineRowCard` and the equivalent in `PersonalizedResultsScreen` must not crash or show broken layout when these are null.

- **tasting**: already conditionally rendered — no change needed
- **grape / region**: already joined with `.filter(Boolean)` — no change needed
- **ScoreBar score**: falls back to `wine.rating ?? wine.crowd_score ?? 75` — no change needed

No new loading skeletons required; the existing fallbacks handle null fields.

---

## Expected timing

| Phase | What happens | Time |
|---|---|---|
| Image prep | Downscale to 1600px | ~0.3 s |
| Haiku scan | Slim JSON streamed back | ~3–5 s |
| Progressive reveal | onWine fires per wine as stream arrives | during scan |
| Catalog merge | Parallel Supabase lookups, full field merge | ~1–2 s after scan |
| **Total to fully enriched** | | **~5–7 s** |

## Acceptance criteria
- [ ] Scan completes in under 10 s on a 20-wine list (was 30–45 s)
- [ ] "N wines found" counter increments during streaming, not all at once at the end
- [ ] Wine cards show correct body/tannin/tasting data (from catalog, not Claude)
- [ ] No console errors when catalog lookup returns no match (fields remain null)
- [ ] Existing scan behavior (readability flags, retakeReasons) unchanged
