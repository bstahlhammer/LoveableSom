// Body: ≤33 light, 34–66 medium, ≥67 full
// Sweetness: ≤15 bone dry, 16–30 dry, 31–50 off-dry, ≥51 sweet
// Tannin: ≤33 soft, 34–66 medium, ≥67 grippy
// Acidity: ≤33 round, 34–66 medium, ≥67 bright/crisp

const SHOP_WORDS = {
  body: {
    low:    ['light-bodied', 'delicate', 'elegant'],
    mid:    ['medium-bodied', 'balanced'],
    high:   ['full-bodied', 'bold', 'rich'],
  },
  sweetness: {
    low:    ['bone dry', 'dry', 'brut'],
    mid:    ['off-dry', 'semi-dry'],
    high:   ['sweet', 'demi-sec', 'off-dry'],
  },
  tannin: {
    low:    ['soft', 'smooth', 'low-tannin'],
    mid:    ['approachable', 'medium tannin'],
    high:   ['structured', 'grippy', 'tannic'],
  },
  acidity: {
    low:    ['round', 'soft', 'low-acid'],
    mid:    ['food-friendly', 'balanced'],
    high:   ['crisp', 'bright', 'mineral', 'high-acid'],
  },
}

function band(axis, value) {
  if (axis === 'body')      return value <= 33 ? 'low' : value <= 66 ? 'mid' : 'high'
  if (axis === 'sweetness') return value <= 30 ? 'low' : value <= 50 ? 'mid' : 'high'
  if (axis === 'tannin')    return value <= 33 ? 'low' : value <= 66 ? 'mid' : 'high'
  if (axis === 'acidity')   return value <= 33 ? 'low' : value <= 66 ? 'mid' : 'high'
  return 'mid'
}

function describe(axis, value) {
  const b = band(axis, value)
  if (axis === 'body')      return b === 'low' ? 'light' : b === 'mid' ? 'medium-bodied' : 'full-bodied'
  if (axis === 'sweetness') return value <= 15 ? 'bone dry' : value <= 30 ? 'dry' : value <= 50 ? 'off-dry' : 'sweet'
  if (axis === 'tannin')    return b === 'low' ? 'soft' : b === 'mid' ? 'medium-tannin' : 'grippy'
  if (axis === 'acidity')   return b === 'low' ? 'round' : b === 'mid' ? 'medium acidity' : 'bright and crisp'
  return ''
}

export function describePalate(palate) {
  if (!palate) return null

  const { body = 50, sweetness = 30, tannin = 40, acidity = 55 } = palate

  const axes = [
    { key: 'body',      value: body },
    { key: 'sweetness', value: sweetness },
    { key: 'tannin',    value: tannin },
    { key: 'acidity',   value: acidity },
  ]

  const allNearMid = axes.every(a => Math.abs(a.value - 50) < 12)

  if (allNearMid) {
    return {
      headline: "You're drawn to balanced, food-friendly wines that work in almost any situation.",
      sentences: [
        "Your palate sits comfortably in the middle — not seeking extremes in any direction. That's actually rare, and it means you can enjoy a wider range of wines than most.",
        "Wines that are food-friendly, well-integrated, and not trying too hard are your sweet spot.",
      ],
      shopWords: ['balanced', 'food-friendly', 'medium-bodied', 'versatile'],
      profileConf: null,
    }
  }

  const sorted = [...axes].sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50))
  const lead = sorted[0]
  const second = sorted[1]

  // Build headline from the 1-2 strongest axes
  let headline = ''
  const bodyBand = band('body', body)
  const acidBand = band('acidity', acidity)
  const tanninBand = band('tannin', tannin)
  const sweetBand = band('sweetness', sweetness)

  if (lead.key === 'acidity' && lead.value >= 67) {
    headline = bodyBand === 'low'
      ? "You like wines that feel light, crisp, and clean."
      : "You gravitate toward wines with brightness and a fresh, mouthwatering finish."
  } else if (lead.key === 'body' && lead.value >= 67) {
    headline = tanninBand === 'high'
      ? "You're drawn to bold, structured reds that feel powerful and age-worthy."
      : "You like wines with presence — full-bodied and generous without being harsh."
  } else if (lead.key === 'body' && lead.value <= 33) {
    headline = acidBand === 'high'
      ? "You like wines that are light, electric, and refreshing."
      : "You prefer elegant, lighter wines over heavy, extracted styles."
  } else if (lead.key === 'tannin' && lead.value >= 67) {
    headline = "You appreciate grip and structure — wines that feel serious and built to last."
  } else if (lead.key === 'tannin' && lead.value <= 33) {
    headline = "You like wines that are silky and smooth — no rough edges."
  } else if (lead.key === 'sweetness' && lead.value <= 15) {
    headline = "You drink bone-dry. Sweetness in wine is something you actively avoid."
  } else if (lead.key === 'sweetness' && lead.value >= 51) {
    headline = "You have an appreciation for wines with some sweetness — not a flaw, a preference."
  } else {
    headline = `You like wines that are ${describe(lead.key, lead.value)}.`
  }

  // Build 2-3 explanatory sentences
  const sentences = []

  // Body sentence
  if (body <= 33) {
    sentences.push("You prefer wines on the lighter side — they feel less filling, more refreshing, and you can drink them through a meal without them overwhelming the food.")
  } else if (body >= 67) {
    sentences.push("You like wines with weight and presence — something you can feel in the glass. Full-bodied wines coat the palate and tend to pair best with rich, hearty food.")
  }

  // Acidity sentence
  if (acidity >= 67) {
    sentences.push("That mouth-watering quality you love — the zing that makes you want another sip — is acidity. High-acid wines feel lively and refreshing, and they're exceptional with food.")
  } else if (acidity <= 33) {
    sentences.push("You prefer wines that feel round and soft rather than sharp. Lower acidity makes a wine feel smoother and less piercing on the palate.")
  }

  // Tannin sentence (only for meaningful signal)
  if (tannin >= 67) {
    sentences.push("The dry, slightly grippy sensation you get from a big red — like strong black tea — is tannin. You're comfortable with that sensation; it means you can handle wines that need time to open up.")
  } else if (tannin <= 25) {
    sentences.push("You prefer wines with little to no tannin — smooth, silky reds and any whites. When a wine feels rough or drying, that's tannin doing things you don't enjoy.")
  }

  // Sweetness sentence (only if meaningful)
  if (sweetness <= 15) {
    sentences.push("You like bone-dry wines. Even a hint of residual sweetness feels out of place to you. In a restaurant, 'dry' and 'brut' are your keywords.")
  } else if (sweetness >= 51) {
    sentences.push("You enjoy a bit of sweetness in wine — that's not a beginner preference, it's just a preference. Riesling Spätlese, Vouvray demi-sec, and off-dry Gewürztraminer are in your wheelhouse.")
  }

  // Food pairing addition
  if (body >= 67 && tannin >= 60) {
    sentences.push("Wines with this profile need something to hold onto — a steak, a lamb chop, or aged cheese helps tame the structure and makes everything taste better.")
  } else if (body <= 33 && acidity >= 60) {
    sentences.push("Wines with this profile are extraordinarily versatile — they work as an aperitif, with fish, with salads, or just on their own.")
  }

  // Collect shop words
  const shopSet = new Set()
  for (const { key, value: v } of axes) {
    const b = band(key, v)
    if (b !== 'mid' || key === 'acidity') {
      for (const w of SHOP_WORDS[key][b]) shopSet.add(w)
    }
  }
  const shopWords = [...shopSet].slice(0, 6)

  return {
    headline,
    sentences: sentences.slice(0, 4),
    shopWords,
  }
}
