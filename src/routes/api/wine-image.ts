/**
 * GET /api/wine-image?name=Caymus+Cabernet+Sauvignon&catalog_id=123
 *
 * 1. If catalog_id is given and wine_catalog.image_url is already set → return it.
 * 2. Name-based cache lookup in Supabase.
 * 3. SerpAPI Google Images search for "<name> wine bottle".
 * 4. Cache result via service key (anon key lacks INSERT/UPDATE permission).
 * 5. Return { imageUrl: string | null }.
 *
 * Requires SERPAPI_KEY and SUPABASE_SERVICE_KEY Worker secrets.
 * Without SERPAPI_KEY, returns { imageUrl: null } (graceful degradation).
 * Without SUPABASE_SERVICE_KEY, images are served but not cached.
 */

import { createFileRoute } from '@tanstack/react-router'
import { createClient }    from '@supabase/supabase-js'

const SUPABASE_URL      = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'

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

        const serviceKey = (process.env as Record<string, string>).SUPABASE_SERVICE_KEY
        const supabaseWrite = serviceKey
          ? createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } })
          : null

        // 1. Check catalog by ID
        if (catalogId) {
          const { data } = await supabase
            .from('wine_catalog')
            .select('image_url')
            .eq('id', catalogId)
            .maybeSingle()
          if (data?.image_url) return Response.json({ imageUrl: data.image_url })
        }

        // 2. Name-based cache lookup
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

        // 3. SerpAPI Google Images search
        const serpApiKey = (process.env as Record<string, string>).SERPAPI_KEY
        if (!serpApiKey) return Response.json({ imageUrl: null })

        let imageUrl: string | null = null
        try {
          const query  = encodeURIComponent(`${name} wine bottle`)
          const apiUrl = `https://serpapi.com/search.json?engine=google_images&q=${query}&num=5&safe=active&api_key=${serpApiKey}`
          const res    = await fetch(apiUrl)
          if (res.ok) {
            const data = await res.json() as { images_results?: { original?: string; thumbnail?: string }[] }
            for (const img of data.images_results ?? []) {
              const src = img.original || img.thumbnail
              if (src?.startsWith('http')) {
                imageUrl = src
                break
              }
            }
          }
        } catch {
          // SerpAPI error — return without image
        }

        // 4. Cache result (requires service key — anon key is read-only)
        if (catalogId && supabaseWrite) {
          const { error } = await supabaseWrite
            .from('wine_catalog')
            .update({ image_url: imageUrl })
            .eq('id', catalogId)
          if (error) console.error('[wine-image] cache write error:', error.message)
        }

        return Response.json({ imageUrl })
      },
    },
  },
})
