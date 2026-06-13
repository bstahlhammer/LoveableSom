# Spec 028 — Match Score Certainty Visualization

## Problem
The match score (e.g., "87% match") is displayed as a single number with a filled bar. A score of 87 could mean:
- "This wine aligns strongly with your well-established palate and is highly rated" (high certainty — the number is reliable)
- "This wine roughly aligns with a partial profile inferred from 2 ratings, and we don't have quality data" (low certainty — the number is a guess)

The user cannot distinguish these cases. They may act on a high score that is in fact unreliable, or dismiss a lower score that is actually trustworthy.

## Goals
- Communicate score certainty visually without adding text clutter.
- A user should be able to scan the results list and immediately distinguish "confident match" from "best guess."
- The match score number itself is still shown — certainty affects presentation, not the score value.

## Non-Goals
- Changing the score calculation.
- Adding a certainty tooltip that blocks interaction.
- Applying certainty visualization to "Crowd Pleaser" or other sort modes — only "My Taste" match scores.

## Behavior

### Three certainty tiers (derived from existing `computeMatchWithConfidence` output)

| Tier | Condition | Visual treatment |
|---|---|---|
| **Confident** | `confidence >= 0.85` AND `flags` has neither `'profile'` nor `'quality'` | Solid filled bar — same as today |
| **Estimated** | `confidence` 0.65–0.85, OR only one of `'profile'`/`'quality'` in flags | Bar filled to score but with 40% opacity + a subtle dashed outline |
| **Limited** | `confidence < 0.65` OR both `'profile'` and `'quality'` in flags | Bar filled to score at 25% opacity; score number shown in muted color; small "?" icon to the right of the score |

### Tooltip on "?" icon (Limited tier only)
Tapping the "?" icon shows a compact inline tooltip (not a modal):
> "Score is based on limited data — [reason text from `computeMatchWithConfidence`]"

Example: "Score is based on limited data — limited profile & mixed ratings."

Tooltip dismisses on tap-outside or after 4 seconds.

### "My Taste" sort only
The certainty visual only appears when `sortKey === 'match'`. In other sort modes, the match score (if shown) renders as today with a solid bar.

### Accessibility
- The "?" icon has `aria-label="Limited confidence — tap for details"`.
- The opacity differences are supplemented by the "?" icon — certainty is not communicated by color/opacity alone.

## Edge Cases
- Wine has `computedMatch === null` (no palate data): use the "No taste data" treatment from Spec 025, not the certainty tiers. Certainty tiers only apply to wines with a numeric score.
- `confidence` is null (returned when rawScore is null): same as above — no score, no certainty bar.
- Wine is in the "Estimated" tier but has a very high score (e.g., 91): the dashed outline still applies. The score is high but estimated — the user should know.
- Animated transition when switching sort modes: bar transitions back to solid when leaving "My Taste" sort.

## Acceptance Criteria
- A wine with `confidence >= 0.85` and no profile/quality flags shows a solid filled bar (no visual change from today).
- A wine with `confidence = 0.75` and only `'profile'` in flags shows a partially opaque bar with dashed outline.
- A wine with `confidence = 0.55` and both `'profile'` and `'quality'` flags shows a muted bar + "?" icon.
- Tapping "?" shows the tooltip with the reason text; tapping elsewhere dismisses it.
- Switching to "Crowd Pleaser" sort: no certainty styling on any bars.
- Switching back to "My Taste": certainty styling re-applies.

## Files to Change
- `src/ui/screens/PersonalizedResultsScreen.jsx` — pass certainty tier to the wine card component.
- The wine card component (identify the correct component) — add tier-based styling to the match bar; add "?" icon and tooltip for Limited tier.
