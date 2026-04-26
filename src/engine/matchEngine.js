/**
 * Compute match score 0–100 between a wine and a taste profile.
 * Body and tannin are weighted 2×; sweetness and acidity 1×.
 * Loved wines get +30; hated wines get -30.
 * @param {{ id: number, body: number, sweetness: number, tannin: number, acidity: number }} wine
 * @param {{ palate: { body, sweetness, tannin, acidity }, lovedWineIds: number[], hatedWineIds: number[] }} tasteProfile
 * @returns {number} 0–100
 */
export function computeMatch(wine, tasteProfile) {
  if (!tasteProfile || !tasteProfile.palate) return wine.match ?? 50

  const p = tasteProfile.palate
  const dist =
    Math.abs(wine.body      - p.body)      * 2 +
    Math.abs(wine.tannin    - p.tannin)    * 2 +
    Math.abs(wine.sweetness - p.sweetness) * 1 +
    Math.abs(wine.acidity   - p.acidity)   * 1

  const maxDist = 600
  let score = Math.round(100 - (dist / maxDist) * 100)

  if (tasteProfile.lovedWineIds?.includes(wine.id)) {
    score = Math.min(100, score + 30)
  }
  if (tasteProfile.hatedWineIds?.includes(wine.id)) {
    score = Math.max(0, score - 30)
  }

  return Math.max(0, Math.min(100, score))
}
