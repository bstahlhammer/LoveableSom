/**
 * Calls the live /api/wine-image endpoint for all 50 mock wines and collects
 * the resulting image URLs so we can hard-code them in wineImages.js.
 *
 * Run: node fetch-wine-images.mjs
 */

const BASE = 'https://uncork.bstahlhammer.workers.dev'

const WINES = [
  { id: 1,  name: 'Caymus Cabernet Sauvignon' },
  { id: 2,  name: "Stag's Leap Artemis Cabernet" },
  { id: 3,  name: 'Silver Oak Cabernet Sauvignon' },
  { id: 4,  name: 'Jordan Cabernet Sauvignon' },
  { id: 5,  name: 'Duckhorn Cabernet Sauvignon' },
  { id: 6,  name: 'Daou Cabernet Sauvignon' },
  { id: 7,  name: 'Josh Cellars Cabernet Sauvignon' },
  { id: 8,  name: 'Meiomi Pinot Noir' },
  { id: 9,  name: 'La Crema Pinot Noir' },
  { id: 10, name: 'Belle Glos Clark & Telephone Pinot Noir' },
  { id: 11, name: 'The Prisoner Red Blend' },
  { id: 12, name: 'Apothic Red' },
  { id: 13, name: 'Ridge Geyserville' },
  { id: 14, name: 'Seven Deadly Zins Old Vine Zinfandel' },
  { id: 15, name: 'Rombauer Chardonnay' },
  { id: 16, name: "Kendall-Jackson Vintner's Reserve Chardonnay" },
  { id: 17, name: 'Sonoma-Cutrer Russian River Ranches Chardonnay' },
  { id: 18, name: 'La Crema Chardonnay' },
  { id: 19, name: 'Josh Cellars Chardonnay' },
  { id: 20, name: 'Cakebread Cellars Chardonnay' },
  { id: 21, name: 'Kim Crawford Sauvignon Blanc' },
  { id: 22, name: 'Duckhorn Vineyards Sauvignon Blanc' },
  { id: 23, name: 'Antinori Tignanello' },
  { id: 24, name: 'Banfi Brunello di Montalcino' },
  { id: 25, name: 'Ruffino Chianti Classico Riserva' },
  { id: 26, name: 'Santa Margherita Pinot Grigio' },
  { id: 27, name: 'Meiomi Moscato' },
  { id: 28, name: "Marchesi de' Frescobaldi Nipozzano Chianti Riserva" },
  { id: 29, name: 'Gabbiano Chianti' },
  { id: 30, name: "Bartenura Moscato d'Asti" },
  { id: 31, name: 'Louis Jadot Beaujolais-Villages' },
  { id: 32, name: 'Whispering Angel Rosé' },
  { id: 33, name: 'Meiomi Rosé' },
  { id: 34, name: 'Château Ste. Michelle Riesling' },
  { id: 35, name: 'Trimbach Riesling' },
  { id: 36, name: 'Bouchard Père & Fils Mâcon-Villages Chardonnay' },
  { id: 37, name: 'Muga Rioja Reserva' },
  { id: 38, name: 'Bodegas Lan Rioja Crianza' },
  { id: 39, name: 'Cune (CVNE) Monopole White Rioja' },
  { id: 40, name: 'Torres Gran Sangre de Toro' },
  { id: 41, name: 'Catena Zapata Adrianna Vineyard Malbec' },
  { id: 42, name: 'Zuccardi Valle de Uco Malbec' },
  { id: 43, name: 'Achaval Ferrer Malbec' },
  { id: 44, name: 'Clos de los Siete' },
  { id: 45, name: 'Penfolds Grange' },
  { id: 46, name: 'Penfolds Bin 28 Kalimna Shiraz' },
  { id: 47, name: 'The Walking Dead Shiraz' },
  { id: 48, name: 'Cloudy Bay Sauvignon Blanc' },
  { id: 49, name: 'Barefoot Bubbly Brut Rosé' },
  { id: 50, name: 'Layer Cake Malbec' },
]

async function fetchImage(wine) {
  const url = `${BASE}/api/wine-image?name=${encodeURIComponent(wine.name)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return data.imageUrl || null
  } catch {
    return null
  }
}

// Process in batches of 5 to avoid hammering the API
async function runBatch(wines) {
  const results = {}
  for (let i = 0; i < wines.length; i += 5) {
    const batch = wines.slice(i, i + 5)
    console.error(`Fetching batch ${Math.floor(i/5)+1}/${Math.ceil(wines.length/5)}: ${batch.map(w => w.name).join(', ')}`)
    const urls = await Promise.all(batch.map(fetchImage))
    batch.forEach((w, idx) => {
      results[w.id] = urls[idx]
      console.error(`  id:${w.id} ${w.name} → ${urls[idx] ? '✓' : '✗ null'}`)
    })
    if (i + 5 < wines.length) await new Promise(r => setTimeout(r, 1000))
  }
  return results
}

const results = await runBatch(WINES)

// Output as wineImages.js
const lines = Object.entries(results)
  .filter(([, url]) => url)
  .map(([id, url]) => `  ${id}: '${url}',`)

console.log('export const WINE_IMAGES = {')
console.log(lines.join('\n'))
console.log('}')

// Summary
const found = Object.values(results).filter(Boolean).length
console.error(`\nDone: ${found}/${WINES.length} images found`)
