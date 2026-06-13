# Spec 041 — My Wine World Map

## Problem
One of the most compelling promises of wine is that it connects you to places. A bottle of Rías Baixas is a tiny piece of northwest Spain; a Mosel Riesling carries the smell of the river valley. But the app has no spatial dimension — it treats wines as abstract scored objects. A curious learner who has tried 15 wines has no tangible sense of which parts of the wine world they've explored, and which are still waiting. There is no moment of "I've been to 8 regions — here are 3 nearby ones I haven't tried yet."

## Goals
- Add a "My Wine World" tab to ProfileScreen showing which wine regions the user has encountered.
- Represent regions as a visual grid (not a geographic SVG map — too complex for v1) ordered by Old World / New World grouping.
- Color-code by average match score or star rating for that region's wines.
- Suggest 2–3 unexplored neighboring regions based on the styles the user already loves.

## Non-Goals
- Interactive geographic maps (SVG world map is a future consideration).
- Real-time wine availability by region.
- More than ~50 named regions in v1 (covers the vast majority of what the catalog surfaces).

## Behavior

### New "Map" tab in ProfileScreen
Add `{ id: 'map', label: 'Map', icon: '🌍' }` (or a simple SVG globe icon to avoid emoji) to `PROFILE_VIEWS` array. Renders between the "Receipt" and "Account" tabs.

### Region data collection
New hook `useWineWorldMap()` in `src/ui/hooks/useWineWorldMap.js`.

Queries `user_ratings` joined to `wine_catalog` for `region`, `stars`, `bucket_id`. Groups by normalized region name (lowercase, trimmed). Returns:

```js
{
  explored: [
    { region: 'Burgundy', wineCount: 6, avgStars: 4.2, grouping: 'old-world-france' },
    ...
  ],
  unexploredNeighbors: [
    { region: 'Beaujolais', reason: 'Similar to Burgundy — lighter reds, Gamay grape', grouping: 'old-world-france' },
    ...
  ]
}
```

Region normalization: strip vintage, appellation suffixes, country names where the region name is more specific. Normalize "Côte de Nuits" → "Burgundy", "Napa Valley" → "Napa", etc. via a static map in `src/core/data/regionNormalization.js`.

### MapView rendering

**Section 1 — Explored regions**

Heading: `YOUR WINE WORLD` + subtitle `{n} regions explored`.

Grouped by geography: `Old World — France`, `Old World — Italy`, `Old World — Spain & Portugal`, `Old World — Germany & Austria`, `Old World — Other`, `New World — US`, `New World — Southern Hemisphere`, `Other / Unknown`. Groups with zero explored regions are omitted.

Within each group: horizontal scrolling row of RegionChips. A RegionChip is a 90×44 pill:
- Background: color-coded by avg stars: ≥4 = T.forest100, ≥3 = T.ochre100, <3 = T.ink100.
- Border: same hue at 300 token.
- Region name: T.fontBody 12px T.ink900, centered, 1 line (truncated with ellipsis).
- Small wine count badge bottom-right: `{n} wines`, T.ink400 9px.

**Section 2 — Unexplored neighbors**

Heading: `EXPLORE NEXT` (only shown if ≥1 suggestion available).

Up to 3 `NeighborCard` items stacked vertically:
- Region name (T.fontDisplay 16px).
- Reason sentence (T.fontBody 12px, T.ink500).
- "Explore →" link: taps into ExploreScreen filtered to that region (if the ExploreScreen from spec 039 covers it) or opens Wine-Searcher search for that region.

### Neighbor suggestion logic (client-side, in hook)
Static adjacency map in `src/core/data/regionAdjacency.js`:
- Maps each known region to a list of stylistically similar/neighboring regions it commonly pairs with.
- e.g. `'burgundy': ['beaujolais', 'chablis', 'champagne', 'jura']`.

Algorithm: for each explored region, find its adjacency list. Remove already-explored regions. Score remaining by whether the user's palate fits the neighbor's style (using the avgPalate from the `wineStyles.js` data in spec 039). Return top 3 unique candidates.

### Empty state
User has no rated wines: the Map tab shows:
```
[Globe icon]
Your wine world starts here.
Rate wines you've tried to start building your map.

[Rate a wine I tried →]
```

## Edge Cases
- Wine has a region string not in the normalization map: display as-is in "Other / Unknown" group.
- Multiple wines from the same region with mixed star ratings: show the average.
- User has explored the same region from multiple scans but only rated 1 wine there: count reflects rated wines, not scan count.
- A suggested neighbor has no entry in wineStyles.js (spec 039 not yet shipped): render the suggestion without the "Fits your palate" context.

## Acceptance Criteria
- A user who has rated 3 Burgundy wines sees a Burgundy chip in the Old World — France group, color-coded by their average star rating.
- A user who loves low-tannin, high-acidity wines sees Beaujolais or Loire suggested as unexplored neighbors, not Barolo.
- The Map tab shows zero groups or neighbor suggestions for a user with no ratings — only the empty state.
- Chips with wine counts accurately reflect the number of that region's wines in the user's rating history.
- "Explore →" on a neighbor card navigates to ExploreScreen (if the style exists) or Wine-Searcher.

## Files
- `src/core/data/regionNormalization.js` — raw region string → canonical region name map
- `src/core/data/regionAdjacency.js` — canonical region → stylistically adjacent regions
- `src/ui/hooks/useWineWorldMap.js` — fetch + group + suggest logic
- `src/ui/screens/ProfileScreen.jsx` — add Map tab + MapView component
