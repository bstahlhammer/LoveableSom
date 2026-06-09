import { describe, it, expect } from 'vitest'
import { computeMatch } from '../matchEngine.js'

const BASE_WINE = { id: 1, body: 70, tannin: 65, sweetness: 20, acidity: 55, grape: 'Cabernet Sauvignon' }
const BASE_PROFILE = { palate: { body: 70, tannin: 65, sweetness: 20, acidity: 55 } }

describe('computeMatch', () => {
  it('returns 100 for a perfect match', () => {
    expect(computeMatch(BASE_WINE, BASE_PROFILE)).toBe(100)
  })

  it('returns a lower score when wine diverges from profile', () => {
    const lightWine = { ...BASE_WINE, body: 20, tannin: 10 }
    const score = computeMatch(lightWine, BASE_PROFILE)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(70)
  })

  it('returns null when wine has null axes and no character data', () => {
    const noData = { id: 2, body: null, tannin: null, sweetness: null, acidity: null, grape: 'Unknown' }
    const score = computeMatch(noData, BASE_PROFILE)
    expect(score).toBeNull()
  })

  it('returns null when no profile provided', () => {
    expect(computeMatch(BASE_WINE, null)).toBeNull()
  })

  it('clamps score to 0–100 range', () => {
    const score = computeMatch(BASE_WINE, BASE_PROFILE)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  describe('varietal aversion penalty', () => {
    it('reduces score by ~30 when grape matches avoided varietal', () => {
      const baseScore = computeMatch(BASE_WINE, BASE_PROFILE)
      const profileWithAversion = {
        ...BASE_PROFILE,
        aversions: { varietals: ['Cabernet Sauvignon'] },
      }
      const avertedScore = computeMatch(BASE_WINE, profileWithAversion)
      expect(baseScore - avertedScore).toBeGreaterThanOrEqual(28)
    })

    it('applies penalty case-insensitively', () => {
      const wine = { ...BASE_WINE, grape: 'CABERNET SAUVIGNON' }
      const profileWithAversion = {
        ...BASE_PROFILE,
        aversions: { varietals: ['cabernet sauvignon'] },
      }
      const score = computeMatch(wine, profileWithAversion)
      const baseScore = computeMatch(wine, BASE_PROFILE)
      expect(baseScore - score).toBeGreaterThanOrEqual(28)
    })

    it('applies penalty via substring match (e.g. "Cabernet" matches "Cabernet Franc")', () => {
      const wine = { ...BASE_WINE, grape: 'Cabernet Franc' }
      const profile = { ...BASE_PROFILE, aversions: { varietals: ['Cabernet'] } }
      const baseScore = computeMatch(wine, BASE_PROFILE)
      const avertedScore = computeMatch(wine, profile)
      expect(baseScore - avertedScore).toBeGreaterThanOrEqual(28)
    })

    it('does not penalize when grape does not match aversion', () => {
      const pinotWine = { ...BASE_WINE, grape: 'Pinot Noir' }
      const profile = { ...BASE_PROFILE, aversions: { varietals: ['Cabernet Sauvignon'] } }
      const baseScore = computeMatch(pinotWine, BASE_PROFILE)
      const score = computeMatch(pinotWine, profile)
      expect(score).toBe(baseScore)
    })

    it('does not penalize when aversions array is empty', () => {
      const profile = { ...BASE_PROFILE, aversions: { varietals: [] } }
      expect(computeMatch(BASE_WINE, profile)).toBe(computeMatch(BASE_WINE, BASE_PROFILE))
    })

    it('does not penalize when wine has no grape field', () => {
      const noGrape = { ...BASE_WINE, grape: null }
      const profile = { ...BASE_PROFILE, aversions: { varietals: ['Cabernet Sauvignon'] } }
      const baseScore = computeMatch(noGrape, BASE_PROFILE)
      expect(computeMatch(noGrape, profile)).toBe(baseScore)
    })

    it('score never goes below 0 even with aversion', () => {
      const poorMatch = { id: 3, body: 10, tannin: 10, sweetness: 90, acidity: 10, grape: 'Cabernet Sauvignon' }
      const strictProfile = {
        palate: { body: 90, tannin: 90, sweetness: 10, acidity: 90 },
        aversions: { varietals: ['Cabernet Sauvignon'] },
      }
      expect(computeMatch(poorMatch, strictProfile)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('character axes', () => {
    it('blends character score when profile has character preferences', () => {
      const earthyWine = { ...BASE_WINE, earthiness: 80, funk: 70 }
      const profileNoChar = BASE_PROFILE
      const profileWithChar = { ...BASE_PROFILE, character: { earthiness: 80, funk: 70 } }
      const scoreNoChar = computeMatch(earthyWine, profileNoChar)
      const scoreWithChar = computeMatch(earthyWine, profileWithChar)
      // Both should be valid numbers
      expect(typeof scoreNoChar).toBe('number')
      expect(typeof scoreWithChar).toBe('number')
    })
  })
})
