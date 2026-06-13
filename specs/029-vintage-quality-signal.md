# Spec 029 — Vintage Quality Signal

## Problem
The same wine in two different vintages scores identically. A 2015 Napa Cabernet (exceptional drought vintage) and a 2011 of the same wine (a difficult year) receive the same match and quality scores. Vintage quality is a real signal that serious wine buyers care about, and the app currently ignores it entirely.

## Goals
- Apply a small score adjustment based on vintage quality for the wine's region and year.
- Source vintage quality from a static lookup table maintained in the codebase (not a live API — too slow and quota-constrained for scan-time use).
- Keep the signal small — vintage quality is a modifier, not the dominant factor.

## Non-Goals
- Real-time vintage weather data.
- Per-producer vintage variation (e.g., a specific winery that outperformed its region in a bad year).
- Coverage for every wine region on earth — focus on the 10 most common regions in the catalog.

## Behavior

### Vintage quality table
A static data file at `src/core/data/vintageQuality.js`:

```js
// Map of { region → { year → quality } }
// quality: -1 = difficult/weak, 0 = normal, +1 = exceptional
export const VINTAGE_QUALITY = {
  'Napa Valley': {
    2012: 1, 2013: 1, 2015: 1, 2016: 1, 2019: 1,
    2011: -1, 2017: -1, 2018: 0,
  },
  'Bordeaux': {
    2009: 1, 2010: 1, 2015: 1, 2016: 1, 2018: 1,
    2013: -1, 2017: -1,
  },
  'Burgundy': {
    2010: 1, 2012: 1, 2015: 1, 2019: 1,
    2013: -1, 2016: -1,
  },
  'Tuscany': {
    2010: 1, 2012: 1, 2015: 1, 2016: 1,
    2014: -1, 2018: -1,
  },
  'Champagne': {
    2012: 1, 2013: 1, 2015: 1,
    2011: -1, 2017: -1,
  },
  'Rioja': {
    2010: 1, 2011: 1, 2016: 1,
    2013: -1,
  },
  'Barossa Valley': {
    2010: 1, 2012: 1, 2016: 1,
    2011: -1,
  },
  'Willamette Valley': {
    2012: 1, 2014: 1, 2016: 1, 2018: 1,
    2011: -1, 2017: -1,
  },
  'Sonoma Coast': {
    2012: 1, 2013: 1, 2016: 1,
    2011: -1,
  },
  'Paso Robles': {
    2013: 1, 2015: 1, 2018: 1,
    2011: -1,
  },
}
```

### Score adjustment
```js
function vintageAdjustment(wine) {
  if (!wine.vintage || !wine.region) return 0
  const year = parseInt(wine.vintage, 10)
  if (isNaN(year)) return 0
  // Normalize region to a key (partial match — "Napa Valley, California" → "Napa Valley")
  const regionKey = Object.keys(VINTAGE_QUALITY).find(k =>
    wine.region.includes(k) || k.includes(wine.region)
  )
  if (!regionKey) return 0
  const quality = VINTAGE_QUALITY[regionKey]?.[year]
  if (quality == null) return 0  // year not in table → no adjustment
  return quality * 4  // -4, 0, or +4 points
}
```

Applied in `computeMatch`, after the varietal aversion penalty, before returning.

### Display
When the vintage adjustment fired (quality ≠ 0), the wine detail screen shows a small vintage badge next to the year:
- `+1` (exceptional): a gold star icon with tooltip "Exceptional vintage for this region"
- `-1` (difficult): a muted down-arrow icon with tooltip "Challenging vintage for this region"

The badge is cosmetic — it does not affect layout or wine card height.

## Edge Cases
- Wine has vintage "NV" (non-vintage): `parseInt` returns NaN → no adjustment. Correct.
- Wine region not in the table (e.g., "Finger Lakes"): `regionKey` is undefined → no adjustment. Correct.
- Wine has vintage year in the table for its region but quality = 0: adjustment is 0 — no badge shown.
- Vintage year outside the table's range for the region: no adjustment. Do not extrapolate.

## Acceptance Criteria
- A 2015 Napa Cabernet scores 4 points higher than a 2011 Napa Cabernet (same wine, same profile).
- A wine from "Finger Lakes" receives no vintage adjustment.
- A wine with vintage "NV" receives no vintage adjustment.
- The exceptional vintage gold-star badge appears on the wine detail screen for a 2015 Napa wine.
- The difficult vintage down-arrow badge appears on the wine detail screen for a 2011 Napa wine.
- A wine from Burgundy 2013 scores 4 points lower than the same wine in Burgundy 2015.

## Files to Create / Change
- `src/core/data/vintageQuality.js` — new file with the quality table.
- `src/core/engine/matchEngine.js` — import and apply `vintageAdjustment` in `computeMatch`.
- Wine detail screen — add vintage badge rendering (identify the correct screen component).
