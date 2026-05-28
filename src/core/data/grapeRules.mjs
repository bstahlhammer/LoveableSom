/**
 * Grape variety → palate axes + color
 *
 * Values are 0-100 baseline averages. The ingest script applies
 * description-keyword adjustments on top of these.
 *
 * Axes:
 *   body      — 0=very light, 100=very full
 *   tannin    — 0=silky, 100=very grippy
 *   sweetness — 0=bone dry, 100=very sweet
 *   acidity   — 0=flat, 100=razor crisp
 *   color     — 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert'
 */

export const GRAPE_RULES = {
  // ── Red grapes ────────────────────────────────────────────────────────────
  'Cabernet Sauvignon':           { body:82, tannin:75, sweetness:15, acidity:55, color:'red' },
  'Merlot':                       { body:72, tannin:55, sweetness:20, acidity:50, color:'red' },
  'Pinot Noir':                   { body:48, tannin:33, sweetness:14, acidity:72, color:'red' },
  'Syrah':                        { body:83, tannin:70, sweetness:14, acidity:58, color:'red' },
  'Shiraz':                       { body:83, tannin:70, sweetness:14, acidity:58, color:'red' },
  'Malbec':                       { body:82, tannin:68, sweetness:14, acidity:60, color:'red' },
  'Zinfandel':                    { body:80, tannin:62, sweetness:22, acidity:62, color:'red' },
  'Sangiovese':                   { body:70, tannin:70, sweetness:11, acidity:70, color:'red' },
  'Tempranillo':                  { body:74, tannin:68, sweetness:12, acidity:62, color:'red' },
  'Grenache':                     { body:70, tannin:45, sweetness:18, acidity:58, color:'red' },
  'Garnacha':                     { body:70, tannin:45, sweetness:18, acidity:58, color:'red' },
  'Nebbiolo':                     { body:80, tannin:85, sweetness:10, acidity:72, color:'red' },
  'Barbera':                      { body:60, tannin:44, sweetness:12, acidity:78, color:'red' },
  'Gamay':                        { body:42, tannin:28, sweetness:13, acidity:72, color:'red' },
  'Cabernet Franc':               { body:68, tannin:65, sweetness:12, acidity:65, color:'red' },
  'Mourvèdre':                    { body:85, tannin:78, sweetness:11, acidity:60, color:'red' },
  'Petit Verdot':                 { body:85, tannin:82, sweetness:10, acidity:62, color:'red' },
  'Carménère':                    { body:74, tannin:68, sweetness:13, acidity:60, color:'red' },
  'Pinotage':                     { body:76, tannin:60, sweetness:14, acidity:60, color:'red' },
  'Touriga Nacional':             { body:85, tannin:84, sweetness:10, acidity:65, color:'red' },
  'Petite Sirah':                 { body:88, tannin:82, sweetness:12, acidity:60, color:'red' },
  'Aglianico':                    { body:82, tannin:82, sweetness:10, acidity:70, color:'red' },
  'Nero d\'Avola':                { body:80, tannin:68, sweetness:12, acidity:62, color:'red' },
  'Montepulciano':                { body:74, tannin:64, sweetness:12, acidity:68, color:'red' },
  'Corvina':                      { body:65, tannin:60, sweetness:12, acidity:68, color:'red' },
  'Dolcetto':                     { body:58, tannin:52, sweetness:14, acidity:68, color:'red' },
  'Lagrein':                      { body:78, tannin:72, sweetness:12, acidity:64, color:'red' },
  'Blaufränkisch':                { body:72, tannin:68, sweetness:12, acidity:68, color:'red' },
  'Zweigelt':                     { body:62, tannin:52, sweetness:14, acidity:65, color:'red' },
  'Tannat':                       { body:88, tannin:88, sweetness:10, acidity:65, color:'red' },
  'Monastrell':                   { body:84, tannin:74, sweetness:14, acidity:58, color:'red' },
  'Primitivo':                    { body:82, tannin:65, sweetness:20, acidity:62, color:'red' },
  'Sagrantino':                   { body:85, tannin:90, sweetness:10, acidity:68, color:'red' },
  'Xinomavro':                    { body:75, tannin:80, sweetness:10, acidity:72, color:'red' },
  'Mencía':                       { body:65, tannin:60, sweetness:12, acidity:68, color:'red' },
  'Nerello Mascalese':            { body:65, tannin:65, sweetness:10, acidity:72, color:'red' },

  // ── Red blends (Kaggle names) ─────────────────────────────────────────────
  'Bordeaux-style Red Blend':     { body:80, tannin:72, sweetness:14, acidity:58, color:'red' },
  'Rhône-style Red Blend':        { body:78, tannin:65, sweetness:15, acidity:60, color:'red' },
  'Red Blend':                    { body:72, tannin:60, sweetness:18, acidity:58, color:'red' },
  'GSM':                          { body:74, tannin:58, sweetness:16, acidity:60, color:'red' },
  'Meritage':                     { body:80, tannin:72, sweetness:14, acidity:58, color:'red' },
  'Portuguese Red':               { body:78, tannin:72, sweetness:12, acidity:64, color:'red' },
  'Italian Red Blend':            { body:72, tannin:68, sweetness:12, acidity:68, color:'red' },
  'Spanish Red Blend':            { body:76, tannin:68, sweetness:12, acidity:62, color:'red' },

  // ── White grapes ──────────────────────────────────────────────────────────
  'Chardonnay':                   { body:60, tannin:6,  sweetness:18, acidity:58, color:'white' },
  'Sauvignon Blanc':              { body:38, tannin:3,  sweetness:10, acidity:80, color:'white' },
  'Riesling':                     { body:32, tannin:2,  sweetness:42, acidity:82, color:'white' },
  'Pinot Grigio':                 { body:38, tannin:3,  sweetness:10, acidity:68, color:'white' },
  'Pinot Gris':                   { body:45, tannin:4,  sweetness:18, acidity:65, color:'white' },
  'Gewürztraminer':               { body:52, tannin:3,  sweetness:36, acidity:52, color:'white' },
  'Viognier':                     { body:58, tannin:4,  sweetness:22, acidity:50, color:'white' },
  'Albariño':                     { body:38, tannin:3,  sweetness:10, acidity:78, color:'white' },
  'Grüner Veltliner':             { body:42, tannin:4,  sweetness:10, acidity:78, color:'white' },
  'Chenin Blanc':                 { body:44, tannin:3,  sweetness:30, acidity:76, color:'white' },
  'Muscat':                       { body:30, tannin:2,  sweetness:70, acidity:58, color:'white' },
  'Moscato':                      { body:28, tannin:2,  sweetness:75, acidity:56, color:'white' },
  'Muscat Blanc à Petits Grains': { body:28, tannin:2,  sweetness:75, acidity:56, color:'white' },
  'Vermentino':                   { body:40, tannin:3,  sweetness:10, acidity:72, color:'white' },
  'Verdejo':                      { body:40, tannin:3,  sweetness:10, acidity:75, color:'white' },
  'Torrontés':                    { body:38, tannin:2,  sweetness:18, acidity:68, color:'white' },
  'Viura':                        { body:38, tannin:3,  sweetness:10, acidity:72, color:'white' },
  'Marsanne':                     { body:55, tannin:4,  sweetness:14, acidity:52, color:'white' },
  'Roussanne':                    { body:52, tannin:4,  sweetness:14, acidity:60, color:'white' },
  'Cortese':                      { body:36, tannin:3,  sweetness:10, acidity:75, color:'white' },
  'Falanghina':                   { body:42, tannin:3,  sweetness:12, acidity:72, color:'white' },
  'Fiano':                        { body:44, tannin:4,  sweetness:12, acidity:70, color:'white' },
  'Greco':                        { body:44, tannin:4,  sweetness:12, acidity:72, color:'white' },
  'Verdicchio':                   { body:40, tannin:3,  sweetness:10, acidity:74, color:'white' },
  'Arneis':                       { body:38, tannin:3,  sweetness:10, acidity:68, color:'white' },
  'Soave':                        { body:40, tannin:3,  sweetness:12, acidity:68, color:'white' },
  'Garganega':                    { body:40, tannin:3,  sweetness:12, acidity:68, color:'white' },
  'Friulano':                     { body:44, tannin:4,  sweetness:10, acidity:70, color:'white' },
  'Malvasia':                     { body:42, tannin:3,  sweetness:22, acidity:62, color:'white' },
  'Trebbiano':                    { body:38, tannin:3,  sweetness:10, acidity:70, color:'white' },
  'Catarratto':                   { body:38, tannin:3,  sweetness:10, acidity:68, color:'white' },
  'Pecorino':                     { body:44, tannin:4,  sweetness:12, acidity:74, color:'white' },
  'Assyrtiko':                    { body:44, tannin:4,  sweetness:10, acidity:82, color:'white' },
  'Malagousia':                   { body:42, tannin:3,  sweetness:14, acidity:68, color:'white' },
  'Semillon':                     { body:52, tannin:4,  sweetness:16, acidity:60, color:'white' },
  'Muscadet':                     { body:34, tannin:3,  sweetness:8,  acidity:74, color:'white' },
  'Melon':                        { body:34, tannin:3,  sweetness:8,  acidity:74, color:'white' },
  'Silvaner':                     { body:40, tannin:3,  sweetness:12, acidity:68, color:'white' },
  'Müller-Thurgau':               { body:36, tannin:2,  sweetness:20, acidity:65, color:'white' },
  'Scheurebe':                    { body:42, tannin:3,  sweetness:30, acidity:72, color:'white' },
  'Tempranillo Blanco':           { body:42, tannin:4,  sweetness:12, acidity:68, color:'white' },

  // ── White blends ──────────────────────────────────────────────────────────
  'Bordeaux-style White Blend':   { body:48, tannin:4,  sweetness:12, acidity:68, color:'white' },
  'Rhône-style White Blend':      { body:52, tannin:4,  sweetness:16, acidity:58, color:'white' },
  'White Blend':                  { body:44, tannin:3,  sweetness:16, acidity:66, color:'white' },
  'Portuguese White':             { body:40, tannin:3,  sweetness:12, acidity:68, color:'white' },
  'Austrian White Blend':         { body:44, tannin:4,  sweetness:14, acidity:72, color:'white' },

  // ── Rosé ──────────────────────────────────────────────────────────────────
  'Rosé':                         { body:36, tannin:12, sweetness:12, acidity:68, color:'rosé' },
  'Grenache Rosé':                { body:38, tannin:12, sweetness:12, acidity:68, color:'rosé' },
  'Pinot Noir Rosé':              { body:34, tannin:10, sweetness:12, acidity:68, color:'rosé' },
  'Syrah Rosé':                   { body:40, tannin:14, sweetness:12, acidity:65, color:'rosé' },
  'Rosado':                       { body:36, tannin:12, sweetness:12, acidity:65, color:'rosé' },
  'Rosato':                       { body:36, tannin:12, sweetness:12, acidity:65, color:'rosé' },
  'Provence-style Rosé':          { body:35, tannin:10, sweetness:10, acidity:68, color:'rosé' },

  // ── Sparkling ─────────────────────────────────────────────────────────────
  'Champagne Blend':              { body:42, tannin:6,  sweetness:15, acidity:82, color:'sparkling' },
  'Sparkling Blend':              { body:38, tannin:5,  sweetness:18, acidity:76, color:'sparkling' },
  'Prosecco':                     { body:32, tannin:3,  sweetness:22, acidity:72, color:'sparkling' },
  'Glera':                        { body:32, tannin:3,  sweetness:22, acidity:72, color:'sparkling' },
  'Cava':                         { body:38, tannin:5,  sweetness:14, acidity:76, color:'sparkling' },
  'Crémant':                      { body:38, tannin:5,  sweetness:16, acidity:76, color:'sparkling' },
  'Sparkling Riesling':           { body:30, tannin:2,  sweetness:28, acidity:80, color:'sparkling' },
  'Cava Blend':                   { body:38, tannin:5,  sweetness:14, acidity:76, color:'sparkling' },

  // ── Dessert / fortified ───────────────────────────────────────────────────
  'Port':                         { body:85, tannin:65, sweetness:82, acidity:55, color:'dessert' },
  'Tawny':                        { body:78, tannin:50, sweetness:78, acidity:52, color:'dessert' },
  'Sherry':                       { body:65, tannin:20, sweetness:60, acidity:68, color:'dessert' },
  'Sauternes':                    { body:70, tannin:5,  sweetness:88, acidity:62, color:'dessert' },
  'Late Harvest Riesling':        { body:35, tannin:2,  sweetness:82, acidity:80, color:'dessert' },
  'Late Harvest':                 { body:45, tannin:4,  sweetness:80, acidity:68, color:'dessert' },
  'Ice Wine':                     { body:38, tannin:3,  sweetness:90, acidity:75, color:'dessert' },
  'Eiswein':                      { body:38, tannin:3,  sweetness:90, acidity:75, color:'dessert' },
  'Passito':                      { body:70, tannin:30, sweetness:82, acidity:58, color:'dessert' },
  'Vin Santo':                    { body:65, tannin:20, sweetness:75, acidity:60, color:'dessert' },
  'Madeira':                      { body:70, tannin:20, sweetness:65, acidity:70, color:'dessert' },
}

