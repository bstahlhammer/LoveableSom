/**
 * Tests for the wine name filter functions inside useScan.js.
 * These guard against two failure modes:
 *   1. Generic varietal names passing through as wines (e.g. "Pinot Noir" with no producer)
 *   2. AI label descriptions passing through instead of wine names
 *      (e.g. "Wine with decorative patterned label")
 *
 * The functions are not exported from useScan.js so we duplicate the logic here.
 * If the logic in useScan.js changes, update these copies too.
 */
import { describe, it, expect } from 'vitest'

// ── Duplicated from useScan.js ────────────────────────────────────────────────

const GENERIC_VARIETAL_NAMES = new Set([
  'pinot noir', 'pinot grigio', 'pinot gris', 'pinot blanc',
  'cabernet sauvignon', 'cabernet franc', 'cabernet',
  'chardonnay', 'merlot', 'sauvignon blanc', 'syrah', 'shiraz',
  'zinfandel', 'riesling', 'malbec', 'grenache', 'tempranillo',
  'sangiovese', 'nebbiolo', 'barbera', 'viognier', 'gewurztraminer',
  'moscato', 'prosecco', 'champagne', 'rosé', 'rose',
  'red blend', 'white blend', 'bordeaux blend', 'meritage',
  'red wine', 'white wine', 'sparkling wine',
])

function isGenericVarietalName(name) {
  const stripped = String(name)
    .toLowerCase()
    .replace(/\b\d{4}\b/g, '')
    .replace(/[^a-zé\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return GENERIC_VARIETAL_NAMES.has(stripped)
}

const DESCRIPTIVE_PREFIXES = [
  'wine with ', 'red wine with ', 'white wine with ', 'rosé with ', 'rose with ',
  'sparkling wine with ', 'bottle with ', 'wine bottle with ',
]

const DESCRIPTIVE_PHRASES = [
  'illustrated label', 'decorative label', 'patterned label',
  'flower design', 'animal skull', 'vintage truck', 'vehicle imagery',
  'top shelf', 'bottom shelf', 'left side', 'right side', 'shelf,',
  'label design', 'artistic label',
]

function isDescriptiveName(name) {
  const lc = String(name).toLowerCase()
  if (DESCRIPTIVE_PREFIXES.some(p => lc.startsWith(p))) return true
  if (DESCRIPTIVE_PHRASES.some(p => lc.includes(p))) return true
  if (/\((?:top shelf|bottom shelf|left side|right side|shelf,?\s*(?:left|right|top|bottom))/.test(lc)) return true
  return false
}

// ─────────────────────────────────────────────────────────────────────────────

describe('isGenericVarietalName', () => {
  it('rejects bare varietal names', () => {
    expect(isGenericVarietalName('Pinot Noir')).toBe(true)
    expect(isGenericVarietalName('Cabernet Sauvignon')).toBe(true)
    expect(isGenericVarietalName('Chardonnay')).toBe(true)
    expect(isGenericVarietalName('Malbec')).toBe(true)
    expect(isGenericVarietalName('red wine')).toBe(true)
    expect(isGenericVarietalName('Red Wine')).toBe(true)
  })

  it('rejects bare varietal with vintage year only', () => {
    // "Pinot Noir 2019" strips to "pinot noir" → still generic
    expect(isGenericVarietalName('Pinot Noir 2019')).toBe(true)
    expect(isGenericVarietalName('2021 Chardonnay')).toBe(true)
  })

  it('passes producer + varietal combinations', () => {
    expect(isGenericVarietalName('Meiomi Pinot Noir')).toBe(false)
    expect(isGenericVarietalName('Jordan Cabernet Sauvignon')).toBe(false)
    expect(isGenericVarietalName('La Marca Prosecco')).toBe(false)
    expect(isGenericVarietalName('Santa Margherita Pinot Grigio')).toBe(false)
  })

  it('passes winery names that happen to contain varietal words', () => {
    expect(isGenericVarietalName('Caymus Cabernet Sauvignon')).toBe(false)
    expect(isGenericVarietalName('Silver Oak Cabernet Sauvignon')).toBe(false)
  })
})

describe('isDescriptiveName', () => {
  describe('correctly identifies AI label descriptions (should return true)', () => {
    it('catches "Wine with decorative patterned label (top shelf, left)"', () => {
      expect(isDescriptiveName('Wine with decorative patterned label (top shelf, left)')).toBe(true)
    })

    it('catches "Red wine with botanical/flower design label"', () => {
      expect(isDescriptiveName('Red wine with botanical/flower design label')).toBe(true)
    })

    it('catches "Red wine with illustrated label (vintage truck/vehicle imagery)"', () => {
      expect(isDescriptiveName('Red wine with illustrated label (vintage truck/vehicle imagery)')).toBe(true)
    })

    it('catches "White wine with decorative label"', () => {
      expect(isDescriptiveName('White wine with decorative label')).toBe(true)
    })

    it('catches "Bottle with animal skull imagery"', () => {
      expect(isDescriptiveName('Bottle with animal skull imagery')).toBe(true)
    })

    it('catches "Wine with patterned label"', () => {
      expect(isDescriptiveName('Wine with patterned label')).toBe(true)
    })

    it('catches "Red wine with artistic label"', () => {
      expect(isDescriptiveName('Red wine with artistic label')).toBe(true)
    })

    it('catches shelf-position parentheticals', () => {
      expect(isDescriptiveName('Malbec (top shelf, left)')).toBe(true)
      expect(isDescriptiveName('Red Wine (bottom shelf)')).toBe(true)
    })
  })

  describe('does NOT filter real wine names (false positive guards — must return false)', () => {
    it('passes "Caymus Cabernet Sauvignon"', () => {
      expect(isDescriptiveName('Caymus Cabernet Sauvignon')).toBe(false)
    })

    it('passes "Botanica Wines Chenin Blanc"', () => {
      expect(isDescriptiveName('Botanica Wines Chenin Blanc')).toBe(false)
    })

    it('passes "19 Crimes Cabernet Sauvignon"', () => {
      expect(isDescriptiveName('19 Crimes Cabernet Sauvignon')).toBe(false)
    })

    it('passes "Château Pétrus"', () => {
      expect(isDescriptiveName('Château Pétrus')).toBe(false)
    })

    it('passes "The Prisoner Red Blend"', () => {
      expect(isDescriptiveName('The Prisoner Red Blend')).toBe(false)
    })

    it('passes "Meiomi Pinot Noir"', () => {
      expect(isDescriptiveName('Meiomi Pinot Noir')).toBe(false)
    })

    it('passes "Whispering Angel Rosé"', () => {
      expect(isDescriptiveName('Whispering Angel Rosé')).toBe(false)
    })

    it('passes wine names with "illustrated" in the producer name', () => {
      // Edge case: a real winery called "Illustrated Estate"
      expect(isDescriptiveName('Illustrated Estate Cabernet Sauvignon')).toBe(false)
    })

    it('passes wine names with "vintage" in the producer name', () => {
      expect(isDescriptiveName('Vintage Ink Zinfandel')).toBe(false)
    })

    it('passes "Clos du Bois Cabernet Sauvignon"', () => {
      expect(isDescriptiveName('Clos du Bois Cabernet Sauvignon')).toBe(false)
    })
  })
})
