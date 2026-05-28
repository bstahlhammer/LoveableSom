import { wineSearchDb, wines as catalogWines, tasteProfiles, RATING_BUCKETS } from '../data/mockData.js'

const AXES = ['body', 'sweetness', 'tannin', 'acidity']
const CHARACTER_AXES = ['earthiness', 'funk', 'mineral', 'oak', 'floral']
const NEUTRAL_PALATE = { body: 50, sweetness: 30, tannin: 40, acidity: 55 }

const bucketById = Object.fromEntries(RATING_BUCKETS.map(b => [b.id, b]))
const wineById   = Object.fromEntries(wineSearchDb.map(w => [w.id, w]))
// Catalog wines carry character axes; search-only wines don't have them
const catalogById = Object.fromEntries(catalogWines.map(w => [w.id, w]))

/**
 * Infer a palate from a map of { wineId: bucketId } ratings.
 *
 * Structural axes: each rated wine pulls the centroid toward (positive) or
 * away from (negative, mirrored) its axis values. 'ok' contributes nothing.
 *
 * Character axes: same centroid logic, but only axes where the rated catalog
 * wines show meaningful variance (std dev > 15) get a non-null inferred value.
 * Wines without character data are skipped for character inference.
 *
 * @param {Record<string|number, string>} ratings  e.g. { 3: 'loved', 'cat_27': 'hated' }
 * @param {Record<string, object>} externalWineData  palate data for catalog/web wines
 * @returns {{
 *   palate: { body, sweetness, tannin, acidity },
 *   character: { earthiness, funk, mineral, oak, floral } | null,
 *   confidence: number,
 *   ratedCount: number,
 *   bucketCounts: Record<string, number>
 * }}
 */
export function inferPalateFromRatings(ratings, externalWineData = {}) {
  const entries = Object.entries(ratings || {})
    .map(([id, bucketId]) => {
      const numId = Number(id)
      const localWine = !Number.isNaN(numId) ? wineById[numId] : null
      const wine = localWine || externalWineData[id] || null
      return { wine, bucket: bucketById[bucketId] }
    })
    .filter(e => e.wine && e.bucket)

  const bucketCounts = Object.fromEntries(RATING_BUCKETS.map(b => [b.id, 0]))
  for (const e of entries) bucketCounts[e.bucket.id]++

  if (entries.length === 0) {
    return { palate: { ...NEUTRAL_PALATE }, character: null, confidence: 0, ratedCount: 0, bucketCounts }
  }

  const acc = { body: 0, sweetness: 0, tannin: 0, acidity: 0 }
  let totalWeight = 0

  for (const { wine, bucket } of entries) {
    const absW = Math.abs(bucket.weight)
    if (absW === 0) continue
    for (const axis of AXES) {
      const v = wine[axis]
      const contribution = bucket.weight > 0
        ? v
        : 2 * NEUTRAL_PALATE[axis] - v
      acc[axis] += contribution * absW
    }
    totalWeight += absW
  }

  const palate = {}
  for (const axis of AXES) {
    if (totalWeight === 0) {
      palate[axis] = NEUTRAL_PALATE[axis]
    } else {
      const prior = NEUTRAL_PALATE[axis]
      const priorWeight = 1.5
      palate[axis] = Math.round(
        (acc[axis] + prior * priorWeight) / (totalWeight + priorWeight)
      )
      palate[axis] = Math.max(0, Math.min(100, palate[axis]))
    }
  }

  // Character inference — only from catalog wines that carry character data
  const charEntries = entries
    .map(e => ({ ...e, catalog: catalogById[e.wine.id] }))
    .filter(e => e.catalog && CHARACTER_AXES.every(a => e.catalog[a] != null))

  let character = null
  if (charEntries.length > 0) {
    // Check variance per axis: only infer axes with std dev > 15 across rated wines
    const charAcc = Object.fromEntries(CHARACTER_AXES.map(a => [a, 0]))
    let charWeight = 0

    for (const { catalog, bucket } of charEntries) {
      const absW = Math.abs(bucket.weight)
      if (absW === 0) continue
      for (const axis of CHARACTER_AXES) {
        const v = catalog[axis]
        const contribution = bucket.weight > 0 ? v : 100 - v
        charAcc[axis] += contribution * absW
      }
      charWeight += absW
    }

    const charVals = Object.fromEntries(
      CHARACTER_AXES.map(axis => {
        const raw = charWeight > 0
          ? Math.round((charAcc[axis] + 50 * 1.5) / (charWeight + 1.5))
          : 50
        return [axis, Math.max(0, Math.min(100, raw))]
      })
    )

    // Compute std dev of raw catalog values for each axis across rated set
    const hasVariance = (axis) => {
      const vals = charEntries.map(e => e.catalog[axis])
      if (vals.length < 2) return false
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
      return Math.sqrt(variance) > 15
    }

    const hasAnyVariance = CHARACTER_AXES.some(hasVariance)
    if (hasAnyVariance) {
      character = Object.fromEntries(
        CHARACTER_AXES.map(axis => [axis, hasVariance(axis) ? charVals[axis] : null])
      )
    }
  }

  const confidence = Math.min(1, totalWeight / 12)

  return { palate, character, confidence, ratedCount: entries.length, bucketCounts }
}

