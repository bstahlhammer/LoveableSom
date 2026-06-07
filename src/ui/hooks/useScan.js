import { useCallback, useState } from 'react'
import { findWineImage, lookupWineCatalog, findWineOnWeb } from '@/core/api'



export function useScan() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)

  const scanImage = useCallback(async function scanImage(file, onWine, onProgress) {
    setScanning(true)
    setError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 180_000)
    try {
      onProgress?.({ stage: 'preparing', message: 'Cutting the foil…' })

      const dataUrl = await readAsDataUrl(file)
      const img = await loadImage(dataUrl)
      const photoBase64 = resizeForSpotlight(img)
      const tiles = splitImageIntoTiles(img)

      onProgress?.({ stage: 'uploading', message: `Scanning ${tiles.length} sections…` })

      const mimeType = file.type || 'image/jpeg'
      let wineCount = 0
      // Catalog lookups start as each wine streams in, pipelined with tile scanning.
      // By the time all tiles complete, most lookups are already resolved.
      const catalogCache = new Map() // normalizedName → Promise<catalog|null>

      // All tiles scan in parallel — wall time ≈ slowest single tile, not N × tile
      const tileResults = await Promise.allSettled(
        tiles.map(({ base64: tileBase64, normRect }) => scanTile(tileBase64, mimeType, controller.signal, (wine) => {
          wineCount++
          onWine?.(wine, wineCount)
          onProgress?.({ stage: 'wine', count: wineCount, message: `${wineCount} wine${wineCount === 1 ? '' : 's'} identified` })
          const key = normalizeWineName(wine.name)
          if (!catalogCache.has(key)) {
            catalogCache.set(key, lookupWineCatalog(wine.name).catch(() => null))
          }
        }).then(result => ({ ...result, normRect })))
      )

      const allWines = []
      let bestReadability = 'unreadable'
      const retakeReasonSet = new Set()
      let scanType = 'list'

      for (const result of tileResults) {
        if (result.status !== 'fulfilled') continue
        const { wines: tw, readability, retakeReasons, scanType: tileType, normRect } = result.value
        allWines.push(...tw.map(w => ({ ...w, _tileRect: normRect ?? null })))
        if (readability === 'good') bestReadability = 'good'
        else if (readability === 'partial' && bestReadability === 'unreadable') bestReadability = 'partial'
        retakeReasons.forEach(r => retakeReasonSet.add(r))
        if (tileType === 'shelf') scanType = 'shelf'
      }

      let wines = deduplicateWines(allWines).filter(w => !isGenericVarietalName(w.name) && !isDescriptiveName(w.name))

      // Sonnet fallback: if all Haiku tiles returned nothing, try once with the full
      // resized image via Sonnet before giving up. Skip if retakeReasons indicate the
      // image itself is the problem — Sonnet won't recover a blurry or non-wine photo.
      const HOPELESS_REASONS = new Set(['not_a_wine_image', 'too_blurry', 'too_dark'])
      const isHopeless = [...retakeReasonSet].some(r => HOPELESS_REASONS.has(r))
      if (!wines.length && photoBase64 && !isHopeless) {
        onProgress?.({ stage: 'enhancing', message: 'Taking a closer look…' })
        try {
          const fallbackResult = await scanTile(photoBase64, mimeType, controller.signal, (wine) => {
            wineCount++
            onWine?.(wine, wineCount)
            onProgress?.({ stage: 'wine', count: wineCount, message: `${wineCount} wine${wineCount === 1 ? '' : 's'} identified` })
            const key = normalizeWineName(wine.name)
            if (!catalogCache.has(key)) {
              catalogCache.set(key, lookupWineCatalog(wine.name).catch(() => null))
            }
          }, true)
          allWines.push(...fallbackResult.wines)
          if (fallbackResult.readability === 'good') bestReadability = 'good'
          else if (fallbackResult.readability === 'partial' && bestReadability === 'unreadable') bestReadability = 'partial'
          fallbackResult.retakeReasons?.forEach(r => retakeReasonSet.add(r))
          if (fallbackResult.scanType === 'shelf') scanType = 'shelf'
        } catch {
          // fallback failed — fall through to error below
        }
        wines = deduplicateWines(allWines).filter(w => !isGenericVarietalName(w.name) && !isDescriptiveName(w.name))
      }

      if (!wines.length) {
        throw new Error('I could not identify any wines. Try a closer photo with labels clearly visible.')
      }

      wines = wines.map(w => ({ ...w, imageUrl: w.imageUrl ?? findWineImage(w.name) }))

      onProgress?.({ stage: 'enriching', message: 'Matching your wines…' })
      const catalogResults = await Promise.allSettled(
        wines.map(w => catalogCache.get(normalizeWineName(w.name)) ?? lookupWineCatalog(w.name))
      )
      wines = wines.map((w, i) => {
        const r = catalogResults[i]
        if (r.status !== 'fulfilled' || !r.value) return w
        return mergeCatalogWine(w, r.value)
      })

      // Drop edge fragments the catalog couldn't confirm
      wines = wines.filter(w => !w.truncated || w._catalogId)

      // AI enrichment pass: for wines the catalog didn't recognize, call /api/find-wine.
      // Runs up to 5 concurrent requests so common brands resolve before results show.
      const needsEnrich = wines.filter(w => w.body == null && w.name && w.name.length > 4 && (w.confidence ?? 0) >= 40)
      if (needsEnrich.length > 0) {
        onProgress?.({ stage: 'enriching', message: `Looking up ${needsEnrich.length} unfamiliar wine${needsEnrich.length === 1 ? '' : 's'}…` })
        const CONCURRENCY = 5
        for (let i = 0; i < needsEnrich.length; i += CONCURRENCY) {
          const chunk = needsEnrich.slice(i, i + CONCURRENCY)
          const enriched = await Promise.allSettled(
            chunk.map(w => findWineOnWeb(w.name, w.vintage ?? null).catch(() => ({ wine: null })))
          )
          for (let j = 0; j < chunk.length; j++) {
            const r = enriched[j]
            if (r.status !== 'fulfilled' || !r.value?.wine) continue
            const data = r.value.wine
            const idx = wines.indexOf(chunk[j])
            if (idx < 0) continue
            wines[idx] = {
              ...wines[idx],
              body:      data.body,
              tannin:    data.tannin,
              sweetness: data.sweetness,
              acidity:   data.acidity,
              rating:    wines[idx].rating  ?? data.rating,
              isCrowd:   wines[idx].isCrowd || data.isCrowd,
              isValue:   wines[idx].isValue || data.isValue,
              grape:     wines[idx].grape   ?? data.grape,
              region:    wines[idx].region  ?? data.region,
              color:     wines[idx].color   ?? data.color,
              tasting:   wines[idx].tasting ?? data.tasting,
              pairings:  wines[idx].pairings?.length ? wines[idx].pairings : (data.pairings ?? []),
            }
          }
        }
      }

      // Second dedup pass: if two tile reads resolved to the same catalog entry, keep the higher-confidence one
      const byCatalogId = new Map()
      for (const w of wines) {
        if (!w._catalogId) continue
        const existing = byCatalogId.get(w._catalogId)
        if (!existing || (w.confidence ?? 0) > (existing.confidence ?? 0)) {
          byCatalogId.set(w._catalogId, w)
        }
      }
      wines = wines.filter(w => !w._catalogId || byCatalogId.get(w._catalogId) === w)

      return { wines, readability: bestReadability, retakeReasons: [...retakeReasonSet], message: '', scanType, photoBase64 }
    } catch (e) {
      setError(e.message || 'Scan failed')
      throw e
    } finally {
      clearTimeout(timeout)
      setScanning(false)
    }
  }, [])

  return { scanning, error, scanImage }
}

