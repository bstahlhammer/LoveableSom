import { computeMatch } from './matchEngine.js'
import { computeApproachability } from './approachabilityEngine.js'
import { priceOf } from './filterEngine.js'

function stableKey(w) {
  return String(w.id ?? w._catalogId ?? w.name ?? '')
}

/**
 * Sort wines by the given key. Returns a new array.
 * @param {object[]} wines
 * @param {'match'|'crowd'|'rating'|'value'|'approachability'} sortKey
 * @param {object|null} tasteProfile
 * @returns {object[]}
 */
export function sortWines(wines, sortKey, tasteProfile = null) {
  console.log('[sortEngine] call', sortKey, wines.length, 'wines',
    wines.map(w => `${w.id ?? w.name}=${w.computedMatch ?? '?'}`).join(' | '))

  const enriched = wines.map(w => ({
    ...w,
    computedMatch:          tasteProfile ? computeMatch(w, tasteProfile) : (w.match ?? 50),
    computedApproachability: computeApproachability(w),
  }))

  const sorted = [...enriched]

  switch (sortKey) {
    case 'match':
      sorted.sort((a, b) =>
        (b.computedMatch - a.computedMatch) ||
        stableKey(a).localeCompare(stableKey(b))
      )
      break
    case 'crowd':
      // Rated wines first (by rating desc); unrated by approachability (crowd-pleasing proxy)
      sorted.sort((a, b) => {
        const ar = a.rating ?? null
        const br = b.rating ?? null
        if (ar !== null && br !== null)
          return (br - ar) || stableKey(a).localeCompare(stableKey(b))
        if (ar !== null) return -1
        if (br !== null) return 1
        return (b.computedApproachability - a.computedApproachability) ||
          stableKey(a).localeCompare(stableKey(b))
      })
      break
    case 'rating':
      // Rated wines first (by rating desc); unrated alphabetically so order is clearly distinct
      sorted.sort((a, b) => {
        const ar = a.rating ?? null
        const br = b.rating ?? null
        if (ar !== null && br !== null)
          return (br - ar) || stableKey(a).localeCompare(stableKey(b))
        if (ar !== null) return -1
        if (br !== null) return 1
        return (a.name ?? '').localeCompare(b.name ?? '')
      })
      break
    case 'value':
      // isValue wines first, then priced cheap-to-expensive, then unpriced
      sorted.sort((a, b) => {
        if (a.isValue !== b.isValue) return b.isValue ? 1 : -1
        const ap = priceOf(a)
        const bp = priceOf(b)
        if (ap !== null && bp !== null)
          return (ap - bp) || stableKey(a).localeCompare(stableKey(b))
        if (ap !== null) return -1
        if (bp !== null) return 1
        return stableKey(a).localeCompare(stableKey(b))
      })
      break
    case 'approachability':
      sorted.sort((a, b) =>
        (b.computedApproachability - a.computedApproachability) ||
        stableKey(a).localeCompare(stableKey(b))
      )
      break
    case 'price_asc':
      // Priced wines cheap-to-expensive first; unpriced at the bottom
      sorted.sort((a, b) => {
        const ap = priceOf(a)
        const bp = priceOf(b)
        if (ap !== null && bp !== null)
          return (ap - bp) || stableKey(a).localeCompare(stableKey(b))
        if (ap !== null) return -1
        if (bp !== null) return 1
        return stableKey(a).localeCompare(stableKey(b))
      })
      break
    default:
      sorted.sort((a, b) =>
        (b.computedMatch - a.computedMatch) ||
        stableKey(a).localeCompare(stableKey(b))
      )
  }

  console.log('[sortEngine] result', sortKey, sorted.map(w => `${w.id ?? w.name}(${w.computedMatch ?? '?'})`).join(' > '))
  return sorted
}
