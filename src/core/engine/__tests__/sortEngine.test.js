import { describe, it, expect } from 'vitest'
import { sortWines } from '../sortEngine.js'

const profile = { palate: { body: 60, tannin: 40, sweetness: 20, acidity: 65 } }

function wine(overrides) {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Test Wine',
    body: 50, tannin: 40, sweetness: 30, acidity: 60,
    rating: null, isCrowd: false, isValue: false,
    priceNum: null, price: null, match: null,
    ...overrides,
  }
}

describe('sortWines — match', () => {
  it('sorts best taste-profile match first', () => {
    const close  = wine({ body: 60, tannin: 40, sweetness: 20, acidity: 65, name: 'Close' })
    const far    = wine({ body: 10, tannin: 90, sweetness: 80, acidity: 10, name: 'Far' })
    const result = sortWines([far, close], 'match', profile)
    expect(result[0].name).toBe('Close')
  })
})

describe('sortWines — rating', () => {
  it('puts rated wines before unrated', () => {
    const rated   = wine({ rating: 92, name: 'Rated' })
    const unrated = wine({ rating: null, name: 'Unrated' })
    const result  = sortWines([unrated, rated], 'rating', profile)
    expect(result[0].name).toBe('Rated')
  })

  it('sorts rated wines by score descending', () => {
    const hi = wine({ rating: 95, name: 'Hi' })
    const lo = wine({ rating: 85, name: 'Lo' })
    const result = sortWines([lo, hi], 'rating', profile)
    expect(result[0].name).toBe('Hi')
  })

  it('sorts unrated wines alphabetically, which differs from match-score order', () => {
    // Zebra: body=65 (close to profile.body=60) → high match score
    // Apple: body=10 (far from profile.body=60) → low match score
    // rating sort (alphabetical): Apple, Zebra
    // match sort (palate distance): Zebra, Apple
    const zebra = wine({ body: 65, name: 'Zebra' })
    const apple = wine({ body: 10, name: 'Apple' })
    const rating = sortWines([apple, zebra], 'rating', profile)
    const match  = sortWines([apple, zebra], 'match',  profile)
    expect(rating[0].name).toBe('Apple')  // alphabetical first
    expect(match[0].name).toBe('Zebra')   // best palate match first
    expect(rating.map(w => w.name)).not.toEqual(match.map(w => w.name))
  })

  it('returns new array, does not mutate input', () => {
    const input = [wine({ name: 'A' }), wine({ name: 'B' })]
    const result = sortWines(input, 'rating', null)
    expect(result).not.toBe(input)
  })
})

describe('sortWines — crowd', () => {
  it('puts rated wines before unrated (same as rating)', () => {
    const rated   = wine({ rating: 90, name: 'Rated' })
    const unrated = wine({ rating: null, name: 'Unrated' })
    const result  = sortWines([unrated, rated], 'crowd', null)
    expect(result[0].name).toBe('Rated')
  })

  it('crowd and rating sorts produce DIFFERENT order for unrated wines', () => {
    // For unrated wines: crowd uses approachability, rating uses alphabetical
    // With identical palate axes, approachability tiebreaker != alphabetical tiebreaker
    const high_app = wine({ body: 20, tannin: 10, sweetness: 40, acidity: 40, name: 'Zebra' })
    const low_app  = wine({ body: 80, tannin: 85, sweetness: 5,  acidity: 70, name: 'Apple' })
    const crowd  = sortWines([low_app, high_app], 'crowd',  null)
    const rating = sortWines([low_app, high_app], 'rating', null)
    // crowd puts high-approachability first; rating puts alphabetical first
    expect(crowd[0].name).toBe('Zebra')   // high approachability
    expect(rating[0].name).toBe('Apple')  // alphabetical
  })
})

describe('sortWines — price_asc', () => {
  it('sorts priced wines cheapest first', () => {
    const cheap     = wine({ priceNum: 10, name: 'Cheap' })
    const expensive = wine({ priceNum: 50, name: 'Expensive' })
    const result    = sortWines([expensive, cheap], 'price_asc', null)
    expect(result[0].name).toBe('Cheap')
  })

  it('puts priced wines before unpriced', () => {
    const priced   = wine({ priceNum: 25, name: 'Priced' })
    const unpriced = wine({ priceNum: null, name: 'Unpriced' })
    const result   = sortWines([unpriced, priced], 'price_asc', null)
    expect(result[0].name).toBe('Priced')
  })

  it('price_asc and match produce DIFFERENT order', () => {
    const match_a = wine({ body: 60, tannin: 40, priceNum: 99, name: 'Expensive' })
    const match_b = wine({ body: 10, tannin: 90, priceNum: 5,  name: 'Cheap' })
    const byPrice = sortWines([match_a, match_b], 'price_asc', profile)
    const byMatch = sortWines([match_a, match_b], 'match',     profile)
    expect(byPrice[0].name).toBe('Cheap')
    expect(byMatch[0].name).toBe('Expensive')
  })
})