/**
 * Build a personalized taste identity from structural palate + character axes.
 *
 * When character is expressed, the generic archetype name ("Bold Red Lover") is
 * replaced with a description that reflects what the person actually drinks —
 * "The Natural Wine Soul", "The Mineral Purist", etc.
 *
 * Returns { name, description } to overlay on top of the nearest archetype,
 * or null if no character is expressed (caller falls back to archetype).
 *
 * @param {{ body, tannin, sweetness, acidity }} palate
 * @param {{ earthiness, funk, mineral, oak, floral } | null} character
 */
export function buildTasteIdentity(palate, character) {
  if (!character) return null

  const e = character.earthiness ?? 0
  const f = character.funk       ?? 0
  const m = character.mineral    ?? 0
  const o = character.oak        ?? 50 // 50 = unexpressed, not low
  const fl = character.floral    ?? 0

  const hasEarth   = character.earthiness != null
  const hasFunk    = character.funk        != null
  const hasMineral = character.mineral     != null
  const hasOak     = character.oak         != null
  const hasFloral  = character.floral      != null

  const expressed = [hasEarth, hasFunk, hasMineral, hasOak, hasFloral].filter(Boolean).length
  if (expressed === 0) return null

  // Structural modifiers
  const isDry  = palate && palate.sweetness < 22
  const isRed  = palate && palate.tannin > 28 && palate.body > 48
  const dryPrefix = isDry ? 'Bone-dry, ' : ''

  // --- Priority rules (first match wins) ---

  // Earthy + funky together → natural wine territory
  if (hasEarth && hasFunk && e >= 52 && f >= 52) {
    const style = isRed ? 'reds' : 'wines'
    return {
      name: 'The Natural Wine Soul',
      description: `${dryPrefix}earthy and funky — you reach for low-intervention ${style} that taste like somewhere specific: forest floor, terroir, a little wildness in the glass.`,
    }
  }

  // Strong earthiness, clean/no funk preference
  if (hasEarth && e >= 55 && (!hasFunk || f < 38)) {
    return {
      name: 'The Terroir Seeker',
      description: `${dryPrefix}you're drawn to wines that taste like somewhere — earthy, mushroomy, with a forest floor quality that clean fruit-forward styles never deliver.`,
    }
  }

  // Strong funk, earth is secondary or absent
  if (hasFunk && f >= 58) {
    return {
      name: 'The Funk Devotee',
      description: `Brett, barnyard, wild fermentation — you love the polarizing character that makes a wine feel alive and unconventional.`,
    }
  }

  // Mineral-dominant with low/no oak
  if (hasMineral && m >= 60 && (!hasOak || o <= 28)) {
    return {
      name: 'The Mineral Purist',
      description: `Stony, flinty, volcanic — you reach for wines where the geology speaks louder than the fruit, and oak is just in the way.`,
    }
  }

  // Mineral without an oak opinion
  if (hasMineral && m >= 60) {
    return {
      name: 'The Mineral Seeker',
      description: `You're drawn to wines with a stony, mineral quality — the kind that taste like wet stone, chalk, or the soil they grew from.`,
    }
  }

  // Explicitly anti-oak (oak preference expressed and low)
  if (hasOak && o <= 18) {
    return {
      name: 'The Unoaked Purist',
      description: `Nothing between you and the grape. You prefer wines that let fruit and terroir speak without vanilla or toast interference.`,
    }
  }

  // Oak-driven palate
  if (hasOak && o >= 65) {
    return {
      name: 'The Oaked-Style Enthusiast',
      description: `Vanilla, toast, cedar — you appreciate the texture and warmth that well-managed barrel aging brings to a wine.`,
    }
  }

  // Floral-dominant
  if (hasFloral && fl >= 62) {
    return {
      name: 'The Aromatic Devotee',
      description: `Violet, rose, jasmine — you're drawn to wines where the bouquet is as compelling as the palate. Perfumed and expressive is your register.`,
    }
  }

  // Moderate earthiness + funk together (lower thresholds)
  if (hasEarth && hasFunk && e >= 35 && f >= 35) {
    return {
      name: 'The Earthy Red Lover',
      description: `${dryPrefix}you gravitate toward wines with grip, texture, and a savory earthy edge — the kind of bottles that improve with food and age.`,
    }
  }

  return null
}

/** Find the closest archetype to a given palate. */
export function nearestTasteProfile(palate) {
  let best = tasteProfiles[0]
  let bestDist = Infinity
  for (const profile of tasteProfiles) {
    const p = profile.palate
    const dist = Math.sqrt(
      AXES.reduce((s, axis) => s + (palate[axis] - p[axis]) ** 2, 0)
    )
    if (dist < bestDist) { bestDist = dist; best = profile }
  }
  return best
}

/** Group rating IDs by bucket — convenient shape for the match engine. */
export function groupRatingsByBucket(ratings) {
  const out = Object.fromEntries(RATING_BUCKETS.map(b => [b.id, []]))
  for (const [id, bucketId] of Object.entries(ratings || {})) {
    if (out[bucketId]) out[bucketId].push(Number(id))
  }
  return out
}
