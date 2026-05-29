/**
 * download-wine-images.mjs
 *
 * Fetches wine bottle images from Vivino's search API and uploads them
 * to the uncork-labels R2 bucket.
 *
 * Run from the project root:
 *   node download-wine-images.mjs
 *
 * Requires Node 18+ (built-in fetch). Wrangler must be authenticated.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { execSync } from 'child_process'

const R2_BUCKET = 'uncork-labels'
const R2_BASE   = 'https://pub-03b10c2b0da74dc9afff31dc20d58313.r2.dev/labels'
const OUT_DIR   = 'wine-images'

const WINES = [
  { id:  1, q: 'Caymus Cabernet Sauvignon 2022' },
  { id:  2, q: "Stag's Leap Artemis Cabernet Sauvignon 2021" },
  { id:  3, q: 'Silver Oak Alexander Valley Cabernet Sauvignon 2019' },
  { id:  4, q: 'Jordan Cabernet Sauvignon Alexander Valley 2019' },
  { id:  5, q: 'Duckhorn Napa Valley Cabernet Sauvignon 2021' },
  { id:  6, q: 'Daou Cabernet Sauvignon Paso Robles 2022' },
  { id:  7, q: 'Josh Cellars Cabernet Sauvignon 2022' },
  { id:  8, q: 'Meiomi Pinot Noir 2022' },
  { id:  9, q: 'La Crema Sonoma Coast Pinot Noir 2022' },
  { id: 10, q: 'Belle Glos Clark Telephone Pinot Noir 2022' },
  { id: 11, q: 'The Prisoner Red Blend 2022' },
  { id: 12, q: 'Apothic Red 2022' },
  { id: 13, q: 'Ridge Geyserville 2021' },
  { id: 14, q: 'Seven Deadly Zins Old Vine Zinfandel 2021' },
  { id: 15, q: 'Rombauer Chardonnay Carneros 2022' },
  { id: 16, q: 'Kendall-Jackson Vintner Reserve Chardonnay 2022' },
  { id: 17, q: 'Sonoma-Cutrer Russian River Ranches Chardonnay 2022' },
  { id: 18, q: 'La Crema Sonoma Coast Chardonnay 2022' },
  { id: 19, q: 'Josh Cellars Chardonnay 2022' },
  { id: 20, q: 'Cakebread Cellars Chardonnay Napa Valley 2022' },
  { id: 21, q: 'Kim Crawford Marlborough Sauvignon Blanc 2023' },
  { id: 22, q: 'Duckhorn Vineyards Sauvignon Blanc Napa Valley 2023' },
  { id: 23, q: 'Antinori Tignanello 2020' },
  { id: 24, q: 'Banfi Brunello di Montalcino 2018' },
  { id: 25, q: 'Ruffino Chianti Classico Riserva 2020' },
  { id: 26, q: 'Santa Margherita Pinot Grigio Alto Adige 2023' },
  { id: 27, q: 'Meiomi Moscato 2023' },
  { id: 28, q: 'Frescobaldi Nipozzano Chianti Riserva 2019' },
  { id: 29, q: 'Gabbiano Chianti 2022' },
  { id: 30, q: "Bartenura Moscato d'Asti 2023" },
  { id: 31, q: 'Louis Jadot Beaujolais-Villages 2022' },
  { id: 32, q: 'Whispering Angel Rose Provence 2023' },
  { id: 33, q: 'Meiomi Rose 2023' },
  { id: 34, q: 'Chateau Ste Michelle Riesling Columbia Valley 2022' },
  { id: 35, q: 'Trimbach Riesling Alsace 2020' },
  { id: 36, q: 'Bouchard Pere Fils Macon-Villages Chardonnay 2022' },
  { id: 37, q: 'Muga Rioja Reserva 2019' },
  { id: 38, q: 'Bodegas Lan Rioja Crianza 2020' },
  { id: 39, q: 'CVNE Monopole White Rioja 2022' },
  { id: 40, q: 'Torres Gran Sangre de Toro 2020' },
  { id: 41, q: 'Catena Zapata Adrianna Vineyard Malbec 2020' },
  { id: 42, q: 'Zuccardi Valle de Uco Malbec 2021' },
  { id: 43, q: 'Achaval Ferrer Malbec Mendoza 2022' },
  { id: 44, q: 'Clos de los Siete Malbec Mendoza 2021' },
  { id: 45, q: 'Penfolds Grange Shiraz 2019' },
  { id: 46, q: 'Penfolds Bin 28 Kalimna Shiraz 2021' },
  { id: 47, q: 'The Walking Dead Shiraz 2022' },
  { id: 48, q: 'Cloudy Bay Marlborough Sauvignon Blanc 2023' },
  { id: 49, q: 'Barefoot Bubbly Brut Rose' },
  { id: 50, q: 'Layer Cake Malbec Mendoza 2022' },
]

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://www.vivino.com/',
  'Origin':          'https://www.vivino.com',
}

async function vivinoImageUrl(query) {
  const url = `https://www.vivino.com/api/wines/search?q=${encodeURIComponent(query)}&language=en&min_rating=1`
  const res  = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Vivino ${res.status}`)
  const data = await res.json()
  const vintage = data.matches?.[0]?.vintage
  if (!vintage?.image) return null
  const v = vintage.image.variations ?? {}
  const raw = v.bottle_medium_url ?? v.bottle_large_url ?? v.label_medium_url ?? vintage.image.location
  if (!raw) return null
  return raw.startsWith('//') ? `https:${raw}` : raw
}

async function downloadBuffer(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Download ${res.status} from ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function uploadToR2(localPath, key) {
  execSync(`npx wrangler r2 object put "${R2_BUCKET}/${key}" --file="${localPath}"`, { stdio: 'inherit' })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── main ──────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true })

const imageMap = {}
let ok = 0, fail = 0

for (const wine of WINES) {
  process.stdout.write(`[${wine.id}/50] ${wine.q} … `)
  try {
    const imgUrl = await vivinoImageUrl(wine.q)
    if (!imgUrl) {
      console.log('✗  no match on Vivino')
      imageMap[wine.id] = null
      fail++
    } else {
      const buf      = await downloadBuffer(imgUrl)
      const ext      = imgUrl.toLowerCase().includes('.png') ? 'png' : 'jpg'
      const filename = `${wine.id}.${ext}`
      const local    = `${OUT_DIR}/${filename}`
      const r2Key    = `labels/${filename}`
      writeFileSync(local, buf)
      uploadToR2(local, r2Key)
      imageMap[wine.id] = `${R2_BASE}/${filename}`
      console.log(`✓  ${imageMap[wine.id]}`)
      ok++
    }
  } catch (e) {
    console.log(`✗  ${e.message}`)
    imageMap[wine.id] = null
    fail++
  }
  await sleep(600) // be polite to Vivino's API
}

console.log(`\n✅  Done: ${ok} uploaded, ${fail} failed`)
console.log('\n── Paste this mapping into src/core/data/wineImages.js ──\n')
console.log('export const WINE_IMAGES = ' + JSON.stringify(imageMap, null, 2))
