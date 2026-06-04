/**
 * enrich-labels.mjs
 *
 * Weekly enrichment pipeline: matches user-flagged wines (in label_requests)
 * against the WineSensed dataset from Hugging Face, then:
 *  - fills wine_catalog.image_url with the label photo
 *  - fills wine_catalog.alcohol and .points if currently null
 *  - marks label_requests rows as 'matched' or 'no_match'
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=... node enrich-labels.mjs            # full run
 *   SUPABASE_SERVICE_KEY=... node enrich-labels.mjs --dry-run  # preview only
 *   SUPABASE_SERVICE_KEY=... node enrich-labels.mjs --limit 10
 *   SUPABASE_SERVICE_KEY=... node enrich-labels.mjs --refresh-cache
 *
 * WineSensed license: CC BY-NC-ND 4.0 (non-commercial use only)
 */

import { createReadStream, createWriteStream, existsSync, statSync, unlinkSync } from 'fs'
import { mkdir, readFile, writeFile }  from 'fs/promises'
import { createInterface }             from 'readline'
import { createClient }                from '@supabase/supabase-js'
import https                           from 'https'
import path                            from 'path'
import os                              from 'os'

// ── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL || 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

// WineSensed metadata CSV on Hugging Face (153 MB)
const HF_CSV_URL = 'https://huggingface.co/datasets/Dakhoo/L2T-NeurIPS-2023/resolve/main/data/csv/images_reviews_attributes.csv'

// Local cache location and TTL (7 days)
const CACHE_DIR  = path.join(os.homedir(), '.uncork-cache')
const CACHE_FILE = path.join(CACHE_DIR, 'winesensed-meta.json')
const CACHE_TTL  = 7 * 24 * 60 * 60 * 1000

// Minimum score to accept a name match (0–1)
const MATCH_THRESHOLD = 0.65

// Vivino CDN URL patterns to probe for each matched image filename.
// WineSensed stores hashed filenames (e.g. "SPYooSq3SrCroz8QOE19lQ.jpg")
// that correspond to Vivino's image CDN.
const VIVINO_CDN_PATTERNS = [
  (stem) => `https://images.vivino.com/thumbs/${stem}_pb_x300.png`,
  (stem) => `https://images.vivino.com/thumbs/${stem}_pb_x600.png`,
  (stem) => `https://images.vivino.com/thumbs/${stem}.jpg`,
]

// ── Args ───────────────────────────────────────────────────────────────────

const argv          = process.argv.slice(2)
const DRY_RUN       = argv.includes('--dry-run')
const REFRESH_CACHE = argv.includes('--refresh-cache')
const LIMIT         = (() => { const i = argv.indexOf('--limit'); return i >= 0 ? Number(argv[i + 1]) : Infinity })()

// ── Supabase ───────────────────────────────────────────────────────────────

function supabaseClient() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY env var is required.')
    process.exit(1)
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

// ── String matching ────────────────────────────────────────────────────────

function normalize(str) {
  return (str ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(str) {
  return new Set(normalize(str).split(' ').filter(Boolean))
}

function jaccardScore(a, b) {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let intersection = 0
  for (const t of ta) if (tb.has(t)) intersection++
  const union = ta.size + tb.size - intersection
  return intersection / union
}

function scoreMatch(request, candidate) {
  // Wine name similarity (primary signal)
  const nameSim = jaccardScore(request.wine_name, candidate.wine)
  if (nameSim < 0.3) return 0  // fast reject

  let score = nameSim * 0.7

  // Token overlap on winery (secondary)
  if (candidate.winery) {
    score += jaccardScore(request.wine_name, candidate.winery) * 0.2
  }

  // Vintage year bonus
  if (request.vintage && candidate.year && String(request.vintage) === String(candidate.year)) {
    score += 0.15
  }

  // Country bonus
  if (request.country && candidate.country) {
    if (normalize(request.country) === normalize(candidate.country)) score += 0.1
  }

  return Math.min(score, 1.0)
}

// ── Download helpers ───────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'uncork-enrichment/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpsGet(res.headers.location))
      }
      resolve(res)
    }).on('error', reject)
  })
}

async function probeUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'uncork-enrichment/1.0' } }, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(5000, () => { req.destroy(); resolve(false) })
    req.end()
  })
}

async function downloadCsvToCache(csvPath) {
  console.log('Downloading WineSensed metadata CSV (~153 MB)…')
  console.log('This takes a few minutes the first time; results are cached for 7 days.')

  await mkdir(CACHE_DIR, { recursive: true })

  const tmpPath = csvPath + '.tmp'
  const res = await httpsGet(HF_CSV_URL)

  if (res.statusCode !== 200) {
    throw new Error(`HF download failed: HTTP ${res.statusCode}`)
  }

  await new Promise((resolve, reject) => {
    const out = createWriteStream(tmpPath)
    let bytes = 0
    res.on('data', (chunk) => {
      bytes += chunk.length
      if (bytes % (10 * 1024 * 1024) < chunk.length) {
        process.stdout.write(`\r  ${(bytes / 1024 / 1024).toFixed(0)} MB downloaded…`)
      }
    })
    res.pipe(out)
    out.on('finish', () => { process.stdout.write('\n'); resolve() })
    out.on('error', reject)
  })

  // Rename tmp → final only on success
  const fs = await import('fs/promises')
  await fs.rename(tmpPath, csvPath)
}

