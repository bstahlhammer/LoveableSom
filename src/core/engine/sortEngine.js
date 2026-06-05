import { computeMatch } from './matchEngine.js'
import { computeApproachability } from './approachabilityEngine.js'
import { priceOf } from './filterEngine.js'

/**
 * Sort wines by the given key. Returns a new array.
 * @param {object[]} wines
 * @param {'match'|'crowd'|'rating'|'value'|'approachability'} sortKey
 * @param {object|null} tasteProfile
 * @returns {object[]}
 */
export function sortWines(wines, sortKey, tasteProfile = null) {
  const enriched = wines.map(w => ({
    ...w,
    computedMatch:          tasteProfile ? computeMatch(w, tasteProfile) : (w.match ?? 50),
    computedApproachability: computeApproachability(w),
  }))

  const sorted = [...enriched]

  switch (sortKey) {
    case 'match':
      sorted.sort((a, b) => b.computedMatch - a.computedMatch)
      break
    case 'crowd':
      sorted.sort((a, b) => {
        if (a.isCrowd !== b.isCrowd) return b.isCrowd ? 1 : -1
        return (b.rating ?? b.adjustedMatch ?? b.computedMatch ?? 0) -
               (a.rating ?? a.adjustedMatch ?? a.computedMatch ?? 0)
      })
      break
    case 'rating':
      sorted.sort((a, b) =>
        (b.rating ?? b.adjustedMatch ?? b.computedMatch ?? 0) -
        (a.rating ?? a.adjustedMatch ?? a.computedMatch ?? 0)
      )
      break
    case 'value':
      sorted.sort((a, b) => {
        if (a.isValue !== b.isValue) return b.isValue ? 1 : -1
        return (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity)
      })
      break
    case 'approachability':
      sorted.sort((a, b) => b.computedApproachability - a.computedApproachability)
      break
    case 'price_asc':
      sorted.sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity))
      break
    default:
      sorted.sort((a, b) => b.computedMatch - a.computedMatch)
  }

  return sorted
}
