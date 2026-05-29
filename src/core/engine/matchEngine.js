import { RATING_BUCKETS } from '../data/mockData.js'

const bucketById = Object.fromEntries(RATING_BUCKETS.map(b => [b.id, b]))

const CHARACTER_AXES = ['earthiness', 'funk', 'mineral', 'oak', 'floral']

/**
 * Compute match score 0–100 between a wine and a taste profile.
 * Body and tannin are weighted 2×; sweetness and acidity 1×.
 *
 * Character axes (earthiness/funk/mineral/oak/floral) blend in when the user
 * has expressed at least one preference. charWeight = min(0.30, axes * 0.07).
 * Null axes are excluded; wines missing character data default to 50 (neutral).
 *
 * Rated wines get a bucket-specific score delta (loved +35 … hated -35).
 * Legacy `lovedWineIds` / `hatedWineIds` arrays are still supported.
 *
 * @param {{ id: number, body: number, sweetness: number, tannin: number, acidity: number }} wine
 * @param {{
 *   palate: { body, sweetness, tannin, acidity },
 *   character?: { earthiness, funk, mineral, oak, floral },
 *   ratingsByBucket?: Record<string, number[]>,
 *   lovedWineIds?: number[],
 *   hatedWineIds?: number[]
 * }} tasteProfile
 * @returns {number} 0–100
 */
