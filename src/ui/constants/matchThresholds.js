// Shared score-to-color thresholds used in FitBar, ScoreBar, match tags, and card backgrounds.
// Changing these numbers here propagates to all results screens.
export const STRONG = 80   // ≥ STRONG → lime (best fit)
export const GOOD   = 60   // ≥ GOOD   → forest
export const CAUTION = 40  // ≥ CAUTION → ochre; below → scarlet

// Tag thresholds (PersonalizedResults only — guest results show no tags)
export const TOP_PICK_MIN  = 90  // "Top pick"
export const STRETCH_MAX   = 65  // < STRETCH_MAX and ≥ OFF_TASTE_MAX → "Stretch"
export const OFF_TASTE_MAX = 50  // < OFF_TASTE_MAX → "Off-taste"

// Returns the FitBar / ScoreBar tone color for a given score.
export function fitBarTone(score, T) {
  if (score >= STRONG)  return T.lime500
  if (score >= GOOD)    return T.forest500
  if (score >= CAUTION) return T.ochre500
  return T.scarlet500
}

// Returns { label, color } tag or null when no tag applies.
export function getMatchTag(score, T) {
  if (score >= TOP_PICK_MIN)  return { label: 'Top pick', color: T.forest500 }
  if (score < OFF_TASTE_MAX)  return { label: 'Off-taste', color: T.scarlet500 }
  if (score < STRETCH_MAX)    return { label: 'Stretch',   color: T.ochre500 }
  return null
}
