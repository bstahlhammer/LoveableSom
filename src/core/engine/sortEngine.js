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
      // Z→A tiebreaker — opposite of 'crowd' so equal wines visibly flip between these two sorts
      sorted.sort((a, b) =>
        (b.computedMatch - a.computedMatch) ||
        (b.computedApproachability - a.computedApproachability) ||
        ((b.rating ?? -1) - (a.rating ?? -1)) ||
        (b.name ?? '').localeCompare(a.name ?? '')
      )
      break
    case 'crowd':
      // A→Z tiebreaker — opposite of 'match' so equal wines visibly flip between these two sorts
      sorted.sort((a, b) =>
        (b.computedApproachability - a.computedApproachability) ||
        ((b.rating ?? -1) - (a.rating ?? -1)) ||
        (a.name ?? '').localeCompare(b.name ?? '')
      )
      break
    case 'rating':
      // A→Z tiebreaker on all paths — rated wines ranked by score, unrated alphabetically
      sorted.sort((a, b) => {
        const ar = a.rating ?? null
        const br = b.rating ?? null
        if (ar !== null && br !== null)
          return (br - ar) || (b.computedApproachability - a.computedApproachability) || (a.name ?? '').localeCompare(b.name ?? '')
        if (ar !== null) return -1
        if (br !== null) return 1
        return (a.name ?? '').localeCompare(b.name ?? '')
      })
      break
    case 'value':
      // Z→A tiebreaker — isValue first, then cheap, then rated, then Z→A name
      sorted.sort((a, b) => {
        const av = !!a.isValue; const bv = !!b.isValue
        if (av !== bv) return bv ? 1 : -1
        const ap = priceOf(a)
        const bp = priceOf(b)
        if (ap !== null && bp !== null)
          return (ap - bp) || ((b.rating ?? -1) - (a.rating ?? -1)) || (b.name ?? '').localeCompare(a.name ?? '')
        if (ap !== null) return -1
        if (bp !== null) return 1
        return ((b.rating ?? -1) - (a.rating ?? -1)) || (b.name ?? '').localeCompare(a.name ?? '')
      })
      break
    case 'approachability':
      sorted.sort((a, b) =>
        (b.computedApproachability - a.computedApproachability) ||
        ((b.rating ?? -1) - (a.rating ?? -1)) ||
        (a.name ?? '').localeCompare(b.name ?? '')
      )
      break
    case 'price_asc':
      // Z→A tiebreaker — priced cheap-to-expensive, then rated, then Z→A name (differs from 'crowd' A→Z)
      sorted.sort((a, b) => {
        const ap = priceOf(a)
        const bp = priceOf(b)
        if (ap !== null && bp !== null)
          return (ap - bp) || ((b.rating ?? -1) - (a.rating ?? -1)) || (b.name ?? '').localeCompare(a.name ?? '')
        if (ap !== null) return -1
        if (bp !== null) return 1
        return ((b.rating ?? -1) - (a.rating ?? -1)) || (b.name ?? '').localeCompare(a.name ?? '')
      })
      break
    default:
      sorted.sort((a, b) =>
        (b.computedMatch - a.computedMatch) ||
        (b.computedApproachability - a.computedApproachability) ||
        (b.name ?? '').localeCompare(a.name ?? '')
      )
  }

  return sorted
}
