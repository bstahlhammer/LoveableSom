/**
 * ingest-wines.mjs
 *
 * Reads the Kaggle wine-reviews CSV and loads it into the Supabase
 * wine_catalog table.  Run once from the project root:
 *
 *   node ingest-wines.mjs
 *
 * Prerequisites:
 *   1. Run the Supabase migration first:
 *      supabase/migrations/002_wine_catalog.sql
 *   2. Download the Kaggle dataset:
 *      https://www.kaggle.com/datasets/zynicide/wine-reviews
 *      Save the file as:  wine-reviews.csv  (in this directory)
 *
 * Options:
 *   --file PATH   CSV file to process (default: wine-reviews.csv)
 *   --dry-run     Parse CSV and print a sample without inserting
 *   --limit N     Only insert the first N rows (useful for testing)
 *   --skip N      Skip the first N rows (resume a partial run)
 */

import { createReadStream } from 'fs'
import { createInterface }   from 'readline'
import { createClient }      from '@supabase/supabase-js'
import { inferAxes }         from './src/core/data/grapeRules.mjs'

// ── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.SUPABASE_URL || 'https://bromlnbihmfknqcdbieq.supabase.co'
// Use the service-role key for bulk inserts (bypasses RLS).
// Get it from: https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/settings/api
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

const BATCH     = 500  // rows per upsert call

// ── Args ───────────────────────────────────────────────────────────────────

const argv    = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const LIMIT   = (() => { const i = argv.indexOf('--limit'); return i >= 0 ? Number(argv[i+1]) : Infinity })()
const SKIP    = (() => { const i = argv.indexOf('--skip');  return i >= 0 ? Number(argv[i+1]) : 0 })()
const CSV_FILE = (() => { const i = argv.indexOf('--file'); return i >= 0 ? argv[i+1] : './wine-reviews.csv' })()

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse the Kaggle title into name / winery / vintage.
 * Format: "{Winery} {Year} {Name} ({Region})"
 * Region from title is secondary — we prefer region_1 column.
 */
function parseTitle(title) {
  // Matches: "Château X 2019 Réserve (Bordeaux)" or "Winery 2020 Name"
  const m = title.match(/^(.+?)\s+(\d{4})\s+(.+?)(?:\s+\(([^)]+)\))?$/)
  if (m) {
    return {
      winery:     m[1].trim(),
      vintage:    parseInt(m[2], 10),
      wineName:   m[3].trim(),
      titleRegion: m[4] ?? null,
    }
  }
  // No year found — title IS the name
  const noYear = title.replace(/\s*\([^)]+\)$/, '').trim()
  return { winery: null, vintage: null, wineName: noYear, titleRegion: null }
}

/**
 * Build the display name shown in the UI.
 * e.g. "Caymus Cabernet Sauvignon" or "Ridge Geyserville"
 */
function buildDisplayName({ winery, wineName, designation, variety }) {
  // If the wine name starts with the winery name, use it as-is
  if (winery && wineName.toLowerCase().startsWith(winery.toLowerCase())) {
    return wineName
  }
  // If there's a designation (sub-label), prefer "Winery Designation"
  if (winery && designation) return `${winery} ${designation}`
  // Otherwise "Winery WineName"
  if (winery && wineName && wineName !== variety) return `${winery} ${wineName}`
  // Fallback
  return wineName || winery || 'Unknown'
}

// ── CSV parsing ────────────────────────────────────────────────────────────

/**
 * Parse a single CSV line, respecting quoted fields that may contain commas.
 */
function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      fields.push(current); current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// ── Main ───────────────────────────────────────────────────────────────────

if (!DRY_RUN && !SUPABASE_SERVICE_KEY) {
  console.error('\n❌  SUPABASE_SERVICE_KEY is not set.')
  console.error('   Get it from: https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/settings/api')
  console.error('   Then run:  SUPABASE_SERVICE_KEY=your_key node ingest-wines.mjs\n')
  process.exit(1)
}

const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

