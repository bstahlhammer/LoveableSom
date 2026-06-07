import { describe, it, expect } from 'vitest'
import { computeApproachability } from '../approachabilityEngine.js'

describe('computeApproachability', () => {
  it('returns a value between 1 and 5', () => {
    const cases = [
      { tannin: 0, sweetness: 100, body: 50 },
      { tannin: 100, sweetness: 0, body: 100 },
      { tannin: 50, sweetness: 30, body: 50 },
    ]
    for (const wine of cases) {
      const score = computeApproachability(wine)
      expect(score).toBeGreaterThanOrEqual(1)
      expect(score).toBeLessThanOrEqual(5)
    }
  })

  it('high tannin / low sweetness → lower approachability than soft wine', () => {
    const grippy = { tannin: 90, sweetness: 5, body: 80 }
    const soft = { tannin: 10, sweetness: 80, body: 30 }
    expect(computeApproachability(grippy)).toBeLessThan(computeApproachability(soft))
  })

  it('low tannin / high sweetness → high approachability (4 or 5)', () => {
    const soft = { tannin: 10, sweetness: 80, body: 30 }
    expect(computeApproachability(soft)).toBeGreaterThanOrEqual(4)
  })

  it('returns a number when all fields are missing (uses defaults)', () => {
    const score = computeApproachability({})
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(5)
  })

  it('returns an integer (no decimals)', () => {
    const score = computeApproachability({ tannin: 45, sweetness: 32, body: 55 })
    expect(Number.isInteger(score)).toBe(true)
  })
})
