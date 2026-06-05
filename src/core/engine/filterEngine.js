/**
 * Filter engine — narrow a wine list by price / color / varietal /
 * maker / region / certifications. Pure functions, no side effects.
 *
 * Filter rules:
 * - empty array (or undefined min/max) = no constraint on that facet
 * - within a facet: OR (any selected match)
 * - across facets: AND
 * - varietalsExclude: any wine whose varietal matches is dropped
 * - certifications: only constrain if the user picked at least one;
 *   wines with unknown/empty certifications are dropped only when
 *   the user explicitly filters by certification
 */

export const EMPTY_FILTERS = Object.freeze({
  priceMin: undefined,
  priceMax: undefined,
  colors: [],
  varietalsInclude: [],
  varietalsExclude: [],
  makers: [],
  regions: [],
  certifications: [],
  natural: false,
})

const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

export function priceOf(wine) {
  if (typeof wine.priceNum === 'number' && wine.priceNum > 0) return wine.priceNum
  if (typeof wine.price === 'string') {
    const m = wine.price.match(/(\d+(?:\.\d+)?)/)
    if (m) return parseFloat(m[1])
  }
  return null
}

function colorOf(wine) {
  if (Array.isArray(wine.wineStyle) && wine.wineStyle.includes('orange-wine')) return 'orange'
  if (wine.color) return norm(wine.color)
  return inferColorFromGrape(wine.grape)
}

export function inferColorFromGrape(grape) {
  const g = norm(grape)
  if (!g) return ''
  if (g.includes('rosé') || g.includes('rose')) return 'rose'
  if (g.includes('champagne') || g.includes('prosecco') || g.includes('cava') ||
      g.includes('sparkling') || g.includes('glera')) return 'sparkling'
  if (g.includes('port') || g.includes('sauternes') || g.includes('sémillon blend')) return 'dessert'
  // Common reds
  const reds = ['cabernet','pinot noir','zinfandel','sangiovese','tempranillo','gamay','merlot','syrah','shiraz','malbec','grenache','garnacha','nebbiolo','corvina','bordeaux blend','red blend','mourvedre','cabernet-shiraz','cabernet blend','malbec blend','tempranillo blend','grenache blend','port blend']
  if (reds.some(r => g.includes(r))) return 'red'
  // Common whites
  const whites = ['chardonnay','sauvignon blanc','pinot grigio','pinot gris','riesling','viura','moscato','chenin','viognier','champagne blend','glera']
  if (whites.some(w => g.includes(w))) return 'white'
  return ''
}

export function inferMakerFromName(name, grape) {
  if (!name) return ''
  const n = String(name).trim()
  if (!n) return ''
  const g = norm(grape)
  if (g) {
    // Strip the grape token (and "blend") off the end if present
    const tokens = g.split(/\s+/).filter(Boolean)
    const firstTok = tokens[0]
    if (firstTok && firstTok.length > 2) {
      const idx = n.toLowerCase().indexOf(firstTok)
      if (idx > 2) return n.slice(0, idx).trim().replace(/[,\-:]+$/, '').trim()
    }
  }
  // Fallback: first 2 words
  const words = n.split(/\s+/)
  return words.slice(0, Math.min(2, words.length)).join(' ')
}

function makerOf(wine) {
  if (wine.maker) return wine.maker
  return inferMakerFromName(wine.name, wine.grape)
}

function certsOf(wine) {
  return Array.isArray(wine.certifications) ? wine.certifications : []
}

function varietalOf(wine) {
  return norm(wine.grape)
}

function regionOf(wine) {
  return norm(wine.region)
}

export function applyFilters(wineList, filters) {
  if (!Array.isArray(wineList)) return []
  const f = { ...EMPTY_FILTERS, ...(filters || {}) }

  return wineList.filter((w) => {
    // Price
    const p = priceOf(w)
    if (typeof f.priceMin === 'number' && p !== null && p < f.priceMin) return false
    if (typeof f.priceMax === 'number' && p !== null && p > f.priceMax) return false

    // Color
    if (f.colors?.length) {
      const c = colorOf(w)
      if (!f.colors.map(norm).includes(c)) return false
    }

    // Varietals — include / exclude
    const varietal = varietalOf(w)
    if (f.varietalsInclude?.length) {
      if (!f.varietalsInclude.some(v => varietal.includes(norm(v)))) return false
    }
    if (f.varietalsExclude?.length) {
      if (f.varietalsExclude.some(v => varietal.includes(norm(v)))) return false
    }

    // Makers
    if (f.makers?.length) {
      const m = norm(makerOf(w))
      if (!f.makers.map(norm).includes(m)) return false
    }

    // Regions
    if (f.regions?.length) {
      const r = regionOf(w)
      if (!f.regions.some(rr => r.includes(norm(rr)))) return false
    }

    // Certifications — only constrain when user picks at least one
    if (f.certifications?.length) {
      const wineCerts = certsOf(w).map(norm)
      if (!wineCerts.length) return false
      if (!f.certifications.some(c => wineCerts.includes(norm(c)))) return false
    }

    // Natural wine — keep only wines with a natural/low-intervention style signal
    if (f.natural) {
      const styles = Array.isArray(w.wineStyle) ? w.wineStyle : []
      const natural = ['natural', 'skin-contact', 'orange-wine', 'pét-nat', 'biodynamic', 'amphora']
      if (!styles.some(s => natural.includes(s))) return false
    }

    return true
  })
}

/**
 * Build the available facet options from a wine list, so the UI can
 * show only filters that actually narrow the result set.
 */
export function getFilterFacets(wineList) {
  const colors = new Set()
  const varietals = new Set()
  const makers = new Set()
  const regions = new Set()
  const certifications = new Set()
  let min = Infinity
  let max = -Infinity

  for (const w of wineList || []) {
    const c = colorOf(w); if (c) colors.add(c)
    const v = w.grape && String(w.grape).trim(); if (v) varietals.add(v)
    const m = makerOf(w); if (m) makers.add(m)
    const r = w.region && String(w.region).trim(); if (r) regions.add(r)
    for (const cert of certsOf(w)) certifications.add(cert)
    const p = priceOf(w)
    if (p !== null) {
      if (p < min) min = p
      if (p > max) max = p
    }
  }

  return {
    colors:        [...colors].sort(),
    varietals:     [...varietals].sort(),
    makers:        [...makers].sort((a, b) => a.localeCompare(b)),
    regions:       [...regions].sort((a, b) => a.localeCompare(b)),
    certifications:[...certifications].sort(),
    priceRange: {
      min: Number.isFinite(min) ? Math.floor(min) : 0,
      max: Number.isFinite(max) ? Math.ceil(max) : 0,
    },
  }
}

export function countActiveFilters(filters) {
  if (!filters) return 0
  let n = 0
  if (typeof filters.priceMin === 'number' || typeof filters.priceMax === 'number') n += 1
  if (filters.natural) n += 1
  for (const k of ['colors','varietalsInclude','varietalsExclude','makers','regions','certifications']) {
    if (filters[k]?.length) n += filters[k].length
  }
  return n
}

export const CERTIFICATION_LABELS = {
  natural:     'Natural',
  biodynamic:  'Biodynamic',
  organic:     'Organic',
  low_sulfite: 'Low sulfite',
}

export const COLOR_LABELS = {
  red:       'Red',
  white:     'White',
  rose:      'Rosé',
  orange:    'Orange',
  sparkling: 'Sparkling',
  dessert:   'Dessert',
}
