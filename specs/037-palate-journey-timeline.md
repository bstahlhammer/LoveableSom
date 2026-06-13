# Spec 037 — Palate Journey Timeline

## Problem
The History screen shows scans as a flat list of events. It tells the user *what* they scanned but not *what they learned about themselves*. A curious wine drinker who has been using the app for 3 months has no way to see how their taste has shifted, which wines moved their profile, or whether they're developing a clearer sense of what they love. The data exists in `user_ratings` and `scan_wines` — it's just never surfaced as a narrative.

## Goals
- Add a "Your palate over time" section to the top of HistoryScreen, visible when the user has ≥5 rated wines.
- Show the palate as computed at three points in time: earliest 5 ratings, middle cohort, most recent 5 ratings.
- If the profile shifted meaningfully between early and recent, surface a plain-language "what changed" sentence.
- Show a small milestone row: wines tried, regions explored, new grapes.

## Non-Goals
- Full time-series charting or interactive scrubbing (out of scope for this pass).
- Re-running the full matchEngine against historical snapshots (use `inferPalateFromRatings` already in `api.js`).
- Showing this data to anonymous users.

## Behavior

### Data fetch
New client hook `usePalateJourney()` in `src/ui/hooks/usePalateJourney.js`.

Queries Supabase `user_ratings` ordered by `created_at` ascending. Joins `wine_catalog` for axis values on each rated wine (body, tannin, acidity, sweetness, grape, region). Returns raw array of `{ wineId, wineName, grape, region, bucketId, stars, body, tannin, acidity, sweetness, createdAt }`.

Client-side:
1. Filter to wines that have at least 2 non-null axis values.
2. Divide into three equal-ish cohorts: early (oldest third), middle, recent (newest third). If total < 10, use earliest 3 / middle / most recent 3.
3. Run `inferPalateFromRatings(ratings, wineData)` on each cohort's liked wines (stars ≥ 3).
4. Compute "shift": for each of the 4 axes, delta = recent value − early value. Shifts ≥10 points are considered meaningful.
5. Generate a `shiftSentence` string from the largest absolute shift: e.g. "Your taste has moved toward lighter, crisper wines." (rule-based, no AI).
6. Compute milestone counts: unique grapes, unique regions, total rated.

### Journey block rendering
Renders at the top of HistoryScreen body, above the scan list, when `ratings.length >= 5`. Collapsed by default to a single summary line with a chevron. Expanded on tap.

**Collapsed:**  
```
◈  Your palate has evolved — 3 regions, 14 wines   ›
```
(T.forest500 dot, T.fontBody 13px, T.ink400 chevron)

**Expanded — three cards side by side:**
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│  Early  │  │  Middle │  │  Recent │
│ [mini   │  │ [mini   │  │ [mini   │
│  radar] │  │  radar] │  │  radar] │
└─────────┘  └─────────┘  └─────────┘

Your taste has moved toward lighter, crisper wines.

🍇 14 wines   🌍 3 regions   🌱 6 grapes
```

Mini radar: 80×80 version of the existing `WineRadar` SVG component, showing only the wine polygon (no user palate overlay), rendering the cohort's inferred palate. Label below the radar: "Early", "Middle", "Recent" (T.ink400, 10px).

Shift sentence: T.ink700, 13px, centered, padding 10px 0.

Milestone row: 3 icon+count pairs, T.fontBody 12px, T.ink500, centered with 24px gap.

### Shift sentence generation (rule-based)
`generateShiftSentence(earlyPalate, recentPalate)` in `src/core/engine/palateDescriptor.js`:
- Find axis with largest absolute delta.
- If delta < 10 on all axes: return "Your palate has stayed pretty consistent — you know what you like."
- Body drops ≥10: "Your taste has moved toward lighter wines."
- Body rises ≥10: "You've been gravitating toward fuller, richer wines."
- Acidity rises ≥10: "Your taste has shifted toward crisper, brighter wines."
- Sweetness drops ≥10: "You've moved toward drier styles over time."
- Tannin drops ≥10: "You've been reaching for softer, more approachable reds."
- Multiple axes shifting in same direction: combine into one sentence.

## Edge Cases
- Fewer than 5 rated wines: block omitted entirely.
- All wines from a single cohort have no axis data: that cohort's mini radar is a flat dot at center with label "Not enough data."
- User has ratings but no liked wines (all ≤2 stars) in a cohort: `inferPalateFromRatings` returns null for that cohort — mini radar omitted, replaced with "–".
- History screen has no scans but user has ratings (rated via "Rate a wine I tried"): block still renders above the empty-scan state.

## Acceptance Criteria
- A user with ≥5 rated wines sees the collapsed journey bar at top of HistoryScreen.
- Tapping the bar expands to show three mini radars and a shift sentence.
- A user whose early ratings were high-tannin and recent ratings are low-tannin sees a shift sentence about softer wines.
- A user with consistent ratings sees the "knows what you like" sentence.
- Milestone counts (wines, regions, grapes) match the actual count in the user's rating history.
- Block is absent for a user with 0–4 rated wines.

## Files
- `src/ui/hooks/usePalateJourney.js` — new hook
- `src/core/engine/palateDescriptor.js` — add `generateShiftSentence(earlyPalate, recentPalate)`
- `src/ui/screens/HistoryScreen.jsx` — add JourneyBlock above scan list
