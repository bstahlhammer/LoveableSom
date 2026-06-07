import { describe, it, expect } from 'vitest'
import { applyFilters, priceOf, inferColorFromGrape, EMPTY_FILTERS } from '../filterEngine.js'

const makeWine = (overrides) => ({
  id: 1,
  name: 'Test Wine',
  grape: 'Cabernet Sauvignon',
  region: 'Napa Valley',
  color: 'red',
  price: '$25',
  priceNum: 25,
  wineStyle: ['conventional'],
  ...overrides,
})

describe('priceOf', () => {
  it('returns priceNum when available', () => {
    expect(priceOf(makeWine({ priceNum: 30 }))).toBe(30)
  })

  it('parses price string when priceNum absent', () => {
    expect(priceOf(makeWine({ priceNum: null, price: '$19.99' }))).toBeCloseTo(19.99)
  })

  it('returns null when no price data', () => {
    expect(priceOf(makeWine({ priceNum: null, price: null }))).toBeNull()
  })
})

describe('inferColorFromGrape', () => {
  it('identifies red grapes', () => {
    expect(inferColorFromGrape('Cabernet Sauvignon')).toBe('red')
    expect(inferColorFromGrape('Pinot Noir')).toBe('red')
    expect(inferColorFromGrape('Malbec')).toBe('red')
  })

  it('identifies white grapes', () => {
    expect(inferColorFromGrape('Chardonnay')).toBe('white')
    expect(inferColorFromGrape('Sauvignon Blanc')).toBe('white')
    expect(inferColorFromGrape('Riesling')).toBe('white')
  })

  it('returns empty string for unknown grapes', () => {
    expect(inferColorFromGrape('Unknown Grape')).toBe('')
    expect(inferColorFromGrape(null)).toBe('')
  })
})

describe('applyFilters', () => {
  const wines = [
    makeWine({ id: 1, name: 'Cab A', grape: 'Cabernet Sauvignon', priceNum: 25, color: 'red', region: 'Napa' }),
    makeWine({ id: 2, name: 'Chard B', grape: 'Chardonnay', priceNum: 18, color: 'white', region: 'Burgundy' }),
    makeWine({ id: 3, name: 'Pinot C', grape: 'Pinot Noir', priceNum: 45, color: 'red', region: 'Oregon' }),
    makeWine({ id: 4, name: 'Natural D', grape: 'Grenache', priceNum: 30, color: 'red', wineStyle: ['natural', 'biodynamic'], region: 'Rhône' }),
  ]

  it('returns all wines when no filters applied', () => {
    expect(applyFilters(wines, EMPTY_FILTERS)).toHaveLength(4)
  })

  it('filters by max price', () => {
    const result = applyFilters(wines, { ...EMPTY_FILTERS, priceMax: 30 })
    expect(result).toHaveLength(3)
    expect(result.every(w => w.priceNum <= 30)).toBe(true)
  })

  it('filters by min price', () => {
    const result = applyFilters(wines, { ...EMPTY_FILTERS, priceMin: 25 })
    expect(result).toHaveLength(3)
    expect(result.every(w => w.priceNum >= 25)).toBe(true)
  })

  it('filters by color', () => {
    const reds = applyFilters(wines, { ...EMPTY_FILTERS, colors: ['red'] })
    expect(reds.every(w => w.color === 'red')).toBe(true)
    expect(reds.length).toBeGreaterThan(0)
  })

  it('filters out excluded varietals (case-insensitive)', () => {
    const result = applyFilters(wines, { ...EMPTY_FILTERS, varietalsExclude: ['Chardonnay'] })
    expect(result.some(w => w.grape === 'Chardonnay')).toBe(false)
    expect(result).toHaveLength(3)
  })

  it('filters to included varietals only', () => {
    const result = applyFilters(wines, { ...EMPTY_FILTERS, varietalsInclude: ['Pinot Noir'] })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pinot C')
  })

  it('filters by natural flag — drops conventional wines', () => {
    const result = applyFilters(wines, { ...EMPTY_FILTERS, natural: true })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Natural D')
  })

  it('handles empty wine list gracefully', () => {
    expect(applyFilters([], { ...EMPTY_FILTERS, priceMax: 20 })).toEqual([])
  })

  it('handles null wine list gracefully', () => {
    expect(applyFilters(null, EMPTY_FILTERS)).toEqual([])
  })
})
