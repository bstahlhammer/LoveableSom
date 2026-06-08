/**
 * Post-build patch: injects a `scheduled` export into the TanStack Start
 * compiled Worker entry so Cloudflare fires the nightly image-fetch cron.
 *
 * The handler uses raw fetch() against Supabase REST — no SDK, no bundling.
 * Also patches dist/server/wrangler.json to register the cron trigger.
 *
 * Run after vite build:  node scripts/patch-worker.mjs
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT      = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY     = path.join(ROOT, 'dist/server/index.js')
const WRANGLER  = path.join(ROOT, 'dist/server/wrangler.json')
const SKIP_CRON  = process.argv.includes('--skip-cron')
const nameIdx    = process.argv.indexOf('--name')
const WORKER_NAME = nameIdx >= 0 ? process.argv[nameIdx + 1] : null

const SB_URL = process.env.VITE_SUPABASE_URL
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY
if (!SB_URL || !SB_KEY) {
  console.error('[patch-worker] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — pass via --env-file')
  process.exit(1)
}

if (!fs.existsSync(ENTRY)) {
  console.error('[patch-worker] dist/server/index.js not found — run vite build first')
  process.exit(1)
}

const existing = fs.readFileSync(ENTRY, 'utf8')
if (existing.includes('__image_cron_patched__')) {
  console.log('[patch-worker] Already patched — skipping')
  process.exit(0)
}

// ── Parse the export block (variable names shift across builds) ───────────────
// Rollup may assign any short identifier to these exports; match dynamically.
const exportMatch = existing.match(/export \{\n  (\S+) as createServerEntry,\n  (\S+) as default\n\};/)
if (!exportMatch) {
  const found = existing.match(/export \{[^}]+\}/)?.[0] ?? '(none found)'
  console.error('[patch-worker] Could not find expected export block — check dist/server/index.js format')
  console.error('  Found: ' + found)
  process.exit(1)
}
const [fullExportBlock, createServerEntryVar, defaultVar] = exportMatch

// ── Scheduled handler code (appended after the compiled TanStack entry) ──────
// Uses Supabase REST API via fetch — no SDK needed, works in the no_bundle env.
const CRON_CODE = `
// __image_cron_patched__ — injected by scripts/patch-worker.mjs
const _SB_URL  = '${SB_URL}'
const _SB_KEY  = '${SB_KEY}'
const _HEADERS = { apikey: _SB_KEY, Authorization: 'Bearer ' + _SB_KEY, 'Content-Type': 'application/json' }

async function _runImageBatch(env) {
  const cseKey = env.GOOGLE_CSE_KEY
  const cseId  = env.GOOGLE_CSE_ID
  if (!cseKey || !cseId) { console.log('[image-cron] Missing CSE credentials'); return }

  const qRes = await fetch(
    _SB_URL + '/rest/v1/wine_catalog?select=id,name&image_url=is.null&image_fetched_at=is.null&limit=95&order=id',
    { headers: _HEADERS }
  )
  if (!qRes.ok) { console.error('[image-cron] Supabase query failed:', qRes.status); return }
  const wines = await qRes.json()
  if (!wines.length) { console.log('[image-cron] Catalog fully imaged!'); return }

  console.log('[image-cron] Processing ' + wines.length + ' wines')
  let fetched = 0, missed = 0

  for (const wine of wines) {
    try {
      const q   = encodeURIComponent(wine.name + ' wine bottle')
      const r   = await fetch('https://www.googleapis.com/customsearch/v1?q=' + q + '&searchType=image&num=5&safe=active&key=' + cseKey + '&cx=' + cseId)
      if (r.status === 429) { console.warn('[image-cron] CSE quota hit'); break }

      let imageUrl = null
      if (r.ok) {
        const data = await r.json()
        for (const img of (data.items || [])) {
          const src = img.link || (img.image && img.image.thumbnailLink)
          if (src && src.startsWith('http')) { imageUrl = src; break }
        }
      }

      await fetch(_SB_URL + '/rest/v1/wine_catalog?id=eq.' + wine.id, {
        method: 'PATCH',
        headers: Object.assign({}, _HEADERS, { Prefer: 'return=minimal' }),
        body: JSON.stringify({ image_url: imageUrl, image_fetched_at: new Date().toISOString() }),
      })
      imageUrl ? fetched++ : missed++
    } catch (err) {
      console.error('[image-cron] Error on wine ' + wine.id + ':', err)
      missed++
    }
    await new Promise(r => setTimeout(r, 500))
  }
  console.log('[image-cron] Done — ' + fetched + ' found, ' + missed + ' misses')
}

// Wrap the TanStack default export to add scheduled handler
const _tsDefault = ${defaultVar}
const _worker = {
  fetch:     _tsDefault.fetch.bind(_tsDefault),
  scheduled: function(_event, env, ctx) { ctx.waitUntil(_runImageBatch(env)) },
}
`

// ── Patch the export block ────────────────────────────────────────────────────
const NEW_EXPORT = `${CRON_CODE}\nexport {\n  ${createServerEntryVar} as createServerEntry,\n  _worker as default\n};`

fs.writeFileSync(ENTRY, existing.replace(fullExportBlock, NEW_EXPORT), 'utf8')
console.log('[patch-worker] dist/server/index.js patched ✓')

// ── Patch wrangler.json: name + cron trigger ─────────────────────────────────
if (fs.existsSync(WRANGLER)) {
  const cfg = JSON.parse(fs.readFileSync(WRANGLER, 'utf8'))
  if (WORKER_NAME) {
    cfg.name = WORKER_NAME
    console.log(`[patch-worker] Worker name set to "${WORKER_NAME}" ✓`)
  }
  if (SKIP_CRON) {
    delete cfg.triggers
    console.log('[patch-worker] Cron trigger removed (--skip-cron)')
  } else {
    cfg.triggers = { crons: ['0 7 * * *'] }
    console.log('[patch-worker] dist/server/wrangler.json cron trigger patched ✓')
  }
  fs.writeFileSync(WRANGLER, JSON.stringify(cfg, null, 2), 'utf8')
} else {
  console.warn('[patch-worker] dist/server/wrangler.json not found — skipping')
}
