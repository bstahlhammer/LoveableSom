/**
 * Compute approachability score 1–5 from wine attributes.
 * Lower tannin and higher sweetness = more approachable.
 * @param {{ tannin: number, sweetness: number, body: number, acidity: number }} wine
 * @returns {number} 1–5
 */
export function computeApproachability(wine) {
  const { tannin = 50, sweetness = 30, body = 50 } = wine
  // Raw approachability (higher = more approachable)
  const raw = 100 - (tannin - sweetness * 0.5) * 0.6
  const clamped = Math.max(0, Math.min(100, raw))
  return Math.max(1, Math.min(5, Math.ceil(clamped / 20)))
}