// Defaults when variety is unknown — keyed by detected color
export const COLOR_DEFAULTS = {
  red:      { body:72, tannin:60, sweetness:15, acidity:60 },
  white:    { body:44, tannin:4,  sweetness:16, acidity:68 },
  rosé:     { body:36, tannin:12, sweetness:12, acidity:68 },
  sparkling:{ body:38, tannin:5,  sweetness:18, acidity:76 },
  dessert:  { body:55, tannin:20, sweetness:78, acidity:62 },
}

/**
 * Detect wine color from variety string when not in GRAPE_RULES.
 */
export function detectColor(variety = '') {
  const v = variety.toLowerCase()
  if (/ros[eéà]|rosato|rosado|blush/i.test(v))                   return 'rosé'
  if (/champagne|sparkling|prosecco|cava|crémant|pétillant|spumante|sekt|fizz|glera/i.test(v)) return 'sparkling'
  if (/port|sherry|madeira|sauternes|late harvest|ice wine|eiswein|passito|vin santo|tawny|muscat.*dessert/i.test(v)) return 'dessert'
  if (/blanc|grigio|gris|chardonnay|riesling|sauvignon blanc|viognier|gewurz|moscato|muscat|pinot bianco|trebbiano|white|bianco/i.test(v)) return 'white'
  return 'red'
}

