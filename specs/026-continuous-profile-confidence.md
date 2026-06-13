# Spec 026 — Continuous Profile Confidence Dampening

## Problem
`computeMatchWithConfidence` in `matchEngine.js` applies confidence penalties using two hard thresholds on `inferenceConfidence`:

- `< 0.4` → multiply conf by 0.65
- `0.4–0.95` → multiply conf by 0.82
- `≥ 0.95` → no penalty

A user who has rated 3 wines (low signal) and one who has rated 9 wines (meaningful signal) both fall in the 0.4–0.95 bucket and receive the same 0.82 penalty. This means every additional rating the user provides between ~0.4 and 0.95 `inferenceConfidence` has zero effect on the score presentation — a false signal to the user that their ratings aren't sharpening the recommendations.

## Goals
- Replace the two threshold buckets with a smooth continuous function.
- More ratings → tighter (less dampened) scores, visibly.
- Keep the behavior at the extremes (very low profile → heavy dampening; near-complete profile → no dampening) consistent with today.
- No change to `inferenceConfidence` computation in `palateInferenceEngine.js`.

## Non-Goals
- Changing how `inferenceConfidence` is calculated.
- Changing the critic rating or price confidence factors (those remain bucketed — they have different semantics).
- Changing the `flags` / `reason` text logic.

## Behavior

### New profile confidence function

Replace the two-step bucket with:

```js
function profileConfidenceFactor(inferenceConfidence) {
  // Smooth S-curve: low confidence → heavy dampening; high → no dampening
  // At 0.0 → factor = 0.60; at 0.5 → factor = 0.80; at 0.95 → factor = 0.97; at 1.0 → 1.0
  const c = Math.max(0, Math.min(1, inferenceConfidence))
  return 0.60 + 0.40 * Math.pow(c, 0.65)
}
```

Calibration targets (to match current behavior at the extremes while smoothing the middle):
- `inferenceConfidence = 0.0` → factor ≈ 0.60 (was 0.65 at < 0.4; pulling slightly lower for truly zero-signal profiles)
- `inferenceConfidence = 0.3` → factor ≈ 0.73
- `inferenceConfidence = 0.6` → factor ≈ 0.84
- `inferenceConfidence = 0.9` → factor ≈ 0.96
- `inferenceConfidence = 1.0` → factor = 1.00

The formula is a one-liner and the exponent (0.65) is a named constant `PROFILE_CONF_EXPONENT` for easy tuning.

### `flags` and `reason` treatment
The `flags.push('profile')` logic currently fires when `profileConf < 0.95`. Keep that threshold for flag/reason purposes — the flag is about communicating uncertainty to the UI, not about the score magnitude. So:
- Scores are now continuously dampened.
- The "limited profile" badge/reason text still appears when `inferenceConfidence < 0.95`.

### Exposed on result
The `computeMatchWithConfidence` return object already exposes `profileConf`. No new fields needed.

## Edge Cases
- `inferenceConfidence` is undefined or null (no taste profile): the existing early-return guard (`if (!tasteProfile || !tasteProfile.palate) return null`) fires before this code is reached — no change.
- `inferenceConfidence = 0.95`: factor ≈ 0.969 — scores are barely dampened, essentially treating the profile as complete. This is correct.
- Scores near 50: dampening toward 50 (`rawScore × conf + 50 × (1 − conf)`) has no effect when rawScore ≈ 50. This is correct behavior — there's nothing to damp.

## Acceptance Criteria
- `profileConfidenceFactor(0.0)` ≈ 0.60 (± 0.02).
- `profileConfidenceFactor(0.5)` ≈ 0.80 (± 0.02).
- `profileConfidenceFactor(1.0)` = 1.00.
- A user who increases their `inferenceConfidence` from 0.4 to 0.6 sees their top match score increase (scores tighten toward the raw score).
- The `profile` flag and "limited profile" reason text still appear for any `inferenceConfidence < 0.95`.
- Existing unit tests for `computeMatchWithConfidence` (if any) are updated to the new curve values.

## Files to Change
- `src/core/engine/matchEngine.js` — replace the two-bucket profile confidence block with `profileConfidenceFactor`; add the named exponent constant.
