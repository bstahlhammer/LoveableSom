/**
 * Compute approachability score 1–5 from wine attributes.
 * Lower tannin and higher sweetness = more approachable.
 * @param {{ tannin: number, sweetness: number, body: number, acidity: number }} wine
 * @returns {number} 1–5
 */
export function computeApproachability(wine) {
  // Wines with no palate data get a neutral score so they don't float to
  // the top of crowd/approachability sorts due to null → 0 coercion.
  if (wine.tannin == null && wine.sweetness == null && wine.body == null) return 3
  const tannin    = wine.tannin    ?? 50
  const sweetness = wine.sweetness ?? 30
  // Raw approachability (higher = more approachable)
  const raw = 100 - (tannin - sweetness * 0.5) * 0.6
  const clamped = Math.max(0, Math.min(100, raw))
  return Math.max(1, Math.min(5, Math.ceil(clamped / 20)))
}
