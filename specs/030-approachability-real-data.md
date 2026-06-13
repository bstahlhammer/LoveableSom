# Spec 030 — Approachability from Real Crowd Data

## Problem
`computeApproachability` in `approachabilityEngine.js` calculates a 1–5 score purely from tannin and sweetness math:

```js
const raw = 100 - (tannin - sweetness * 0.5) * 0.6
```

This formula is structurally reasonable but has no validation against actual crowd behavior. A wine that mathematically scores "4" on approachability might be universally loved or universally polarizing — the formula doesn't know. The `isCrowd` boolean (set when `critic_score >= 88`) is a proxy for broad appeal but is critic-driven, not consumer-driven.

## Goals
- Add a `crowd_score` field to the catalog that reflects real consumer popularity where data is available.
- Blend `crowd_score` with the computed score when available; fall back to the pure math when not.
- Do not regress on wines that lack crowd data.

## Non-Goals
- Purchasing a third-party popularity dataset.
- Real-time crowd data fetching at scan time.
- Replacing the tannin/sweetness formula entirely — it remains the fallback.

## Behavior

### New catalog field
Add `crowd_score` (integer 0–100, nullable) to `wine_catalog`. This field stores a normalized popularity metric. Initial population strategy:

- **Source 1**: Wine Enthusiast "reader favorite" flag → 85
- **Source 2**: Wines in the top 10 most reviewed on Wine-Searcher (by review count) → 90–95
- **Source 3**: Wines the app's own users have consistently scanned (from analytics, when available) → scale by scan frequency

For now, this field is NULL for most rows. It will be populated incrementally via periodic admin SQL updates — not at scan time.

### Updated `computeApproachability`

```js
export function computeApproachability(wine) {
  if (wine.tannin == null && wine.sweetness == null && wine.body == null) return 3

  // Computed structural score (existing formula)
  const tannin    = wine.tannin    ?? 50
  const sweetness = wine.sweetness ?? 30
  const raw = 100 - (tannin - sweetness * 0.5) * 0.6
  const computed = Math.max(1, Math.min(5, Math.ceil(Math.max(0, Math.min(100, raw)) / 20)))

  // If crowd_score is available, blend it in (70% crowd, 30% computed)
  if (typeof wine.crowdScore === 'number') {
    const crowdNorm = Math.max(1, Math.min(5, Math.ceil(wine.crowdScore / 20)))
    const blended = crowdNorm * 0.7 + computed * 0.3
    return Math.max(1, Math.min(5, Math.round(blended)))
  }

  return computed
}
```

### Mapping `crowd_score` from catalog
In `_catalogToWine` in `api.js`, add:
```js
crowdScore: row.crowd_score ?? null,
```

And select it in all queries that use `wine_catalog`.

### Display
No UI change for this spec — `computeApproachability` returns the same 1–5 scale as today. Crowd sort ("Crowd Pleaser") and the approachability bar benefit automatically.

## Edge Cases
- `crowdScore = 0`: `ceil(0/20) = 0` → clamped to 1. A wine with zero crowd appeal scores 1.
- `crowdScore = 100`: scores 5 — pure crowd darling.
- Wine has `crowdScore` but no tannin/sweetness: `computed` defaults to 3 (neutral fallback from existing guard), then blended with crowd data. Net effect: crowd data dominates (70%) for structurally unknown wines. This is acceptable — crowd signal is more reliable than a neutral placeholder.

## Acceptance Criteria
- A wine with `crowdScore = 90` and `tannin = 70, sweetness = 20` (structurally low approachability, computed ≈ 2) blends to approachability ≥ 4.
- A wine with `crowdScore = null` produces the same score as today (no regression).
- `crowdScore` is included in the Supabase select queries for catalog wines.
- Adding a `crowd_score` value to a catalog row in Supabase immediately changes that wine's sort position in "Crowd Pleaser" on next scan (no code change required).

## SQL
```sql
ALTER TABLE wine_catalog ADD COLUMN IF NOT EXISTS crowd_score integer;
-- Optional example update:
-- UPDATE wine_catalog SET crowd_score = 90 WHERE name ilike '%Meiomi%';
```

## Files to Create / Change
- Supabase SQL (run once): add `crowd_score` column.
- `src/core/api.js` — add `crowd_score` to all `wine_catalog` selects; map `crowdScore` in `_catalogToWine`.
- `src/core/engine/approachabilityEngine.js` — blend `wine.crowdScore` when available.
