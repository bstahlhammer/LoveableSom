import { useCallback, useState } from 'react'
import { findWineImage, lookupWineCatalog } from '@/core/api'

export function useScan() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)

  const scanImage = useCallback(async function scanImage(file, onWine, onProgress) {
    setScanning(true)
    setError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min max
    try {
      onProgress?.({ stage: 'preparing', message: 'Cutting the foil…' })
      const base64 = await fileToDownscaledBase64(file).catch(async (err) => {
        console.warn('downscale failed, falling back to raw upload', err)
        return fileToBase64(file)
      })
      onProgress?.({ stage: 'uploading', message: 'Presenting the bottle…' })

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type || 'image/jpeg' }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const msg = await res.text().catch(() => 'Scan failed')
        const parsed = safeJsonParse(msg)
        if (parsed?.error) throw new Error(parsed.error)
        throw new Error(msg || 'Scan failed')
      }

      onProgress?.({ stage: 'reading', message: 'Uncorking the image…' })

      // Read the streaming response body and accumulate it.
      // The server streams Anthropic tokens directly, keeping the Worker alive
      // past Cloudflare's 30s wall-clock limit for non-streaming responses.
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let raw = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        raw += decoder.decode(value, { stream: true })
      }
      // Flush any remaining bytes
      raw += decoder.decode()

      if (safeJsonParse(raw.trim().split('\n').pop() || '')?.__stream_error__) {
        throw new Error('Vision analysis failed')
      }

      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      let wines, readability, retakeReasons, message
      try {
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed)) {
          // Backwards-compat: old flat array response
          wines = parsed.filter((w) => w?.name)
          readability = 'good'
          retakeReasons = []
          message = ''
        } else if (parsed && Array.isArray(parsed.wines)) {
          // New structured response
          wines = parsed.wines.filter((w) => w?.name)
          readability = parsed.readability ?? 'good'
          retakeReasons = Array.isArray(parsed.retakeReasons) ? parsed.retakeReasons : []
          message = typeof parsed.message === 'string' ? parsed.message : ''
        } else {
          throw new Error('Unexpected response shape')
        }
      } catch {
        const recovered = extractPartialArray(raw)
        wines = recovered.filter((w) => w?.name)
        readability = wines.length ? 'partial' : 'unreadable'
        retakeReasons = []
        message = ''
      }

      if (!wines.length) {
        throw new Error('I could not identify a specific wine. Try a closer, sharper photo where the full label or shelf tag is readable.')
      }

      wines.forEach((wine, index) => {
        onWine?.(wine, index + 1)
        onProgress?.({ stage: 'wine', count: index + 1, message: `${index + 1} wine${index + 1 === 1 ? '' : 's'} identified` })
      })

      // Enrich wines that are missing grape/region or were low-confidence reads.
      // Use a tight timeout so a slow enrichment never holds up the UI.
      const needsEnrich = wines.filter(
        (w) => !w.grape || !w.region || (typeof w.confidence === 'number' && w.confidence < 75)
      )
      if (needsEnrich.length > 0) {
        onProgress?.({ stage: 'enriching', message: 'Verifying varietals…' })
        const enriched = await enrichWines(needsEnrich, controller.signal).catch(() => [])
        if (enriched.length > 0) {
          const byId = Object.fromEntries(enriched.map((e) => [e.id, e]))
          wines = wines.map((w) => {
            const e = byId[w.id]
            if (!e) return w
            return {
              ...w,
              grape:  e.grape  ?? w.grape,
              region: e.region ?? w.region,
            }
          })
        }
      }

      // Local image lookup (fast, from 50 curated wines)
      wines = wines.map(w => ({ ...w, imageUrl: w.imageUrl ?? findWineImage(w.name) }))

      // Catalog enrichment: parallel Supabase lookup for imageUrl + _catalogId
      // (enables lazy image fetch for wines not in the 50-wine local set)
      const catalogResults = await Promise.allSettled(
        wines.map(w => w.imageUrl ? Promise.resolve(null) : lookupWineCatalog(w.name))
      )
      wines = wines.map((w, i) => {
        const r = catalogResults[i]
        if (r.status !== 'fulfilled' || !r.value) return w
        const cat = r.value
        return {
          ...w,
          imageUrl:   w.imageUrl ?? cat.imageUrl,
          _catalogId: cat._catalogId,
        }
      })

      return { wines, readability, retakeReasons, message }
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

// Call the enrich endpoint to fill in grape/region for wines that Claude
// couldn't read clearly from the image. Times out after 8s so it never
// blocks the results screen from appearing.
async function enrichWines(wines, signal) {
  const payload = wines.map((w) => ({ id: w.id, name: w.name, vintage: w.vintage ?? null }))
  const enrichSignal = (AbortSignal.any && AbortSignal.timeout)
    ? AbortSignal.any([signal, AbortSignal.timeout(8_000)])
    : signal
  const res = await fetch('/api/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wines: payload }),
    signal: enrichSignal,
  })
  if (!res.ok) throw new Error('enrich failed')
  const data = await res.json()
  return Array.isArray(data.enrichments) ? data.enrichments : []
}

function safeJsonParse(value) {
  try { return JSON.parse(value) } catch { return null }
}

// Recover complete JSON objects from a truncated array string.
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const timeout = setTimeout(() => { reader.abort(); reject(new Error('file_read_timeout')) }, 8000)
    reader.onload = () => {
      clearTimeout(timeout)
      const result = reader.result || ''
      const comma = String(result).indexOf(',')
      resolve(comma >= 0 ? String(result).slice(comma + 1) : '')
    }
    reader.onerror = () => { clearTimeout(timeout); reject(reader.error || new Error('Could not read file')) }
    reader.onabort = () => { clearTimeout(timeout); reject(new Error('file_read_aborted')) }
    reader.readAsDataURL(file)
  })
}

async function fileToDownscaledBase64(file) {
  const MAX_EDGE = 2400
  const QUALITY = 0.88
  const dataUrl = await readAsDataUrl(file)
  const img = await loadImage(dataUrl)
  const { width, height } = img
  if (!width || !height) throw new Error('image_decode_failed')
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')
  ctx.drawImage(img, 0, 0, w, h)
  const out = canvas.toDataURL('image/jpeg', QUALITY)
  const comma = out.indexOf(',')
  return comma >= 0 ? out.slice(comma + 1) : ''
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
