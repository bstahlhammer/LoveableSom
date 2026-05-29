/**
 * wine-image-sources.mjs
 *
 * For each wine, paste the direct image URL you found (from Total Wine,
 * Wine.com, the winery's own site, etc.).  Leave url as null to skip.
 *
 * Finding the right URL:
 *   1. Open the product page in your browser.
 *   2. Right-click the bottle photo → "Copy image address".
 *   3. Paste it as the url below.
 *
 * After filling in URLs, run:
 *   node upload-wine-images-v2.mjs
 */

export const SOURCES = [
  // ── California Reds ──────────────────────────────────────────────
  { id:  1, name: 'Caymus Cabernet Sauvignon',                       url: null },
  { id:  2, name: "Stag's Leap Artemis Cabernet",                    url: null },
  { id:  3, name: 'Silver Oak Cabernet Sauvignon',                   url: null },
  { id:  4, name: 'Jordan Cabernet Sauvignon',                       url: null },
  { id:  5, name: 'Duckhorn Cabernet Sauvignon',                     url: null },
  { id:  6, name: 'Daou Cabernet Sauvignon',                         url: null },
  { id:  7, name: 'Josh Cellars Cabernet Sauvignon',                 url: null },
  { id:  8, name: 'Meiomi Pinot Noir',                               url: null },
  { id:  9, name: 'La Crema Pinot Noir',                             url: null },
  { id: 10, name: 'Belle Glos Clark & Telephone Pinot Noir',         url: null },
  { id: 11, name: 'The Prisoner Red Blend',                          url: null },
  { id: 12, name: 'Apothic Red',                                     url: null },
  { id: 13, name: 'Ridge Geyserville',                               url: null },
  { id: 14, name: 'Seven Deadly Zins Old Vine Zinfandel',            url: null },

  // ── California Whites ────────────────────────────────────────────
  { id: 15, name: 'Rombauer Chardonnay',                             url: null },
  { id: 16, name: "Kendall-Jackson Vintner's Reserve Chardonnay",    url: null },
  { id: 17, name: 'Sonoma-Cutrer Russian River Ranches Chardonnay',  url: null },
  { id: 18, name: 'La Crema Chardonnay',                             url: null },
  { id: 19, name: 'Josh Cellars Chardonnay',                         url: null },
  { id: 20, name: 'Cakebread Cellars Chardonnay',                    url: null },
  { id: 21, name: 'Kim Crawford Sauvignon Blanc',                    url: null },
  { id: 22, name: 'Duckhorn Vineyards Sauvignon Blanc',              url: null },

  // ── Italian ──────────────────────────────────────────────────────
  { id: 23, name: 'Antinori Tignanello',                             url: null },
  { id: 24, name: 'Banfi Brunello di Montalcino',                    url: null },
  { id: 25, name: 'Ruffino Chianti Classico Riserva',                url: null },
  { id: 26, name: 'Santa Margherita Pinot Grigio',                   url: null },
  { id: 27, name: 'Meiomi Moscato',                                  url: null },
  { id: 28, name: "Marchesi de' Frescobaldi Nipozzano Chianti Riserva", url: null },
  { id: 29, name: 'Gabbiano Chianti',                                url: null },
  { id: 30, name: "Bartenura Moscato d'Asti",                        url: null },

  // ── French ───────────────────────────────────────────────────────
  { id: 31, name: 'Louis Jadot Beaujolais-Villages',                 url: null },
  { id: 32, name: 'Whispering Angel Rosé',                           url: null },
  { id: 33, name: 'Meiomi Rosé',                                     url: null },
  { id: 34, name: 'Château Ste. Michelle Riesling',                  url: null },
  { id: 35, name: 'Trimbach Riesling',                               url: null },
  { id: 36, name: "Bouchard Père & Fils Mâcon-Villages Chardonnay",  url: null },

  // ── Spanish ──────────────────────────────────────────────────────
  { id: 37, name: 'Muga Rioja Reserva',                              url: null },
  { id: 38, name: 'Bodegas Lan Rioja Crianza',                       url: null },
  { id: 39, name: 'Cune (CVNE) Monopole White Rioja',                url: null },
  { id: 40, name: 'Torres Gran Sangre de Toro',                      url: null },

  // ── Argentine ────────────────────────────────────────────────────
  { id: 41, name: 'Catena Zapata Adrianna Vineyard Malbec',          url: null },
  { id: 42, name: 'Zuccardi Valle de Uco Malbec',                    url: null },
  { id: 43, name: 'Achaval Ferrer Malbec',                           url: null },
  { id: 44, name: 'Clos de los Siete',                               url: null },

  // ── Australian & New Zealand ─────────────────────────────────────
  { id: 45, name: 'Penfolds Grange',                                 url: null },
  { id: 46, name: 'Penfolds Bin 28 Kalimna Shiraz',                  url: null },
  { id: 47, name: 'The Walking Dead Shiraz',                         url: null },
  { id: 48, name: 'Cloudy Bay Sauvignon Blanc',                      url: null },

  // ── Crowd-pleasing Values ────────────────────────────────────────
  { id: 49, name: 'Barefoot Bubbly Brut Rosé',                       url: null },
  { id: 50, name: 'Layer Cake Malbec',                               url: null },
]
