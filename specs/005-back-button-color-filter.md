# Spec 005 — Back Button Fix + Color Quick Filters

## Problem 1: Back button rescans
When the user hits back from `anonResults` or `personalizedResults`, the history stack contains `scanning`, so `ScanningScreen` remounts with the same file and triggers a fresh scan.

**Fix**: In `UncorkApp.jsx`, modify `goBack()` to skip `scanning` in the history when `scannedWines` is already set. Pop one extra level so the user lands on `scanPrompt` instead.

**Files**: `src/UncorkApp.jsx` — `goBack` callback only.

---

## Problem 2: No quick color filter
Users can only filter by color via the full FilterSheet. Red / White / Rosé / Orange should be one tap.

---

## Changes

### 1. `src/UncorkApp.jsx`
Modify `goBack()`:
```js
const goBack = useCallback(() => {
  setHistory(h => {
    if (h.length === 0) return h
    const prev = h[h.length - 1]
    // Skip scanning screen if results already exist
    if (prev === 'scanning' && scannedWines && h.length >= 2) {
      setDirection('back')
      setScreen(h[h.length - 2])
      return h.slice(0, -2)
    }
    setDirection('back')
    setScreen(prev)
    return h.slice(0, -1)
  })
}, [scannedWines])
```

### 2. `src/core/engine/filterEngine.js`
- Update `colorOf()` to return `'orange'` for wines where `wine.wineStyle` includes `'orange-wine'` (checked before other color detection).
- Add `orange: 'Orange'` to `COLOR_LABELS`.

### 3. Color quick-filter pill row — inline in both results screens

A horizontal row of pill buttons placed between the FilterBar and the SortToggle in both `AnonResultsScreen` and `PersonalizedResultsScreen`. Only pills for colors present in `facets.colors` are shown.

**Fixed display order**: Red · White · Rosé · Orange

**Pill design** (Painted Bunting, color-coded):

| Color | Inactive | Active |
|---|---|---|
| Red | ink200 border, transparent bg | scarlet500 bg, white text |
| White | ink200 border, transparent bg | ink200 bg, ink800 text |
| Rosé | ink200 border, transparent bg | scarlet300 bg, scarlet700 text |
| Orange | ink200 border, transparent bg | ochre400 bg, forest700 text |

**Behavior**:
- Tapping an inactive pill adds that color to `filters.colors` (additive with any existing color filter).
- Tapping an active pill removes it.
- Pills act like toggles — multiple colors can be active at once (e.g. Red + White).
- When all pills are deactivated, `filters.colors` returns to `[]`.

**Visibility**: Only render the row when `facets.colors.length > 0`.
Orange pill only shown when `facets.colors.includes('orange')`.

---

## Acceptance criteria
- [ ] Hitting back from results lands on `scanPrompt`, not `scanning`
- [ ] No new scan fires when returning to the results list
- [ ] Color pills appear in both results screens when wines are present
- [ ] Tapping Red shows only red wines; tapping again deactivates
- [ ] Multiple color pills can be active simultaneously
- [ ] Orange pill only appears when orange wines are in the current list
- [ ] Color pill state clears when "Clear all" is tapped in FilterBar
