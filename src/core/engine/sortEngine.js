import { computeMatch } from './matchEngine.js'
import { computeApproachability } from './approachabilityEngine.js'
import { priceOf } from './filterEngine.js'

// Returns a unique sort key per wine. _scanIdx (a stable integer from useScan) is preferred;
// fallback to string for mock/catalog wines that don't go through the scan pipeline.
function stableKey(w) {
  if (typeof w._scanIdx === 'number') return w._scanIdx
  return String(w.id ?? w._catalogId ?? w.name ?? '')
}

function stableKeyCompare(a, b) {
  const ak = stableKey(a)
  const bk = stableKey(b)
  if (typeof ak === 'number' && typeof bk === 'number') return ak - bk
  return String(ak).localeCompare(String(bk))
}

/**
 * Sort wines by the given key. Returns a new array.
 * @param {object[]} wines
 * @param {'match'|'crowd'|'rating'|'value'|'approachability'|'price_asc'} sortKey
 * @param {object|null} tasteProfile
 * @returns {object[]}
 */
export function sortWines(wines, sortKey, tasteProfile = null) {
  const enriched = wines.map(w => ({
    ...w,
    // Use pre-computed match from scoredWines when available; fall back to a fresh calculation.
    computedMatch: typeof w.computedMatch === 'number'
      ? w.computedMatch
      : (tasteProfile ? computeMatch(w, tasteProfile) : (w.match ?? 50)),
    computedApproachability: computeApproachability(w),
  }))

  const sorted = [...enriched]

  switch (sortKey) {
    case 'match':
      sorted.sort((a, b) =>
        (b.computedMatch - a.computedMatch) ||
        stableKeyCompare(a, b)
      )
      break
    case 'crowd':
      // Rated wines first (by rating desc); unrated by approachability (crowd-pleasing proxy)
      sorted.sort((a, b) => {
        const ar = a.rating ?? null
        const br = b.rating ?? null
        if (ar !== null && br !== null)
          return (br - ar) || stableKeyCompare(a, b)
        if (ar !== null) return -1
        if (br !== null) return 1
        return (b.computedApproachability - a.computedApproachability) ||
          stableKeyCompare(a, b)
      })
      break
    case 'rating':
      // Rated wines first (by rating desc); unrated alphabetically so order is clearly distinct
      sorted.sort((a, b) => {
        const ar = a.rating ?? null
        const br = b.rating ?? null
        if (ar !== null && br !== null)
          return (br - ar) || stableKeyCompare(a, b)
        if (ar !== null) return -1
        if (br !== null) return 1
        return (a.name ?? '').localeCompare(b.name ?? '') || stableKeyCompare(a, b)
      })
      break
    case 'value':
      // isValue wines first, then priced cheap-to-expensive, then unpriced
      sorted.sort((a, b) => {
        // Normalize to boolean so undefined !== false doesn't produce a non-transitive comparator
        const av = !!a.isValue; const bv = !!b.isValue
        if (av !== bv) return bv ? 1 : -1
        const ap = priceOf(a)
        const bp = priceOf(b)
        if (ap !== null && bp !== null)
          return (ap - bp) || stableKeyCompare(a, b)
        if (ap !== null) return -1
        if (bp !== null) return 1
        return stableKeyCompare(a, b)
      })
      break
    case 'approachability':
      sorted.sort((a, b) =>
        (b.computedApproachability - a.computedApproachability) ||
        stableKeyCompare(a, b)
      )
      break
    case 'price_asc':
      // Priced wines cheap-to-expensive first; unpriced at the bottom
      sorted.sort((a, b) => {
        const ap = priceOf(a)
        const bp = priceOf(b)
        if (ap !== null && bp !== null)
          return (ap - bp) || stableKeyCompare(a, b)
        if (ap !== null) return -1
        if (bp !== null) return 1
        return stableKeyCompare(a, b)
      })
      break
    default:
      sorted.sort((a, b) =>
        (b.computedMatch - a.computedMatch) ||
        stableKeyCompare(a, b)
      )
  }

  return sorted
}
