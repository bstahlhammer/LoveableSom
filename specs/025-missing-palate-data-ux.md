# Spec 025 — Expose Wines with Missing Palate Data

## Problem
`computeMatch` returns `null` when a wine has no structural data (`body`, `tannin`, `sweetness`, `acidity` all null). These wines silently rank last in "My Taste" sort because `null` compares as less than any number. The user never knows they were suppressed — real wines they might love disappear from consideration without explanation.

## Goals
- Make the no-data tier visible and navigable.
- Preserve the ranked list integrity (scored wines above unscored wines).
- Give the user enough information to decide whether to investigate a no-data wine themselves.

## Non-Goals
- Fetching missing palate data on-the-fly (that is the AI enrichment pass in useScan.js, already implemented).
- Changing the match scoring algorithm.
- Showing no-data wines above scored wines.

## Behavior

### Sort behavior (no change)
Wines where `computedMatch === null` continue to sort after all scored wines in "My Taste" mode. No change to `sortEngine.js`.

### Visual tier separator
In `PersonalizedResultsScreen`, when "My Taste" sort is active and at least one wine has `computedMatch === null`, render a section divider after the last scored wine:

> **No taste data available**
> We couldn't find tasting profiles for these wines. They may still be great picks.

Below the divider, render the no-data wines in their existing order (scan index / stable key).

### Wine card treatment
No-data wines in this tier show:
- Name, winery, vintage, price — as normal.
- Match bar: replaced by a muted "— No taste data" label in the match score position.
- All other card content (image, critic score, crowd score, pairings) renders normally.

### Other sort modes
In "Crowd Pleaser," "Rating," "Price," and "Value" modes, no-data wines sort and display identically to today — no tier separator, no special treatment. The separator only appears in "My Taste" mode where the null is meaningful.

### Empty state
If ALL scanned wines have null match (no taste data for any of them), do not show the separator — just show all wines normally. The separator only appears when there is at least one scored wine to separate from.

## Edge Cases
- User switches from "My Taste" to "Crowd Pleaser" and back: separator appears/disappears correctly on each toggle.
- No-data wine also has `isCrowd = true`: crowd badge still shows; only the match bar is replaced.
- One wine has `computedMatch = 0` (a real score): it appears above the separator; wines with `null` appear below. A score of 0 is distinct from null.

## Acceptance Criteria
- In "My Taste" sort, a wine with no body/tannin/sweetness/acidity data appears below a visible divider labeled "No taste data available."
- Wines above the divider are sorted by match score (highest first).
- Switching to "Crowd Pleaser" sort removes the divider; all wines appear in approachability order.
- A wine card in the no-data tier shows "— No taste data" where the match bar would be.
- If every wine on the list has null match, no divider is shown.

## Files to Change
- `src/ui/screens/PersonalizedResultsScreen.jsx` — add tier separator in the render of `sortedWines`; add "No taste data" card variant.
