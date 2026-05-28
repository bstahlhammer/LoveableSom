/**
 * Choose 3 "hero" wine picks from a scan result:
 *   - topPick      : best taste-match (or highest confidence × rating if no profile)
 *   - bestValue    : best price/quality on the list
 *   - crowdPleaser : safest broad-appeal pick
 *
 * Returns an array of { role, wine, reasoning } in canonical order.
 * Skips a role if no candidate is available, and never repeats the same wine
 * across roles unless there are fewer than 3 wines on the list.
 */

import { computeMatch } from './matchEngine.js'

function scoreTopPick(wine, profile) {
  const match = profile ? computeMatch(wine, profile) : (wine.match ?? 50)
  const conf  = typeof wine.confidence === 'number' ? wine.confidence : 70
  const rating = typeof wine.rating === 'number' ? wine.rating : 0
  // Weight: taste match dominates when we have a profile, else lean on rating.
  return profile
    ? match * 0.7 + (rating / 100) * 20 + (conf / 100) * 10
    : (rating || 60) * 0.6 + (conf / 100) * 40
}

function scoreValue(wine) {
  const price = typeof wine.priceNum === 'number' && wine.priceNum > 0 ? wine.priceNum : null
  const rating = typeof wine.rating === 'number' && wine.rating > 0 ? wine.rating : 70
  const valueBoost = wine.isValue ? 25 : 0
  if (price === null) return rating * 0.4 + valueBoost
  // Higher rating per dollar = better value.
  const ratio = rating / Math.max(15, price)
  return ratio * 50 + valueBoost
}

function scoreCrowd(wine) {
  const rating = typeof wine.rating === 'number' ? wine.rating : 0
  const crowdBoost = wine.isCrowd ? 30 : 0
  // Approachable styles score higher; very tannic / very sweet wines score lower.
  const tannin = typeof wine.tannin === 'number' ? wine.tannin : 50
  const sweetness = typeof wine.sweetness === 'number' ? wine.sweetness : 30
  const balance = 100 - Math.abs(50 - tannin) - Math.abs(35 - sweetness) * 0.6
  return rating * 0.5 + crowdBoost + balance * 0.4
}

function describeStyle(wine) {
  const body = typeof wine.body === 'number' ? wine.body : 50
  const tannin = typeof wine.tannin === 'number' ? wine.tannin : 50
  const sweetness = typeof wine.sweetness === 'number' ? wine.sweetness : 30
  const bodyWord = body >= 70 ? 'full-bodied' : body <= 35 ? 'light-bodied' : 'medium-bodied'
  const tanninWord = tannin >= 70 ? 'firm' : tannin <= 30 ? 'soft' : 'balanced'
  const sweetWord = sweetness >= 60 ? 'off-dry' : sweetness <= 20 ? 'dry' : ''
  return [sweetWord, bodyWord, tanninWord && `${tanninWord} tannins`].filter(Boolean).join(', ')
}

function reasoningForTopPick(wine, profile) {
  const style = describeStyle(wine)
  if (wine.rating && wine.ratingLabel) {
    return `${style} · ${wine.rating} pts (${wine.ratingLabel}).`
  }
  return style ? `${style}.` : 'Your highest match on this list.'
}

function reasoningForValue(wine) {
  const price = wine.price && wine.price !== '—' ? (String(wine.price).startsWith('$') ? wine.price : `$${wine.price}`) : null
  const rating = wine.rating ? ` rated ${wine.rating}` : ''
  if (price) {
    return `Strong quality for the price${rating ? ',' + rating : ''} at ${price} — ${describeStyle(wine)}.`
  }
  return `Punches above its price point${rating ? ',' + rating : ''} — ${describeStyle(wine)}.`
}

function reasoningForCrowd(wine) {
  return `Broadly approachable — ${describeStyle(wine)}, the kind most people enjoy.`
}

/**
 * @param {object[]} wines
 * @param {object|null} tasteProfile
 * @returns {{role:'topPick'|'bestValue'|'crowdPleaser', wine:object, reasoning:string}[]}
 */
export function chooseHeroPicks(wines, tasteProfile = null) {
  if (!Array.isArray(wines) || wines.length === 0) return []

  const byTop   = [...wines].sort((a, b) => scoreTopPick(b, tasteProfile) - scoreTopPick(a, tasteProfile))
  const byValue = [...wines].sort((a, b) => scoreValue(b) - scoreValue(a))
  const byCrowd = [...wines].sort((a, b) => scoreCrowd(b) - scoreCrowd(a))

  const used = new Set()
  const pickFirstUnused = (sorted) => {
    for (const w of sorted) {
      const id = w.id ?? w.name
      if (!used.has(id)) { used.add(id); return w }
    }
    return null
  }

  const result = []
  const top = pickFirstUnused(byTop)
  if (top) result.push({ role: 'topPick', wine: top, reasoning: reasoningForTopPick(top, tasteProfile) })

  // For value/crowd, only include if list has more than 1 wine.
  if (wines.length >= 2) {
    const val = pickFirstUnused(byValue)
    if (val) result.push({ role: 'bestValue', wine: val, reasoning: reasoningForValue(val) })
  }
  if (wines.length >= 3) {
    const crowd = pickFirstUnused(byCrowd)
    if (crowd) result.push({ role: 'crowdPleaser', wine: crowd, reasoning: reasoningForCrowd(crowd) })
  }

  return result
}
