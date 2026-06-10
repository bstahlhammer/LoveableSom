# Spec 017 — Scan Screen UX Improvements

## Problem

Four friction points on the scanning screen:
1. When a scan fails, there's no direct path to retry — user must tap the generic "← Back" button and navigate back to the camera
2. A bottle count / unique-wines counter in the header is redundant with info shown below
3. During the "Fetching wine data" enriching phase, wine facts disappear — leaving a less engaging wait
4. The enriching card doesn't clearly communicate how many wines are being looked up

## Goals

1. Add a visible "Scan again" button above the scan photo when a scan cannot identify any wines
2. Remove the bottle count / unique wines counter from the top header row
3. Keep wine facts rotating continuously — including during the enriching phase
4. Change the enriching card body text to explicitly state how many unique wines are being fetched

## Non-Goals

- No changes to any other screen
- No backend changes
- No changes to the enriching card's visual style or animation

## User-Facing Behavior

- **Scan failure**: After the scanner finds zero wines, a forest-green "Scan again" pill appears centered between the header and the photo. Tapping it calls `goBack`.
- **Header**: Top row shows only "Cancel" / "← Back" — the bottle/unique count is gone.
- **Enriching**: The cobalt enriching card and the white wine-fact card stack vertically simultaneously. Facts continue rotating at the normal 5.5 s interval.
- **Enriching text**: Card body reads "Fetching wine data for N unique wine(s)…" instead of "Matching N wine(s) to your taste…"

## Acceptance Criteria

- [ ] "Scan again" button appears when `scanDone && !!file && totalBottles === 0`
- [ ] Tapping "Scan again" navigates back (calls `goBack`)
- [ ] No bottle/unique count rendered in the header row
- [ ] Wine facts card renders during enriching (`!enriching` guard removed)
- [ ] Wine facts continue rotating during enriching (no timer changes needed — `setInterval` already runs until `scanDone`)
- [ ] Enriching card body text shows "Fetching wine data for N unique wine(s)…"
- [ ] Demo mode (no `file` prop) is unaffected — `scanFailed` is false, no "Scan again" button
