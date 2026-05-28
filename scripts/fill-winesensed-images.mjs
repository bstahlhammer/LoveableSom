/**
 * Phase 4a: Populate wine_catalog.image_url for WineSensed experiment wines.
 *
 * Downloads the 107-wine WineSensed experiment subset from HuggingFace,
 * fetches the official label image for each wine from Vivino's API
 * (api.vivino.com/vintages/{id} — confirmed open, returns 200),
 * and writes the image URL into wine_catalog.
 *
 * Only updates rows where image_url IS NULL — never overwrites existing images.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=sk_... node scripts/fill-winesensed-images.mjs
 *   SUPABASE_SERVICE_KEY=sk_... node scripts/fill-winesensed-images.mjs --dry-run
 *   SUPABASE_SERVICE_KEY=sk_... node scripts/fill-winesensed-images.mjs --limit 10
 *
 * Get SUPABASE_SERVICE_KEY from:
 *   Supabase Dashboard → Project Settings → API → service_role (secret) key
 */

const SB_URL    = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SB_KEY    = process.env.SUPABASE_SERVICE_KEY

const HF_URL    = 'https://huggingface.co/datasets/Dakhoo/L2T-NeurIPS-2023/resolve/main/data/vintages/vintages_dataset.jsonl'
const VIVINO    = 'https://api.vivino.com/vintages'
const DELAY_MS  = 400   // stay well under Vivino's rate limit

const DRY_RUN   = process.argv.includes('--dry-run')
const LIMIT_IDX = process.argv.indexOf('--limit')
const LIMIT     = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity

if (!SB_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY is required.')
  console.error('  Get it from Supabase Dashboard → Project Settings → API → service_role key')
  process.exit(1)
}

const sbHeaders = {
  apikey:        SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function norm(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

async function main() {
  console.log(`\n[winesensed] ${DRY_RUN ? '── DRY RUN ── ' : ''}Phase 4a wine image fill`)
  console.log('[winesensed] Source: HuggingFace WineSensed vintages_dataset.jsonl\n')

  // 1. Download the 107-wine experiment subset (~34 kB)
  console.log('[1/4] Downloading WineSensed vintages...')
  const text = await fetch(HF_URL).then(r => {
    if (!r.ok) throw new Error(`HuggingFace fetch failed: ${r.status}`)
    return r.text()
  })
  const vintages = text.trim().split('\n').map(line => JSON.parse(line))
  const toProcess = vintages.slice(0, LIMIT)
  console.log(`      ${vintages.length} wines total, processing ${toProcess.length}`)

  // 2. Load wine_catalog rows that still need images (only match against these)
  console.log('\n[2/4] Loading catalog wines without images...')
  const catRes = await fetch(
    `${SB_URL}/rest/v1/wine_catalog?select=id,name&image_url=is.null&limit=10000`,
    { headers: sbHeaders }
  )
  if (!catRes.ok) {
    const body = await catRes.text()
    throw new Error(`Supabase catalog fetch failed ${catRes.status}: ${body}`)
  }
  const catalog = await catRes.json()
  const byNorm = new Map(catalog.map(r => [norm(r.name), r.id]))
  console.log(`      ${catalog.length} catalog rows need images`)

  // 3. Process each WineSensed wine
  console.log('\n[3/4] Fetching Vivino images...\n')
  let found = 0, noMatch = 0, noImage = 0, errors = 0

  for (let i = 0; i < toProcess.length; i++) {
    const v     = toProcess[i]
    const name  = v.wine
    const year  = v.year ?? ''
    const label = `[${String(i + 1).padStart(3)}/${toProcess.length}] ${name}${year ? ` ${year}` : ''}`

    process.stdout.write(`${label} ... `)

    // Match name against catalog
    const catalogId = byNorm.get(norm(name))
    if (!catalogId) {
      console.log('skip (no catalog match)')
      noMatch++
      continue
    }

    if (!v.vintage_id) {
      console.log('skip (no vintage_id)')
      noMatch++
      continue
    }

    // Call Vivino API
    let imageUrl = null
    try {
      const data = await fetch(`${VIVINO}/${v.vintage_id}`).then(r => r.json())
      const img  = data?.image?.variations?.large ?? data?.image?.location ?? null
      if (img) imageUrl = img.startsWith('//') ? `https:${img}` : img
    } catch (err) {
      console.log(`error (${err.message})`)
      errors++
      await sleep(DELAY_MS)
      continue
    }

    if (!imageUrl) {
      console.log('skip (no Vivino image)')
      noImage++
      await sleep(DELAY_MS)
      continue
    }

    // Spot-check the URL serves
    const alive = await fetch(imageUrl, { method: 'HEAD' }).then(r => r.ok).catch(() => false)
    if (!alive) {
      console.log(`skip (image 404: ${imageUrl})`)
      noImage++
      await sleep(DELAY_MS)
      continue
    }

    // Write to Supabase
    if (!DRY_RUN) {
      const patch = await fetch(`${SB_URL}/rest/v1/wine_catalog?id=eq.${catalogId}`, {
        method:  'PATCH',
        headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body:    JSON.stringify({ image_url: imageUrl, image_fetched_at: new Date().toISOString() }),
      })
      if (!patch.ok) {
        const t = await patch.text()
        console.log(`error (db write ${patch.status}: ${t})`)
        errors++
        await sleep(DELAY_MS)
        continue
      }
    }

    console.log(`✓${DRY_RUN ? ' (dry)' : ''} ${imageUrl.slice(0, 68)}`)
    found++
    await sleep(DELAY_MS)
  }

  // 4. Summary
  console.log('\n[4/4] Done.\n')
  console.log('  ✓ Written (or would write):', found)
  console.log('  ✗ No catalog match:        ', noMatch)
  console.log('  ✗ No Vivino image:         ', noImage)
  console.log('  ✗ Errors:                  ', errors)
  if (DRY_RUN) {
    console.log('\n  Re-run without --dry-run to write to the database.')
  }
}

main().catch(err => {
  console.error('\n[winesensed] Fatal error:', err.message)
  process.exit(1)
})
