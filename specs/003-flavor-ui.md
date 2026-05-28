# Spec 003 — Flavor & Natural Wine UI

## Goals

- Surface `flavor_tags`, `wine_style`, and `adventurousness` from the catalog in the UI
- Show natural wine and style badges on wine cards and the detail screen
- Add a "Natural" filter to the catalog/explore browsing flow
- Keep scope tight: data plumbing + badge/tag display only; no new screens

## Non-goals

- Redesigning any screen layout beyond adding the new elements
- Adventurousness slider on results (follow-on)
- Flavor-based recommendation reranking (follow-on)

---

## Changes

### 1. `src/core/api.js`

**All four `.select()` strings** (lookupWineCatalog, searchWineCatalog, getCatalogPage, and the FTS fallback): add `flavor_tags,wine_style,adventurousness` to the column list.

**`_catalogToWine(row)`**: map the three new fields:
```js
flavorTags:     row.flavor_tags    ?? [],
wineStyle:      row.wine_style     ?? ['conventional'],
adventurousness: row.adventurousness ?? 3,
```

**`getCatalogPage`**: add two new optional filter params:
- `natural: true` → `.contains('wine_style', ['natural'])`
- `minAdventurousness: N` → `.gte('adventurousness', N)`

### 2. `src/ui/screens/WineDetailScreen.jsx`

**Flavor tag chips** — the screen already renders `wine.tags` (line 283). Replace that block to also read `wine.flavorTags`. Render flavor tags in the existing chip style, grouped into two rows max. Skip if empty.

**Natural wine / style badges** — new small badge strip in the wine identity section (between the subtitle line and the stats+bottle row). Rules:
- `wineStyle` contains `'natural'` → forest-green badge "Natural"
- `wineStyle` contains `'skin-contact'` or `'orange-wine'` → ochre badge "Skin Contact"
- `wineStyle` contains `'pét-nat'` → cobalt badge "Pét-Nat"
- `wineStyle` contains `'biodynamic'` → forest badge "Biodynamic"
- `wineStyle` contains `'amphora'` → ochre badge "Amphora"
- `adventurousness` >= 7 AND not already showing a style badge → scarlet badge "Adventurous pick"
- All conventional wines: no badge strip rendered (don't show "Conventional")

**Adventurousness dots** — replace the existing 5-dot approachability row with two rows: keep approachability dots, add a second identical row labeled "Adventurousness" using `wine.adventurousness` scaled to 1–5 (divide by 2, round up). Only show the adventurousness row when `adventurousness >= 5`.

### 3. `src/ui/screens/PersonalizedResultsScreen.jsx` and `AnonResultsScreen.jsx`

**Natural badge on WineRowCard** — when `wine.wineStyle` contains `'natural'`, `'skin-contact'`, or `'pét-nat'`, show a small forest-green pill badge ("Natural") next to the wine name. One badge max — pick the most specific style present (`pét-nat` > `skin-contact` > `natural`).

**Natural filter chip** — add a "Natural" quick-filter chip to the FilterBar alongside any existing chips. When active, re-fetches/re-filters results to only show wines where `wineStyle` includes `'natural'` or `'skin-contact'` or `'pét-nat'`. For locally-held scan results (where wines are already in memory): filter client-side. For catalog pages: pass `natural: true` to `getCatalogPage`.

### 4. `src/core/engine/filterEngine.js` (if needed)

If the filter engine processes wine lists client-side, add a `natural` filter option: keeps wines where `wine.wineStyle?.some(s => ['natural','skin-contact','pét-nat','biodynamic'].includes(s))`.

---

## Badge color reference (Painted Bunting tokens)

| Badge | Background | Text |
|-------|-----------|------|
| Natural | `T.forest100` | `T.forest700` |
| Skin Contact | `T.ochre100` | `T.ochre700` |
| Pét-Nat | `T.cobalt100` | `T.cobalt700` |
| Biodynamic | `T.forest100` | `T.forest700` |
| Amphora | `T.ochre100` | `T.ochre700` |
| Adventurous pick | `T.scarlet100` | `T.scarlet600` |

---

## Acceptance Criteria

- [ ] `wine.flavorTags`, `wine.wineStyle`, `wine.adventurousness` are populated on catalog wines throughout the app
- [ ] WineDetailScreen shows flavor chips for any wine that has them (non-empty `flavorTags`)
- [ ] WineDetailScreen shows style badge for natural/skin-contact/pét-nat/biodynamic/amphora wines
- [ ] Conventional wines show no badge
- [ ] Wine cards in PersonalizedResultsScreen and AnonResultsScreen show "Natural" pill for natural-style wines
- [ ] "Natural" filter chip appears and works (filters/re-fetches correctly)
- [ ] No regressions on non-catalog (mock-data) wines — all new fields degrade gracefully to empty arrays / 3