export function computeMatch(wine, tasteProfile) {
  if (!tasteProfile || !tasteProfile.palate) return wine.match ?? 50

  const p = tasteProfile.palate
  if (wine.body == null || wine.tannin == null || wine.sweetness == null || wine.acidity == null) {
    return wine.match ?? 50
  }

  const dist =
    Math.abs(wine.body      - p.body)      * 2 +
    Math.abs(wine.tannin    - p.tannin)    * 2 +
    Math.abs(wine.sweetness - p.sweetness) * 1 +
    Math.abs(wine.acidity   - p.acidity)   * 1

  const maxDist = 300
  let structuralScore = Math.max(0, Math.round(100 - (dist / maxDist) * 100))

  // Character blending — only when user has expressed character preferences
  const charProfile = tasteProfile.character
  let finalScore = structuralScore
  if (charProfile) {
    const expressed = CHARACTER_AXES.filter(axis => charProfile[axis] != null)
    if (expressed.length > 0) {
      const charWeight = Math.min(0.30, expressed.length * 0.07)
      const axisScores = expressed.map(axis => {
        const wineVal = wine[axis] != null ? wine[axis] : 50
        return 100 - Math.abs(wineVal - charProfile[axis])
      })
      const characterScore = axisScores.reduce((a, b) => a + b, 0) / axisScores.length
      finalScore = Math.round(structuralScore * (1 - charWeight) + characterScore * charWeight)
    }
  }

  let score = finalScore

  // Per-bucket deltas
  const byBucket = tasteProfile.ratingsByBucket
  if (byBucket) {
    for (const bucket of RATING_BUCKETS) {
      const ids = byBucket[bucket.id]
      if (ids && ids.includes(wine.id)) {
        score += bucket.matchDelta
      }
    }
  }

  // Legacy arrays
  if (tasteProfile.lovedWineIds?.includes(wine.id)) {
    score += bucketById.loved.matchDelta
  }
  if (tasteProfile.hatedWineIds?.includes(wine.id)) {
    score += bucketById.hated.matchDelta
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Computes a confidence-adjusted match score. Three independent factors
 * reduce confidence and blend the score toward the neutral baseline (50):
 *
 *   1. Incomplete taste profile  (inferenceConfidence < 0.95)
 *   2. Wine not highly rated     (critic rating < 90)
 *   3. Budget price point        (priceNum < $20)
 *
 * Formula: adjustedScore = rawScore × conf + 50 × (1 − conf)
 *
 * The raw `computeMatch` score is preserved on the result as `rawScore` so
 * callers can still sort by the untempered value.
 *
 * @returns {{ score: number, rawScore: number, isLow: boolean, reason: string|null }}
 */
export function computeMatchWithConfidence(wine, tasteProfile) {
  const rawScore = typeof wine.computedMatch === 'number'
    ? wine.computedMatch
    : computeMatch(wine, tasteProfile)

  let conf = 1.0
  const flags = []

  // Profile completeness — inferenceConfidence is 0–1 (capped totalWeight of all signals)
  const profileConf = tasteProfile?.inferenceConfidence ?? 0
  if (profileConf < 0.4)       { conf *= 0.65; flags.push('profile') }
  else if (profileConf < 0.95) { conf *= 0.82; flags.push('profile') }

  // Critic rating — "highly rated" means 90+
  const rating = wine.rating
  if (typeof rating === 'number') {
    if (rating < 87)       { conf *= 0.84; flags.push('quality') }
    else if (rating < 90)  { conf *= 0.91; flags.push('quality') }
  }

  // Price — under $20 is budget tier
  const priceNum = wine.priceNum ?? parseFloat(String(wine.price ?? '').replace(/[^0-9.]/g, ''))
  if (!isNaN(priceNum) && priceNum > 0) {
    if (priceNum < 12)       { conf *= 0.84; flags.push('price') }
    else if (priceNum < 20)  { conf *= 0.91; flags.push('price') }
  }

  const isLow = flags.length > 0
  const score = isLow
    ? Math.max(0, Math.min(100, Math.round(rawScore * conf + 50 * (1 - conf))))
    : rawScore

  let reason = null
  const hasProfile = flags.includes('profile')
  const hasQuality = flags.includes('quality')
  const hasPrice   = flags.includes('price')
  if (hasProfile && hasQuality && hasPrice)      reason = 'limited data'
  else if (hasProfile && hasQuality)             reason = 'limited profile & mixed ratings'
  else if (hasProfile && hasPrice)               reason = 'limited profile'
  else if (hasQuality && hasPrice)               reason = 'budget wine, mixed ratings'
  else if (hasProfile)                           reason = 'limited profile'
  else if (hasQuality)                           reason = 'mixed ratings'
  else if (hasPrice)                             reason = 'budget tier'

  return {
    score, rawScore, isLow, reason, confidence: conf,
    flags,
    profileConf,
    criticRating: typeof rating === 'number' ? rating : null,
    priceNum: (!isNaN(priceNum) && priceNum > 0) ? priceNum : null,
  }
}

/**
 * Plain-language explanation of WHY a wine has a given match score.
 * Compares the wine's palate axes to the user's profile and surfaces the
 * 1-2 axes that drive the score most.
 *
 * Returns { headline, axes, archetype } where:
 *   headline  — short sentence (e.g. "Closest to your Bold-and-Brooding palate.")
 *   axes      — string list of axis-level alignment notes
 *   archetype — clean profile name without "The "
 */
export function explainMatch(wine, tasteProfile) {
  if (!tasteProfile?.palate || !wine) {
    return { headline: 'Take a quick taste profile to see your match.', axes: [], archetype: null }
  }
  const archetype = tasteProfile.name?.replace(/^The\s+/i, '') || 'palate'
  const p = tasteProfile.palate

  const axisInfo = [
    { key: 'body',      label: 'body',       w: wine.body,      u: p.body,      lo: 'lighter',     hi: 'fuller'  },
    { key: 'tannin',    label: 'tannins',    w: wine.tannin,    u: p.tannin,    lo: 'softer',      hi: 'firmer'  },
    { key: 'acidity',   label: 'acidity',    w: wine.acidity,   u: p.acidity,   lo: 'rounder',     hi: 'crisper' },
    { key: 'sweetness', label: 'sweetness',  w: wine.sweetness, u: p.sweetness, lo: 'drier',       hi: 'sweeter' },
  ]

  const aligned = []
  const off = []
  for (const a of axisInfo) {
    if (typeof a.w !== 'number' || typeof a.u !== 'number') continue
    const delta = Math.abs(a.w - a.u)
    if (delta <= 12) aligned.push(a)
    else if (delta >= 28) off.push({ ...a, delta, direction: a.w > a.u ? a.hi : a.lo })
  }

  const axes = []
  if (aligned.length) {
    axes.push(`Aligns on ${aligned.slice(0, 2).map(a => a.label).join(' & ')}.`)
  }
  if (off.length) {
    const top = off.sort((a, b) => b.delta - a.delta)[0]
    axes.push(`A touch ${top.direction} on ${top.label} than your usual.`)
  }

  // Character axis notes (delta ≥ 25)
  const charProfile = tasteProfile.character
  if (charProfile) {
    const charLabels = {
      earthiness: { hi: 'earthy wines', lo: 'clean, fruit-forward styles' },
      funk:       { hi: 'funky, wild-character wines', lo: 'clean, conventional styles' },
      mineral:    { hi: 'mineral-driven wines', lo: 'soft, fruit-forward styles' },
      oak:        { hi: 'oaky, toasty wines', lo: 'unoaked, clean styles' },
      floral:     { hi: 'floral, aromatic wines', lo: 'non-floral styles' },
    }
    const charNotes = {
      earthiness: { match: (n) => `You love earthy wines — this delivers it.`, mismatch: (n) => n > 50 ? `More earthy than your usual — forest floor character here.` : `Cleaner and more fruit-forward than you tend to prefer.` },
      funk:       { match: (n) => `The funky, wild character here is right in your wheelhouse.`, mismatch: (n) => n > 50 ? `More funky and barnyard-driven than you typically seek.` : `This is a cleaner, more conventional style than the funky wines you tend to prefer.` },
      mineral:    { match: (n) => `Mineral-driven — exactly the stony character you gravitate toward.`, mismatch: (n) => n > 50 ? `More mineral and flinty than your typical preference.` : `Softer and less mineral than you usually reach for.` },
      oak:        { match: (n) => `The oak treatment here — vanilla and toast — fits your palate.`, mismatch: (n) => n > 50 ? `More oaky and toasty than you tend to like.` : `Unoaked and leaner than your usual preference.` },
      floral:     { match: (n) => `The floral, aromatic lift here matches what you look for.`, mismatch: (n) => n > 50 ? `More floral and perfumed than you typically prefer.` : `Less aromatic and floral than you usually gravitate toward.` },
    }
    for (const axis of CHARACTER_AXES) {
      if (charProfile[axis] == null) continue
      const wineVal = wine[axis] != null ? wine[axis] : 50
      const delta = Math.abs(wineVal - charProfile[axis])
      if (delta < 25) continue
      const isMatch = (wineVal >= 50 && charProfile[axis] >= 60) || (wineVal <= 30 && charProfile[axis] <= 25)
      if (isMatch) {
        axes.push(charNotes[axis].match(wineVal))
      } else {
        axes.push(charNotes[axis].mismatch(wineVal))
      }
      break // one character note max
    }
  }

  let headline
  if (aligned.length >= 2 && off.length === 0) {
    headline = `A close fit for your ${archetype} palate.`
  } else if (aligned.length >= 1 && off.length <= 1) {
    headline = `Close to your ${archetype} palate, with one tweak.`
  } else if (off.length >= 2) {
    headline = `Different from your ${archetype} palate — try if you're exploring.`
  } else {
    headline = `Compared to your ${archetype} palate.`
  }

  return { headline, axes, archetype }
}

/**
 * The honest mirror of explainMatch — surfaces axis deltas where the wine
 * diverges from the user, framed as "skip if…" / "worth knowing" notes.
 *
 * Returns { headline, reasons, severity } where:
 *   headline — short framing line ("Honest take" / "Why you might skip")
 *   reasons  — array of { axis, severity, text } — sorted by severity desc
 *   severity — 'low' | 'medium' | 'high' | 'none' — overall divergence
 */
export function explainMismatch(wine, tasteProfile) {
  if (!tasteProfile?.palate || !wine) {
    return { headline: '', reasons: [], severity: 'none' }
  }

  const p = tasteProfile.palate
  const archetype = tasteProfile.name?.replace(/^The\s+/i, '') || 'palate'

  // Per-axis: phrasing for "wine is HIGHER than user" / "LOWER than user"
  const axisInfo = [
    {
      key: 'body', label: 'body',
      higher: 'this wine is fuller-bodied than what you typically reach for — expect more weight and richness on the palate',
      lower:  'this is lighter than your usual — it may feel thin if you came in expecting something bigger',
    },
    {
      key: 'tannin', label: 'tannin',
      higher: 'tannins are grippier than you tend to like — your mouth may feel dry and chalky, especially without food',
      lower:  'softer tannins than your usual picks — could feel flabby if you love that grippy structure',
    },
    {
      key: 'acidity', label: 'acidity',
      higher: 'noticeably crisper acidity than your norm — bright and zippy, can feel sharp on its own',
      lower:  'rounder acidity than you usually go for — might come across as flat or lacking lift',
    },
    {
      key: 'sweetness', label: 'sweetness',
      higher: 'this carries more residual sweetness than you typically prefer — there will be a noticeable sugar impression',
      lower:  'drier than your usual — if you reach for off-dry wines, this could feel austere',
    },
  ]

  const divergences = []
  for (const a of axisInfo) {
    const w = wine[a.key]
    const u = p[a.key]
    if (typeof w !== 'number' || typeof u !== 'number') continue
    const delta = w - u
    const abs = Math.abs(delta)
    if (abs < 18) continue // aligned enough — not worth surfacing

    let severity
    if (abs >= 40) severity = 'high'
    else if (abs >= 28) severity = 'medium'
    else severity = 'low'

    divergences.push({
      axis: a.label,
      severity,
      delta: abs,
      text: delta > 0 ? a.higher : a.lower,
    })
  }

  // Character axis divergences
  const charProfile = tasteProfile.character
  if (charProfile) {
    const charAxisInfo = {
      earthiness: {
        higher: 'this wine leans earthy — forest floor and mushroom notes you may not be looking for',
        lower:  'this is cleaner and more fruit-forward than the earthy style you tend to prefer',
      },
      funk: {
        higher: 'noticeable barnyard and brett character — more funky and wild than your usual preference',
        lower:  'this is a clean, conventional style — less of the funk and wild character you tend to seek',
      },
      mineral: {
        higher: 'stony and mineral-driven, more so than you typically prefer',
        lower:  'softer and less mineral than you usually reach for',
      },
      oak: {
        higher: 'noticeably oaky — vanilla and toast are front and center, more than your usual preference',
        lower:  'unoaked or lightly oaked — leaner than the toasty style you tend to prefer',
      },
      floral: {
        higher: 'strongly floral and aromatic — more perfumed than you usually go for',
        lower:  'less floral and aromatic than you tend to prefer',
      },
    }
    for (const axis of CHARACTER_AXES) {
      if (charProfile[axis] == null) continue
      const wineVal = wine[axis] != null ? wine[axis] : 50
      const delta = wineVal - charProfile[axis]
      const abs = Math.abs(delta)
      if (abs < 25) continue
      let severity
      if (abs >= 45) severity = 'high'
      else if (abs >= 32) severity = 'medium'
      else severity = 'low'
      divergences.push({
        axis,
        severity,
        delta: abs,
        text: delta > 0 ? charAxisInfo[axis].higher : charAxisInfo[axis].lower,
      })
    }
  }

  divergences.sort((a, b) => b.delta - a.delta)

  let severity = 'none'
  if (divergences.some(d => d.severity === 'high')) severity = 'high'
  else if (divergences.some(d => d.severity === 'medium')) severity = 'medium'
  else if (divergences.length) severity = 'low'

  let headline = ''
  if (severity === 'high') {
    headline = `Probably not your wine — meaningful differences from your ${archetype} palate.`
  } else if (severity === 'medium') {
    headline = `A stretch from your ${archetype} palate — go in eyes open.`
  } else if (severity === 'low') {
    headline = `Mostly aligned with your ${archetype} palate, with one minor caveat.`
  } else {
    headline = `Aligns well with your ${archetype} palate — nothing major to flag.`
  }

  return {
    headline,
    reasons: divergences.slice(0, 3),
    severity,
  }
}

// Maps raw Wine Enthusiast points (80–100) to a 0–100 quality score.
// 80→0, 84→20, 85→25, 89→45, 90→50, 94→70, 95→75, 100→100
// Returns 50 (unknown/neutral) when points is null/undefined.
export function pointsToQualityScore(points) {
  if (points == null) return 50
  return Math.max(0, Math.min(100, (points - 80) * 5))
}

// Classifies a wine as 'confident', 'closest', or 'stretch' based on both signals.
// confidenceLevel appears as a "Closest Available" pill in TwoSignalBars.
export function getConfidenceLevel(tasteFit, wePoints, tasteFitThreshold = 82, qualityWEThreshold = 90) {
  const goodFit     = typeof tasteFit === 'number' && tasteFit >= tasteFitThreshold
  const goodQuality = typeof wePoints === 'number' && wePoints >= qualityWEThreshold
  if (goodFit && goodQuality) return 'confident'
  if (!goodFit && !goodQuality) return 'stretch'
  return 'closest'
}