function mergeCatalogWine(scanned, cat) {
  return {
    ...cat,
    price:           scanned.price      ?? cat.price,
    priceNum:        scanned.priceNum   ?? cat.priceNum,
    vintage:         scanned.vintage    ?? cat.vintage,
    confidence:      scanned.confidence,
    grape:           scanned.grape      ?? cat.grape,
    region:          scanned.region     ?? cat.region,
    scannedPrice:    scanned.price      ?? null,
    scannedPriceNum: scanned.priceNum   ?? null,
    catalogPrice:    cat.price          ?? null,
    catalogPriceNum: cat.priceNum       ?? null,
    _tileRect:       scanned._tileRect  ?? null,
  }
}

// Split into 2×3 tiles (portrait) or 3×2 (landscape) with 25% overlap between tiles.
// Overlap ensures labels near tile edges are fully captured in at least one tile.
function splitImageIntoTiles(img) {
  const W = img.width
  const H = img.height
  const isPortrait = H >= W
  const COLS = isPortrait ? 2 : 3
  const ROWS = isPortrait ? 3 : 2
  const OVL = 0.25
  const MAX_TILE_EDGE = 1500
  const QUALITY = 0.82

  // Tile size formula: tileW * [(1-OVL)*(COLS-1) + 1] = W
  const tileW = W / ((1 - OVL) * (COLS - 1) + 1)
  const tileH = H / ((1 - OVL) * (ROWS - 1) + 1)
  const strideX = tileW * (1 - OVL)
  const strideY = tileH * (1 - OVL)

  const tiles = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = Math.round(col * strideX)
      const y = Math.round(row * strideY)
      const w = Math.min(Math.round(tileW), W - x)
      const h = Math.min(Math.round(tileH), H - y)

      const scale = Math.min(1, MAX_TILE_EDGE / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
      const comma = dataUrl.indexOf(',')
      if (comma >= 0) tiles.push({
        base64: dataUrl.slice(comma + 1),
        normRect: { x: x / W, y: y / H, w: w / W, h: h / H },
      })
    }
  }
  return tiles
}