/**
 * Adjust axes based on keywords found in the tasting description.
 * These tweaks are intentionally small — the variety baseline is authoritative.
 */
export function descriptionAdjustments(description = '') {
  const d = description.toLowerCase()
  let body = 0, tannin = 0, sweetness = 0, acidity = 0

  // Body clues
  if (/full[- ]bod|rich|opulent|weighty|dense|concentrated/.test(d)) body += 8
  if (/light[- ]bod|delicate|ethereal|gossamer|thin/.test(d)) body -= 8
  if (/medium[- ]bod/.test(d)) body += 0

  // Tannin clues
  if (/grippy|firm tannin|chewy|astringent|structured|grippy|muscular/.test(d)) tannin += 8
  if (/silky|smooth|velvety|supple|soft tannin/.test(d)) tannin -= 8
  if (/tannic/.test(d)) tannin += 6

  // Sweetness clues
  if (/sweet|off-dry|residual sugar|honeyed|luscious|dessert-like/.test(d)) sweetness += 12
  if (/bone dry|very dry|dry finish/.test(d)) sweetness -= 10
  if (/dry/.test(d) && !/dry finish|sundry|laundry/.test(d)) sweetness -= 5

  // Acidity clues
  if (/crisp|bright|vibrant|zesty|lively|racy|electric|piercing acidity/.test(d)) acidity += 8
  if (/round|flat|low acid|soft acid/.test(d)) acidity -= 8
  if (/refreshing|tart/.test(d)) acidity += 5

  return { body, tannin, sweetness, acidity }
}

/**
 * Get palate axes for a wine, given its variety and description.
 */
export function inferAxes(variety = '', description = '') {
  const rules = GRAPE_RULES[variety]
  const color = rules?.color ?? detectColor(variety)
  const base  = rules ?? { ...COLOR_DEFAULTS[color] }

  const adj = descriptionAdjustments(description)

  return {
    body:      Math.max(0, Math.min(100, base.body      + adj.body)),
    tannin:    Math.max(0, Math.min(100, base.tannin    + adj.tannin)),
    sweetness: Math.max(0, Math.min(100, base.sweetness + adj.sweetness)),
    acidity:   Math.max(0, Math.min(100, base.acidity   + adj.acidity)),
    color,
  }
}
