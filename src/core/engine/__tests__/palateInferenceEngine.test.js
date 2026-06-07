import { describe, it, expect } from 'vitest'
import { inferPalateFromRatings } from '../palateInferenceEngine.js'

// These wines don't exist in the local wineById map, so we pass them as externalWineData
const EARTHY_RED = { id: 'ext_1', body: 80, tannin: 75, sweetness: 15, acidity: 60, earthiness: 85, funk: 70, mineral: 40, oak: 30, floral: 10, color: 'red' }
const FRUITY_RED = { id: 'ext_2', body: 65, tannin: 45, sweetness: 40, acidity: 50, earthiness: 20, funk: 15, mineral: 30, oak: 50, floral: 60, color: 'red' }
const CRISP_WHITE = { id: 'ext_3', body: 35, tannin: 10, sweetness: 20, acidity: 75, earthiness: 15, funk: 10, mineral: 65, oak: 10, floral: 50, color: 'white' }

describe('inferPalateFromRatings', () => {
  it('returns neutral defaults for empty ratings', () => {
    const result = inferPalateFromRatings({})
    expect(result.palate).toBeDefined()
    expect(result.ratedCount).toBe(0)
    expect(result.confidence).toBe(0)
    expect(result.character).toBeNull()
  })

  it('does not crash on null/undefined input', () => {
    expect(() => inferPalateFromRatings(null)).not.toThrow()
    expect(() => inferPalateFromRatings(undefined)).not.toThrow()
  })

  it('increases confidence with more ratings', () => {
    const oneRating = inferPalateFromRatings({ ext_1: 'loved' }, { ext_1: EARTHY_RED })
    const twoRatings = inferPalateFromRatings({ ext_1: 'loved', ext_2: 'hated' }, { ext_1: EARTHY_RED, ext_2: FRUITY_RED })
    expect(twoRatings.confidence).toBeGreaterThanOrEqual(oneRating.confidence)
  })

  it('pulls palate toward loved wine style', () => {
    const result = inferPalateFromRatings({ ext_1: 'loved' }, { ext_1: EARTHY_RED })
    // Loved a full-bodied, tannic red → profile should shift toward high body
    expect(result.palate.body).toBeGreaterThan(50)
    expect(result.palate.tannin).toBeGreaterThan(50)
  })

  it('pulls palate away from hated wine style (mirroring)', () => {
    const result = inferPalateFromRatings({ ext_2: 'hated' }, { ext_2: FRUITY_RED })
    // Hated a sweet, medium-tannic red → profile should shift away from those values
    expect(result.palate.sweetness).toBeLessThan(40)
  })

  it('"ok" ratings do not shift the palate', () => {
    const noRatings = inferPalateFromRatings({})
    const okRating = inferPalateFromRatings({ ext_3: 'ok' }, { ext_3: CRISP_WHITE })
    // "ok" has weight 0, so palate should remain neutral
    expect(okRating.palate.body).toBe(noRatings.palate.body)
  })

  it('returns ratedCount equal to number of valid ratings', () => {
    const result = inferPalateFromRatings(
      { ext_1: 'loved', ext_2: 'hated', ext_3: 'ok' },
      { ext_1: EARTHY_RED, ext_2: FRUITY_RED, ext_3: CRISP_WHITE }
    )
    expect(result.ratedCount).toBe(3)
  })

  it('all palate values are numbers in 0–100 range', () => {
    const result = inferPalateFromRatings({ ext_1: 'loved', ext_2: 'hated' }, { ext_1: EARTHY_RED, ext_2: FRUITY_RED })
    for (const val of Object.values(result.palate)) {
      expect(typeof val).toBe('number')
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it('bucketCounts reflects each bucket', () => {
    const result = inferPalateFromRatings(
      { ext_1: 'loved', ext_2: 'hated' },
      { ext_1: EARTHY_RED, ext_2: FRUITY_RED }
    )
    expect(result.bucketCounts.loved).toBe(1)
    expect(result.bucketCounts.hated).toBe(1)
    expect(result.bucketCounts.ok).toBe(0)
  })
})
