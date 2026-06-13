# Spec 036 — "Wines Like This" Discovery

## Problem
Every wine detail screen is a dead end. The user reads about one wine, decides yes or no, and goes back to the list. There is no "and here's what else the world has like this" moment. For a curious learner, the best outcome of encountering an interesting wine isn't buying that exact bottle — it's discovering that an entire style exists, across grapes and regions they haven't tried yet. The app has a 950k-entry catalog but surfaces zero of it beyond the current scan.

## Goals
- Add a "You might also love" section to WineDetailScreen that shows 3 style-adjacent wines from the catalog.
- "Style-adjacent" means similar on body/acidity/sweetness/tannin, but from a different grape or region — the discovery value is the contrast, not the clone.
- Fetch results from a new server route that queries `wine_catalog` directly.

## Non-Goals
- Personalization beyond style proximity (collaborative filtering is spec 031).
- Price-matching or retailer filtering in this first pass.
- Showing similar wines in results lists (only on the detail screen).

## Behavior

### Section placement
Appears near the bottom of the WineDetailScreen scrollable body, after the "Find it online" button, before the ScoreFeedback block. Heading: `YOU MIGHT ALSO LOVE` (same SectionLabel style).

### Discovery card
Each of the 3 results renders as a compact horizontal card:
- Left: BlankLabel (40×70) with bottleHue color accent — or catalog image if available.
- Center: wine name (14px T.fontDisplay, 1 line truncated), grape · region (12px T.ink400 italic), one flavor tag if available (T.ink100 pill, 11px).
- Right: a "style match" bar showing how close the style is to the current wine (not the user's palate). Label: "Similar style" with a short FitBar (60px wide, same FitBar component).
- Tap: navigates to that wine's WineDetailScreen (with no activeScan).

### Server route: `/api/similar-wines`
`GET /api/similar-wines?catalogId={n}&grape={encoded}&region={encoded}`

Query logic (server-side, Supabase):
1. Exclude the source wine itself (`id != catalogId`).
2. Filter out same grape (normalized lowercase contains match) AND same region (normalized lowercase contains match) — we want stylistic siblings, not near-duplicates.
3. Score remaining wines by Euclidean distance on (body, tannin, acidity, sweetness) from source wine values.
4. Return top 6 candidates sorted by distance ascending.
5. Route handler picks 3 with diversity: prefer that the 3 results span at least 2 different grapes.

Response shape:
```json
{
  "wines": [
    { "id": 12345, "name": "...", "grape": "...", "region": "...", "body": 40, "acidity": 72, "sweetness": 12, "tannin": 25, "flavorTags": ["citrus","mineral"], "imageUrl": null }
  ]
}
```

### Client-side loading
`WineDetailScreen` fetches `/api/similar-wines` when the wine has at least one non-null axis value (body, tannin, acidity, or sweetness). Fetch is triggered in a `useEffect` keyed on `wine._catalogId ?? wine.id`. Loading state: 3 skeleton cards (same width/height, T.ink100 background, shimmer animation). Error / empty: section omitted silently.

### Tapping a similar wine
Calls `navigate('wineDetail', { wine: result, activeScan: null })`. No match score is shown (user has no context score for catalog wines outside a scan) — the match score circle is absent. All other detail content (education card, tasting notes, radar if data present) renders normally.

## Edge Cases
- Source wine has all-null axes: skip the fetch, render no section.
- Source wine is obscure / not in catalog: `catalogId` may be null. Skip the fetch.
- Fewer than 3 results returned: render however many come back (1 or 2 is fine). Zero: omit section.
- User taps a similar wine that itself has similar wines: the chain works recursively — each detail screen fetches its own similar wines.
- Route timeout (>3s): section omits silently (no error state shown to user).

## Acceptance Criteria
- Opening the detail screen for a Sancerre (Sauvignon Blanc) shows 3 wines that share crisp/high-acid/low-body style but include at least one non-Sauvignon Blanc grape.
- Opening the detail screen for a full-bodied Napa Cab shows 3 wines with high body/tannin from grapes or regions other than Cabernet/Napa.
- Tapping a similar wine opens a detail screen with correct name, grape, region, and tasting notes.
- When the source wine has no axis data, no similar wines section appears and no network request is made.
- The section appears after "Find this wine online" and before the score feedback block.

## Files
- `src/server/routes/similarWines.ts` (or `.js`) — new route, registered in the app's server entry
- `src/ui/screens/WineDetailScreen.jsx` — add SimilarWines component + fetch hook
