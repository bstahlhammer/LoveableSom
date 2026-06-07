import { describe, it, expect } from 'vitest'
import { chooseHeroPicks } from '../heroPicksEngine.js'

const makeWine = (id, overrides = {}) => ({
  id,
  name: `Wine ${id}`,
  body: 60,
  tannin: 50,
  sweetness: 25,
  acidity: 55,
  rating: 88,
  priceNum: 20,
  price: '$20',
  isValue: false,
  isCrowd: false,
  confidence: 75,
  ...overrides,
})

const PROFILE = { palate: { body: 60, tannin: 50, sweetness: 25, acidity: 55 } }

describe('chooseHeroPicks', () => {
  it('returns empty array for empty wine list', () => {
    expect(chooseHeroPicks([], PROFILE)).toEqual([])
  })

  it('returns 1 pick for single wine', () => {
    const picks = chooseHeroPicks([makeWine(1)], PROFILE)
    expect(picks).toHaveLength(1)
    expect(picks[0].role).toBe('topPick')
  })

  it('returns 2 picks for 2 wines', () => {
    const picks = chooseHeroPicks([makeWine(1), makeWine(2)], PROFILE)
    expect(picks).toHaveLength(2)
  })

  it('returns 3 picks (topPick, bestValue, crowdPleaser) for 3+ wines', () => {
    const wines = [makeWine(1), makeWine(2), makeWine(3)]
    const picks = chooseHeroPicks(wines, PROFILE)
    expect(picks).toHaveLength(3)
    const roles = picks.map(p => p.role)
    expect(roles).toContain('topPick')
    expect(roles).toContain('bestValue')
    expect(roles).toContain('crowdPleaser')
  })

  it('never repeats the same wine across roles', () => {
    const wines = [makeWine(1), makeWine(2), makeWine(3), makeWine(4)]
    const picks = chooseHeroPicks(wines, PROFILE)
    const wineIds = picks.map(p => p.wine.id)
    const unique = new Set(wineIds)
    expect(unique.size).toBe(wineIds.length)
  })

  it('each pick has a non-empty reasoning string', () => {
    const wines = [makeWine(1), makeWine(2), makeWine(3)]
    const picks = chooseHeroPicks(wines, PROFILE)
    for (const pick of picks) {
      expect(typeof pick.reasoning).toBe('string')
      expect(pick.reasoning.length).toBeGreaterThan(0)
    }
  })

  it('works without a taste profile (no profile fallback)', () => {
    const wines = [makeWine(1), makeWine(2), makeWine(3)]
    expect(() => chooseHeroPicks(wines, null)).not.toThrow()
    expect(chooseHeroPicks(wines, null)).toHaveLength(3)
  })

  it('bestValue pick has a lower price-to-rating ratio than the others', () => {
    const wines = [
      makeWine(1, { rating: 88, priceNum: 60, price: '$60', confidence: 75 }),
      makeWine(2, { rating: 80, priceNum: 12, price: '$12', isValue: true, confidence: 50 }),
      makeWine(3, { rating: 85, priceNum: 50, price: '$50', confidence: 60 }),
    ]
    const picks = chooseHeroPicks(wines, null)
    const valuePick = picks.find(p => p.role === 'bestValue')
    // Wine 2 has the best rating/price ratio (80/12 ≈ 6.7) and isValue boost
    expect(valuePick?.wine.id).toBe(2)
  })
})
