# Spec 022 — Confidence Gating for Unconfirmed Wines

## Problem
The vision model returns a `confidence` integer (0–100) for each scanned wine. Currently any wine with confidence ≥ 40 is passed to the AI enrichment pass and can appear in results. A wine with confidence 42 and no catalog match surfaces in the list with no structural data — it may be a hallucination, a partial label read, or a real wine the catalog doesn't know. The user has no way to distinguish this from a confirmed wine.

The existing truncation filter (`wines.filter(w => !w.truncated || w._catalogId)`) catches edge fragments but not low-confidence non-fragments.

## Goals
- Suppress wines that are both low-confidence AND unconfirmed by the catalog.
- Surface suppressed wines to the user as a count ("2 uncertain results hidden") with an option to show them.
- Do not suppress any wine that the catalog confirmed (has `_catalogId`), regardless of confidence.

## Non-Goals
- Changing how the model reports confidence.
- Changing the AI enrichment eligibility threshold (currently confidence ≥ 40).
- Persisting hidden/shown state across scans.

## Behavior

### Suppression rule
After the AI enrichment pass and second dedup pass in `useScan.js`, split the wine list into:

- **Confirmed** — `wine._catalogId` is set, OR `wine.confidence >= 60`
- **Uncertain** — no `_catalogId` AND `confidence < 60`

Return both groups from `scanImage`:
```js
return {
  wines,          // confirmed only — passed to results screens as today
  uncertain,      // suppressed — new field, may be empty array
  readability, retakeReasons, message, scanType, photoBase64
}
```

### UI: suppressed count banner
On both `PersonalizedResultsScreen` and `AnonResultsScreen`, if `uncertain.length > 0`, show a muted banner below the main list:

> **2 low-confidence results hidden** — [Show anyway]

Tapping "Show anyway" appends the uncertain wines to the displayed list, tagged with a "Uncertain read" pill (same visual weight as existing confidence flags). No re-scoring occurs.

### Threshold constant
Define `CONFIDENCE_SUPPRESS_THRESHOLD = 60` as a named constant in `useScan.js` so it can be tuned easily.

## Edge Cases
- All wines are uncertain (very blurry scan): return `wines: []`, `uncertain: [all wines]`. The zero-results error path still fires ("I could not identify any wines") because `wines` is empty — do not suppress the error.
  - **Correction**: If `wines` is empty but `uncertain` is non-empty, do not throw. Return the result with an empty `wines` array and populated `uncertain`. Let the UI handle the empty state with the "Show anyway" path.
- Single-wine scan, confidence 55, no catalog match: wine moves to `uncertain`. If user taps "Show anyway," they see it.
- Wine has `_catalogId` but confidence 30 (can happen if OCR was partial but catalog FTS still matched): keep in `wines` — catalog confirmation trumps confidence.

## Acceptance Criteria
- A wine with `confidence: 42` and no `_catalogId` does not appear in the main results list.
- A wine with `confidence: 42` and a valid `_catalogId` does appear in the main results list.
- A wine with `confidence: 62` and no `_catalogId` appears in the main results list.
- When uncertain wines exist, the banner "N low-confidence results hidden" is visible.
- Tapping "Show anyway" shows all uncertain wines appended to the list with an "Uncertain read" pill.
- The "Uncertain read" pill does not affect match scoring or sort order.

## Files to Change
- `src/ui/hooks/useScan.js` — split into `wines`/`uncertain` after second dedup pass; export both.
- `src/ui/screens/PersonalizedResultsScreen.jsx` — consume `uncertain` prop; render suppressed count banner.
- `src/ui/screens/AnonResultsScreen.jsx` — same.
- Calling code in `UncorkApp.jsx` that passes scan results to the screens.