// Scan one tile against the API, streaming individual wine objects as they arrive.
// Pass enhanced=true to use the Sonnet fallback model on the server.
async function scanTile(base64, mimeType, signal, onWine, enhanced = false) {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mimeType, ...(enhanced && { enhanced: true }) }),
    signal,
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Tile scan failed')
    const parsed = safeJsonParse(msg)
    throw new Error(parsed?.error ?? msg ?? 'Tile scan failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const parser = makeStreamingWineParser(onWine)

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parser.push(decoder.decode(value, { stream: true }))
  }
  parser.push(decoder.decode())

  const raw = parser.getBuffer()

  if (safeJsonParse(raw.trim().split('\n').pop() || '')?.__stream_error__) {
    throw new Error('Vision analysis failed on tile')
  }

  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      return { wines: parsed.filter(w => w?.name), readability: 'good', retakeReasons: [] }
    }
    if (parsed && Array.isArray(parsed.wines)) {
      return {
        wines: parsed.wines.filter(w => w?.name),
        readability: parsed.readability ?? 'good',
        retakeReasons: Array.isArray(parsed.retakeReasons) ? parsed.retakeReasons : [],
        scanType: parsed.scanType === 'shelf' ? 'shelf' : 'list',
      }
    }
    throw new Error('Unexpected shape')
  } catch {
    const recovered = extractPartialArray(raw)
    return {
      wines: recovered.filter(w => w?.name),
      readability: recovered.length ? 'partial' : 'unreadable',
      retakeReasons: [],
    }
  }
}

// Merge wines from all tiles, keeping the highest-confidence copy of each unique wine.
function deduplicateWines(wines) {
  const seen = new Map()
  for (const wine of wines) {
    if (!wine?.name) continue
    const key = normalizeWineName(wine.name)
    const existing = seen.get(key)
    if (!existing || (wine.confidence ?? 0) > (existing.confidence ?? 0)) {
      seen.set(key, wine)
    }
  }
  return Array.from(seen.values())
}

const GENERIC_VARIETAL_NAMES = new Set([
  'pinot noir', 'pinot grigio', 'pinot gris', 'pinot blanc',
  'cabernet sauvignon', 'cabernet franc', 'cabernet',
  'chardonnay', 'merlot', 'sauvignon blanc', 'syrah', 'shiraz',
  'zinfandel', 'riesling', 'malbec', 'grenache', 'tempranillo',
  'sangiovese', 'nebbiolo', 'barbera', 'viognier', 'gewurztraminer',
  'moscato', 'prosecco', 'champagne', 'rosé', 'rose',
  'red blend', 'white blend', 'bordeaux blend', 'meritage',
  'red wine', 'white wine', 'sparkling wine',
])

