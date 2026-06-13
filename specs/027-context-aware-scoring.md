# Spec 027 — Context-Aware Score Modifiers

## Problem
`buyingFor` ("myself" / "gift" / "hosting") and `scanIntent.tags` ("splurge", "everyday", "food_pairing", etc.) currently only influence the default `sortKey` selected at the start of a session. Once the user is in the results screen, these context signals are completely ignored by the match algorithm. A wine's match score is identical whether the user is buying for themselves on a Tuesday or choosing a gift for a colleague.

This is a missed opportunity: context dramatically changes what makes a wine a good recommendation.

## Goals
- Apply small, deterministic score modifiers to `computeMatch` output based on session context.
- Modifiers should shift relative ranking, not overwhelm the palate match signal.
- The context is passed in as an optional parameter — no modifier fires when context is absent.
- Modifiers are transparent: they appear in `flags` / `reason` on the confidence result.

## Non-Goals
- Changing `computeMatch` itself (the palate distance calculation).
- Re-engineering the quiz to collect more context.
- Storing context signals in the taste profile.

## Behavior

### New parameter
`computeMatch(wine, tasteProfile, context?)` gains an optional third argument:

```ts
interface ScoringContext {
  buyingFor?: 'myself' | 'gift' | 'hosting' | null
  scanIntentTags?: string[]   // e.g. ['splurge', 'food_pairing']
  mealAppeal?: string | null  // e.g. 'steak', 'seafood', 'cheese'
}
```

### Modifier table

| Context signal | Condition on wine | Score delta |
|---|---|---|
| `buyingFor = 'gift'` | `wine.adventurousness >= 4` (niche/unusual) | −8 |
| `buyingFor = 'gift'` | `wine.isCrowd = true` | +5 |
| `buyingFor = 'hosting'` | `wine.isCrowd = true` | +7 |
| `buyingFor = 'hosting'` | `wine.adventurousness >= 4` | −5 |
| `scanIntentTags includes 'splurge'` | `wine.rating >= 93` | +8 |
| `scanIntentTags includes 'splurge'` | `wine.priceNum < 20` | −6 |
| `scanIntentTags includes 'everyday'` | `wine.priceNum > 40` | −5 |
| `scanIntentTags includes 'food_pairing'` | `wine.pairings` includes `mealAppeal` | +10 |
| `scanIntentTags includes 'food_pairing'` | `wine.pairings` is empty | −4 |

Deltas are additive. Max combined context adjustment: ±20 (clip before adding to score, after other adjustments).

### Where it's applied
In `computeMatch`, after the varietal aversion penalty, before returning. Context modifiers are part of the raw score — they are NOT part of the confidence dampening calculation.

### Transparency in `computeMatchWithConfidence`
When any context modifier fired (delta ≠ 0), add `'context'` to `flags`. Update the `reason` string:
- `flags = ['context']` only → `reason = 'context adjusted'`
- Combined with other flags: append "context adjusted" to the existing reason string.

### Callers
`computeMatch` and `computeMatchWithConfidence` are called in `matchEngine.js`, `sortEngine.js`, and the results screens. The `context` parameter is optional and defaults to null — no existing caller needs to change unless they want context-aware scoring. The results screens pass `buyingFor`, `scanIntent`, and `mealAppeal` as props today; they can forward these as a `context` object.

## Edge Cases
- `mealAppeal` is set but `wine.pairings` is an empty array: the −4 penalty fires. This is intentional — a wine with no pairing data is a worse bet for a food-pairing occasion than one with confirmed pairings.
- Multiple matching context signals: all applicable deltas are summed, then clipped to ±20.
- Context is null: the modifier block is skipped entirely — zero behavioral change for existing calls.
- `wine.adventurousness` is undefined (catalog wines default to 3 in `_catalogToWine`): `>= 4` is false, no modifier fires.

## Acceptance Criteria
- `computeMatch(crowdWine, profile, { buyingFor: 'gift' })` returns a score 5 points higher than `computeMatch(crowdWine, profile)`.
- `computeMatch(nicheSplurge, profile, { buyingFor: 'gift' })` returns a score 8 points lower than without context (adventurousness ≥ 4).
- `computeMatch(wine, profile, null)` returns the same score as `computeMatch(wine, profile)`.
- When a context modifier fires, `computeMatchWithConfidence` includes `'context'` in `flags`.
- The total context adjustment never exceeds ±20 points (even when multiple signals stack).

## Files to Change
- `src/core/engine/matchEngine.js` — add `context` parameter to `computeMatch`; add modifier table and application logic.
- `src/ui/screens/PersonalizedResultsScreen.jsx` — pass `{ buyingFor, scanIntentTags: scanIntent?.tags, mealAppeal }` as `context` when calling score functions.
- `src/ui/screens/AnonResultsScreen.jsx` — same.
