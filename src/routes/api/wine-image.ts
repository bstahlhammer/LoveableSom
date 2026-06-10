/**
 * GET /api/wine-image?name=Caymus+Cabernet+Sauvignon&catalog_id=123
 *
 * Source cascade (first hit wins):
 *   1. Supabase cache by catalog_id
 *   2. Supabase cache by name
 *   3. Wikipedia/Wikidata     — free, no key, reliable from any IP (famous wineries)
 *   4. Google Custom Search Engine  — 100 searches/day free (GOOGLE_CSE_KEY + GOOGLE_CSE_ID)
 *   5. Bing Image Search            — 1,000 searches/month free (BING_IMAGE_KEY)
 *   6. SerpAPI Google Images        — 100 searches/month free (SERPAPI_KEY)
 *   7. null (graceful degradation)
 *
 * URL validation: rejects explicit 4xx responses; accepts timeouts / wrong content-type
 * to avoid falsely dropping valid CDN-served images.
 *
 * Results cached in wine_catalog.image_url via SUPABASE_SERVICE_KEY.
 * All secrets are Cloudflare Worker secrets set via `wrangler secret put`.
 */

import { createFileRoute } from '@tanstack/react-router'
import { createClient }    from '@supabase/supabase-js'

const SUPABASE_URL      = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'

const env = () => process.env as Record<string, string>

// ---------------------------------------------------------------------------
// Soft URL validation — rejects explicit 4xx only; network errors = keep URL
// Many CDNs respond oddly to HEAD requests from datacenter IPs, so we only
// drop URLs we know are dead (404/403/410 etc.).
// ---------------------------------------------------------------------------
async function isLiveUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.status < 400
  } catch {
    return true // network error ≠ dead URL; let it through
  }
}

// ---------------------------------------------------------------------------
// Source: Wikipedia — free, no key, reliable from any IP
// Looks up the winery/wine name and returns the article's lead image.
// Coverage is best for famous producers (Opus One, Silver Oak, etc.).
// ---------------------------------------------------------------------------
async function tryWikipedia(name: string): Promise<string | null> {
  // Strip common vintage/varietal suffixes to improve article matching
  const winery = name.replace(/\b(cabernet|sauvignon|merlot|chardonnay|pinot|noir|grigio|blanc|riesling|zinfandel|syrah|shiraz|rose|rosé|\d{4})\b/gi, '').trim()
  try {
    const title = encodeURIComponent(winery)
    const url   = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages&format=json&pithumbsize=600`
    const res   = await fetch(url, { headers: { 'User-Agent': 'Uncork/1.0 (wine app)' } })
    if (!res.ok) return null
    const data  = await res.json() as {
      query: { pages: Record<string, { thumbnail?: { source?: string }; missing?: string }> }
    }
    for (const page of Object.values(data.query.pages)) {
      if (page.missing !== undefined) continue
      const src = page.thumbnail?.source
      if (src && await isLiveUrl(src)) return src
    }
  } catch {
    // fall through
  }
  return null
}

// ---------------------------------------------------------------------------
// Source: Google Custom Search Engine
// ---------------------------------------------------------------------------
async function tryGoogleCSE(name: string): Promise<string | null> {
  const key = env().GOOGLE_CSE_KEY
  const cx  = env().GOOGLE_CSE_ID
  if (!key || !cx) return null
  try {
    const q   = encodeURIComponent(`${name} wine bottle`)
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${q}&searchType=image&num=5&safe=active`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json() as { items?: { link?: string }[] }
    for (const item of data.items ?? []) {
      if (item.link?.startsWith('http')) return item.link
    }
  } catch {
    // fall through
  }
  return null
}

// ---------------------------------------------------------------------------
// Source: Bing Image Search
// ---------------------------------------------------------------------------
async function tryBing(name: string): Promise<string | null> {
  const key = env().BING_IMAGE_KEY
  if (!key) return null
  try {
    const q   = encodeURIComponent(`${name} wine bottle`)
    const url = `https://api.bing.microsoft.com/v7.0/images/search?q=${q}&count=5&imageType=Photo&safeSearch=Moderate`
    const res = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key } })
    if (!res.ok) return null
    const data = await res.json() as { value?: { contentUrl?: string }[] }
    for (const img of data.value ?? []) {
      if (img.contentUrl?.startsWith('http')) return img.contentUrl
    }
  } catch {
    // fall through
  }
  return null
}

// ---------------------------------------------------------------------------
// Source: SerpAPI Google Images
// ---------------------------------------------------------------------------
async function trySerpAPI(name: string): Promise<string | null> {
  const key = env().SERPAPI_KEY
  if (!key) return null
  try {
    const q   = encodeURIComponent(`${name} wine bottle`)
    const url = `https://serpapi.com/search.json?engine=google_images&q=${q}&num=5&safe=active&api_key=${key}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json() as { images_results?: { original?: string; thumbnail?: string }[] }
    for (const img of data.images_results ?? []) {
      const src = img.original || img.thumbnail
      if (src?.startsWith('http')) return src
    }
  } catch {
    // fall through
  }
  return null
}

export const Route = createFileRoute('/api/wine-image')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url       = new URL(request.url)
        const name      = url.searchParams.get('name')?.trim()
        const catalogId = url.searchParams.get('catalog_id')

        if (!name) {
          return Response.json({ imageUrl: null, error: 'missing name' }, { status: 400 })
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
        })
        const serviceKey    = env().SUPABASE_SERVICE_KEY
        const supabaseWrite = serviceKey
          ? createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } })
          : null

        // 1. Cache hit by catalog ID
        if (catalogId) {
          const { data } = await supabase
            .from('wine_catalog')
            .select('image_url')
            .eq('id', catalogId)
            .maybeSingle()
          if (data?.image_url) return Response.json({ imageUrl: data.image_url })
        }

        // 2. Cache hit by name
        const { data: byName } = await supabase
          .from('wine_catalog')
          .select('image_url')
          .ilike('name', name)
          .not('image_url', 'is', null)
          .limit(1)
          .maybeSingle()

        if (byName?.image_url) {
          if (catalogId && supabaseWrite) {
            await supabaseWrite.from('wine_catalog')
              .update({ image_url: byName.image_url })
              .eq('id', catalogId)
          }
          return Response.json({ imageUrl: byName.image_url })
        }

        // 3–6. Live search cascade: Wikipedia → Google CSE → Bing → SerpAPI
        const imageUrl =
          await tryWikipedia(name) ??
          await tryGoogleCSE(name) ??
          await tryBing(name)      ??
          await trySerpAPI(name)

        // Cache result
        if (imageUrl && catalogId && supabaseWrite) {
          const { error } = await supabaseWrite
            .from('wine_catalog')
            .update({ image_url: imageUrl })
            .eq('id', catalogId)
          if (error) console.error('[wine-image] cache write error:', error.message)
        }

        return Response.json({ imageUrl: imageUrl ?? null })
      },
    },
  },
})