function isGenericVarietalName(name) {
  const stripped = String(name)
    .toLowerCase()
    .replace(/\b\d{4}\b/g, '')
    .replace(/[^a-zé\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return GENERIC_VARIETAL_NAMES.has(stripped)
}

// Detect when the model returns a label description instead of an actual wine name.
const DESCRIPTIVE_PREFIXES = [
  'wine with ', 'red wine with ', 'white wine with ', 'rosé with ', 'rose with ',
  'sparkling wine with ', 'bottle with ', 'wine bottle with ',
]
// Multi-word phrases only — avoid single words that appear in real wine names
const DESCRIPTIVE_PHRASES = [
  'illustrated label', 'decorative label', 'patterned label',
  'flower design', 'animal skull', 'vintage truck', 'vehicle imagery',
  'top shelf', 'bottom shelf', 'left side', 'right side', 'shelf,',
  'label design', 'artistic label',
]
function isDescriptiveName(name) {
  const lc = String(name).toLowerCase()
  if (DESCRIPTIVE_PREFIXES.some(p => lc.startsWith(p))) return true
  if (DESCRIPTIVE_PHRASES.some(p => lc.includes(p))) return true
  // Parenthetical shelf-position cues: "Malbec (top shelf, left)" — but not "(illustrated)" which could be a real name
  if (/\((?:top shelf|bottom shelf|left side|right side|shelf,?\s*(?:left|right|top|bottom))/.test(lc)) return true
  return false
}

function normalizeWineName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
}

// Detects complete wine JSON objects in a streaming response and fires the callback
// as each one arrives. Tracks brace depth and string state to avoid false positives.
function makeStreamingWineParser(onWine) {
  let buffer = ''
  let depth = 0
  let inString = false
  let escape = false
  let objStart = -1

  return {
    push(chunk) {
      const startPos = buffer.length
      buffer += chunk

      for (let i = startPos; i < buffer.length; i++) {
        const ch = buffer[i]
        if (escape) { escape = false; continue }
        if (ch === '\\' && inString) { escape = true; continue }
        if (ch === '"') { inString = !inString; continue }
        if (inString) continue

        if (ch === '{') {
          if (depth === 1) objStart = i
          depth++
        } else if (ch === '}') {
          depth--
          if (depth === 1 && objStart !== -1) {
            try {
              const obj = JSON.parse(buffer.slice(objStart, i + 1))
              if (obj.name) onWine(obj)
            } catch {}
            objStart = -1
          }
        }
      }
    },
    getBuffer() { return buffer },
  }
}

function safeJsonParse(value) {
  try { return JSON.parse(value) } catch { return null }
}

function extractPartialArray(raw) {
  const start = raw.indexOf('[')
  if (start === -1) return []
  const results = []
  let depth = 0
  let objStart = -1
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && objStart !== -1) {
        try { results.push(JSON.parse(raw.slice(objStart, i + 1))) } catch {}
        objStart = -1
      }
    }
  }
  return results
}

function resizeForSpotlight(img, maxEdge = 1024, quality = 0.75) {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : null
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const timeout = setTimeout(() => { reader.abort(); reject(new Error('file_read_timeout')) }, 10_000)
    reader.onload = () => { clearTimeout(timeout); resolve(String(reader.result || '')) }
    reader.onerror = () => { clearTimeout(timeout); reject(reader.error || new Error('Could not read file')) }
    reader.onabort = () => { clearTimeout(timeout); reject(new Error('file_read_aborted')) }
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timeout = setTimeout(() => reject(new Error('image_load_timeout')), 12_000)
    img.onload = () => { clearTimeout(timeout); resolve(img) }
    img.onerror = () => { clearTimeout(timeout); reject(new Error('image_load_failed')) }
    img.src = src
  })
}