describe('sortWines — value', () => {
  it('puts isValue wines before non-isValue', () => {
    const val    = wine({ isValue: true, priceNum: 20, name: 'Value' })
    const nonval = wine({ isValue: false, priceNum: 10, name: 'NonValue' })
    const result = sortWines([nonval, val], 'value', null)
    expect(result[0].name).toBe('Value')
  })

  it('among non-isValue wines, sorts priced before unpriced', () => {
    const priced   = wine({ isValue: false, priceNum: 30, name: 'Priced' })
    const unpriced = wine({ isValue: false, priceNum: null, name: 'Unpriced' })
    const result   = sortWines([unpriced, priced], 'value', null)
    expect(result[0].name).toBe('Priced')
  })
})

describe('sortWines — all modes are distinct for mixed data', () => {
  it('five sort modes produce at least 3 different orderings on the same wine list', () => {
    const wines = [
      wine({ body: 60, tannin: 40, rating: 95, priceNum: 50, name: 'A-top-rated' }),
      wine({ body: 10, tannin: 90, rating: 82, priceNum: 8,  name: 'B-cheap' }),
      wine({ body: 55, tannin: 38, rating: null, priceNum: 20, name: 'C-unrated' }),
    ]
    const modes = ['match', 'rating', 'crowd', 'price_asc', 'value']
    const orders = modes.map(m => sortWines(wines, m, profile).map(w => w.name).join(','))
    const unique = new Set(orders)
    expect(unique.size).toBeGreaterThanOrEqual(3)
  })
})

// ─── Block wine regression: all same price, same approachability, no rating ───
// These wines tie on every primary criterion. The tiebreaker must ensure that
// different sort types produce DIFFERENT visual orderings so the user can see
// the sort buttons are actually doing something.
describe('sortWines — identical-data tiebreakers (Block wine scenario)', () => {
  // All three wines: $12.99, no catalog rating, no flavor data (defaults to approachability 4/5)
  const cabSauv    = wine({ name: 'Block Red Wine Cabernet Sauvignon', priceNum: 12.99, rating: null })
  const chardonnay = wine({ name: 'Block White Wine Chardonnay',       priceNum: 12.99, rating: null })
  const sauvBlanc  = wine({ name: 'Block White Wine Sauvignon Blanc',  priceNum: 12.99, rating: null })
  const blockWines = [cabSauv, chardonnay, sauvBlanc]

  it('crowd sort (A→Z tiebreaker) puts Cabernet Sauvignon before Sauvignon Blanc', () => {
    const result = sortWines(blockWines, 'crowd', null)
    const names = result.map(w => w.name)
    expect(names.indexOf('Block Red Wine Cabernet Sauvignon'))
      .toBeLessThan(names.indexOf('Block White Wine Sauvignon Blanc'))
  })

  it('match sort (Z→A tiebreaker) puts Sauvignon Blanc before Cabernet Sauvignon', () => {
    const result = sortWines(blockWines, 'match', null)
    const names = result.map(w => w.name)
    expect(names.indexOf('Block White Wine Sauvignon Blanc'))
      .toBeLessThan(names.indexOf('Block Red Wine Cabernet Sauvignon'))
  })

  it('crowd and match sorts produce OPPOSITE orders for these wines', () => {
    const crowd = sortWines(blockWines, 'crowd', null).map(w => w.name)
    const match = sortWines(blockWines, 'match', null).map(w => w.name)
    expect(crowd).not.toEqual(match)
    // crowd is A→Z, match is Z→A — first and last must be swapped
    expect(crowd[0]).toBe(match[match.length - 1])
    expect(crowd[crowd.length - 1]).toBe(match[0])
  })

  it('price_asc and crowd sorts produce DIFFERENT orders', () => {
    const byPrice = sortWines(blockWines, 'price_asc', null).map(w => w.name)
    const byCrowd = sortWines(blockWines, 'crowd',     null).map(w => w.name)
    expect(byPrice).not.toEqual(byCrowd)
  })
})