// ── CSV parser ─────────────────────────────────────────────────────────────

// Simple CSV parser: handles quoted fields with commas and newlines inside.
function* parseCsvLine(line) {
  let field = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { field += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      yield field; field = ''
    } else {
      field += ch
    }
  }
  yield field
}

async function loadWineSensedMetadata(csvPath) {
  console.log('Parsing WineSensed metadata CSV…')
  const records = []
  let headers = null
  let lineCount = 0

  const rl = createInterface({ input: createReadStream(csvPath, 'utf8'), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    const fields = [...parseCsvLine(line)]
    if (!headers) {
      headers = fields.map(h => h.trim().toLowerCase())
      // Validate required columns
      const required = ['wine', 'image', 'vintage_id']
      for (const col of required) {
        if (!headers.includes(col)) throw new Error(`WineSensed CSV missing column: ${col}`)
      }
      console.log(`  Columns: ${headers.join(', ')}`)
      continue
    }

    const row = {}
    headers.forEach((h, i) => { row[h] = fields[i]?.trim() ?? '' })
    records.push({
      vintage_id: row.vintage_id,
      wine:       row.wine,
      winery:     row.winery_id,  // winery_id is the winery name in this dataset
      year:       row.year,
      country:    row.country,
      region:     row.region,
      grape:      row.grape,
      alcohol:    row.alcohol ? parseFloat(row.alcohol) : null,
      price:      row.price ? parseFloat(row.price) : null,
      rating:     row.rating ? parseFloat(row.rating) : null,
      review:     row.review,
      image:      row.image,  // may be filename or URL — probed below
    })
    lineCount++
    if (lineCount % 100000 === 0) console.log(`  Parsed ${lineCount.toLocaleString()} records…`)
  }

  console.log(`  Total records: ${records.length.toLocaleString()}`)
  return records
}

// ── Image URL resolution ───────────────────────────────────────────────────

async function resolveImageUrl(imageField) {
  if (!imageField) return null

  // Case 1: already a URL
  if (imageField.startsWith('http')) {
    const ok = await probeUrl(imageField)
    return ok ? imageField : null
  }

  // Case 2: filename — try Vivino CDN patterns
  const stem = imageField.replace(/\.[^.]+$/, '')  // strip extension
  for (const pattern of VIVINO_CDN_PATTERNS) {
    const url = pattern(stem)
    const ok = await probeUrl(url)
    if (ok) return url
  }

  return null
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log('=== DRY RUN — no writes to database ===\n')

  const supabase = supabaseClient()

  // ── Step 0: Auto-register wines SerpAPI already failed on ─────────────────
  // Finds wines where image_fetched_at IS NOT NULL but image_url IS NULL
  // (meaning SerpAPI tried and found nothing), then inserts label_requests rows
  // so this pipeline can attempt WineSensed matching on its next run.
  console.log('Auto-registering wines SerpAPI could not find images for…')
  {
    const { data: noImageWines, error: scanErr } = await supabase
      .from('wine_catalog')
      .select('id, name')
      .is('image_url', null)
      .not('image_fetched_at', 'is', null)
      .limit(5000)

    if (scanErr) {
      console.warn('  Could not scan wine_catalog:', scanErr.message)
    } else if (noImageWines?.length) {
      // Find which ones already have a label_requests row (any status)
      const ids = noImageWines.map(w => w.id)
      const { data: existing } = await supabase
        .from('label_requests')
        .select('catalog_id')
        .in('catalog_id', ids)

      const existingIds = new Set((existing || []).map(r => r.catalog_id))
      const toInsert = noImageWines
        .filter(w => !existingIds.has(w.id))
        .map(w => ({ catalog_id: w.id, wine_name: w.name, requested_by: null, status: 'pending' }))

      if (toInsert.length > 0 && !DRY_RUN) {
        const BATCH = 500
        for (let i = 0; i < toInsert.length; i += BATCH) {
          await supabase.from('label_requests').insert(toInsert.slice(i, i + BATCH))
        }
      }

      console.log(`  ${noImageWines.length} wines without images — ${toInsert.length} new label_requests created${DRY_RUN ? ' (dry-run, skipped)' : ''}`)
    } else {
      console.log('  No new wines to register.')
    }
  }

  // ── Step 1: Load pending requests ─────────────────────────────────────────
  console.log('\nLoading pending label requests…')
  const { data: requests, error: reqErr } = await supabase
    .from('label_requests')
    .select('id, catalog_id, wine_name')
    .eq('status', 'pending')
    .limit(LIMIT === Infinity ? 10000 : LIMIT)

  if (reqErr) { console.error('Failed to load requests:', reqErr); process.exit(1) }
  if (!requests.length) { console.log('No pending requests. Done.'); return }

  // Enrich with catalog metadata (vintage, country) for better matching
  const catalogIds = requests.map(r => r.catalog_id)
  const { data: catalogRows } = await supabase
    .from('wine_catalog')
    .select('id, vintage, country, image_url')
    .in('id', catalogIds)

  const catalogById = Object.fromEntries((catalogRows || []).map(r => [r.id, r]))

  const enrichedRequests = requests.map(r => ({
    ...r,
    vintage:   catalogById[r.catalog_id]?.vintage ?? null,
    country:   catalogById[r.catalog_id]?.country ?? null,
    image_url: catalogById[r.catalog_id]?.image_url ?? null,
  })).filter(r => !r.image_url)  // skip wines that got an image since the request was filed

  console.log(`  ${requests.length} pending requests, ${enrichedRequests.length} still need images\n`)

  if (!enrichedRequests.length) {
    console.log('All pending requests already have images. Marking as matched…')
    if (!DRY_RUN) {
      await supabase.from('label_requests').update({ status: 'skipped', matched_at: new Date().toISOString() })
        .in('catalog_id', catalogIds).eq('status', 'pending')
    }
    return
  }

  // ── Step 2: Load WineSensed metadata (cached) ─────────────────────────────
  const csvPath = path.join(CACHE_DIR, 'images_reviews_attributes.csv')
  const cacheValid = !REFRESH_CACHE &&
    existsSync(csvPath) &&
    (Date.now() - statSync(csvPath).mtimeMs) < CACHE_TTL

  if (!cacheValid) {
    if (existsSync(csvPath)) { console.log('Cache expired — re-downloading…'); unlinkSync(csvPath) }
    await downloadCsvToCache(csvPath)
  } else {
    console.log(`Using cached WineSensed metadata (${(statSync(csvPath).size / 1024 / 1024).toFixed(0)} MB)`)
  }

  const winesensed = await loadWineSensedMetadata(csvPath)

  // ── Step 3: Match and enrich ───────────────────────────────────────────────
  console.log('\nMatching wines…')

  let matched = 0, noMatch = 0, skipped = 0
  const results = []

  for (const req of enrichedRequests) {
    // Score every WineSensed record against this request
    let bestScore = 0
    let bestCandidate = null

    for (const candidate of winesensed) {
      const score = scoreMatch(req, candidate)
      if (score > bestScore) {
        bestScore = score
        bestCandidate = candidate
      }
    }

    const isMatch = bestScore >= MATCH_THRESHOLD

    if (isMatch) {
      // Probe image URL
      const imageUrl = await resolveImageUrl(bestCandidate.image)
      results.push({ req, candidate: bestCandidate, score: bestScore, imageUrl, status: 'matched' })
      matched++
      console.log(`  ✓ [${bestScore.toFixed(2)}] "${req.wine_name}" → "${bestCandidate.wine}" (${bestCandidate.year}) image=${imageUrl ? 'found' : 'none'}`)
    } else {
      results.push({ req, candidate: null, score: bestScore, imageUrl: null, status: 'no_match' })
      noMatch++
      console.log(`  ✗ [${bestScore.toFixed(2)}] "${req.wine_name}" — no match above threshold`)
    }
  }

  console.log(`\nResults: ${matched} matched, ${noMatch} no_match, ${skipped} skipped`)

  if (DRY_RUN) {
    console.log('\n[dry-run] No database writes. Pass without --dry-run to apply.')
    return
  }

  // ── Step 4: Write enrichments ──────────────────────────────────────────────
  console.log('\nWriting enrichments to Supabase…')

  for (const { req, candidate, imageUrl, status } of results) {
    // Update wine_catalog
    const catalogUpdate = {}
    if (imageUrl) catalogUpdate.image_url = imageUrl
    if (imageUrl) catalogUpdate.image_fetched_at = new Date().toISOString()
    if (candidate?.alcohol != null) catalogUpdate.alcohol = candidate.alcohol

    // Only fill points if currently null (never overwrite)
    const existingPoints = catalogById[req.catalog_id]?.points ?? null
    if (existingPoints == null && candidate?.rating != null) {
      catalogUpdate.points = Math.round(candidate.rating * 20)  // Vivino 0–5 → 0–100 scale
    }

    if (Object.keys(catalogUpdate).length > 0) {
      const { error } = await supabase
        .from('wine_catalog')
        .update(catalogUpdate)
        .eq('id', req.catalog_id)
      if (error) console.error(`  catalog update failed for ${req.catalog_id}:`, error.message)
    }

    // Update label_requests row
    const { error } = await supabase
      .from('label_requests')
      .update({
        status:                status,
        matched_at:            new Date().toISOString(),
        winesensed_vintage_id: candidate?.vintage_id ?? null,
      })
      .eq('id', req.id)
    if (error) console.error(`  label_requests update failed for ${req.id}:`, error.message)
  }

  console.log('\nDone.')
  console.log(`  ${matched} wines enriched (${results.filter(r => r.imageUrl).length} with label images)`)
  console.log(`  ${noMatch} wines had no WineSensed match — SerpAPI fallback remains active`)
}

main().catch(err => { console.error(err); process.exit(1) })