console.log(`\n🍷  Uncork wine catalog ingest`)
console.log(`   Source:  ${CSV_FILE}`)
console.log(`   Supabase: ${SUPABASE_URL}`)
if (DRY_RUN) console.log('   🔍  DRY RUN — no data will be written')
if (LIMIT !== Infinity) console.log(`   Limit: ${LIMIT} rows`)
if (SKIP > 0) console.log(`   Skip:  ${SKIP} rows\n`)

const rl = createInterface({ input: createReadStream(CSV_FILE) })
let headers = null
let batch = []
let totalInserted = 0
let totalSkipped  = 0
let totalErrors   = 0
let lineNum = 0

async function flushBatch() {
  if (!supabase || batch.length === 0) return
  const { error } = await supabase
    .from('wine_catalog')
    .upsert(batch, { onConflict: 'title', ignoreDuplicates: true })
  if (error) {
    console.error(`  ⚠  Batch error: ${error.message}`)
    totalErrors += batch.length
  } else {
    totalInserted += batch.length
    process.stdout.write(`\r  Inserted: ${totalInserted.toLocaleString()}   `)
  }
  batch = []
}

for await (const raw of rl) {
  const line = raw.trimEnd()
  if (!line) continue

  // First non-empty line = headers
  if (!headers) {
    headers = parseCsvLine(line)
    continue
  }

  lineNum++
  if (lineNum <= SKIP) continue
  if (lineNum - SKIP > LIMIT) break

  const cols = parseCsvLine(line)
  if (cols.length < headers.length - 1) { totalSkipped++; continue }

  const row = {}
  headers.forEach((h, i) => { row[h] = cols[i]?.trim() ?? '' })

  const winery      = row.winery?.trim()      || null
  const variety     = row.variety?.trim()      || null
  const designation = row.designation?.trim()  || null
  const region1     = row.region_1?.trim()     || null
  const province    = row.province?.trim()     || null

  // v1 CSV has no title column — construct a synthetic one
  const title = row.title?.trim() || [winery, designation || variety, region1 ? `(${region1})` : null]
    .filter(Boolean).join(' ')
  if (!title) { totalSkipped++; continue }

  // v2 has a parseable title with vintage; v1 does not
  const parsed  = row.title ? parseTitle(row.title) : { winery, vintage: null, wineName: designation || variety || '', titleRegion: region1 }
  const axes    = inferAxes(variety || '', row.description || '')
  const points  = parseInt(row.points, 10) || null
  const price   = parseFloat(row.price)    || null

  const name = buildDisplayName({
    winery,
    wineName:    parsed.wineName,
    designation,
    variety,
  })

  const record = {
    title,
    name,
    winery,
    vintage:    parsed.vintage,
    variety,
    designation,
    region:     region1 || parsed.titleRegion || null,
    province:   province || null,
    country:    row.country?.trim()   || null,
    description: row.description?.trim() || null,
    points,
    price,
    body:      axes.body,
    tannin:    axes.tannin,
    sweetness: axes.sweetness,
    acidity:   axes.acidity,
    color:     axes.color,
  }

  // DRY RUN: print a few samples
  if (DRY_RUN) {
    if (lineNum <= 5) {
      console.log(`\n  [${lineNum}] ${name}`)
      console.log(`        variety=${variety}  color=${axes.color}`)
      console.log(`        body=${axes.body} tannin=${axes.tannin} sweet=${axes.sweetness} acid=${axes.acidity}`)
      console.log(`        points=${points}  price=$${price}  region=${record.region}`)
    } else if (lineNum === 6) {
      console.log('\n  ... (run without --dry-run to insert all rows)')
    }
    totalInserted++
    continue
  }

  batch.push(record)
  if (batch.length >= BATCH) await flushBatch()
}

await flushBatch()

console.log(`\n\n✅  Done`)
console.log(`   Inserted: ${totalInserted.toLocaleString()}`)
console.log(`   Skipped:  ${totalSkipped.toLocaleString()}`)
if (totalErrors > 0) console.log(`   Errors:   ${totalErrors.toLocaleString()}`)
console.log()
if (!DRY_RUN && totalInserted > 0) {
  console.log('Next steps:')
  console.log('  1. npm run build && npx wrangler deploy')
  console.log('  2. Set SERPAPI_KEY in wrangler.jsonc (for wine images)\n')
}
