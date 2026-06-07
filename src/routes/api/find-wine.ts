import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'
const MODEL = 'claude-haiku-4-5-20251001'
const COLS =
  'id,name,producer,vintage,grape,region,country,description,critic_score,price_usd,body,tannin,sweetness,acidity,color'

export const Route = createFileRoute('/api/find-wine')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { name?: unknown; vintage?: unknown }
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const name = typeof body.name === 'string' ? body.name.trim() : ''
        const vintage = typeof body.vintage === 'string' ? body.vintage.trim() : null
        if (!name) return Response.json({ error: 'name required' }, { status: 400 })

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
        })

        // 1. Supabase exact match
        const { data: exact, error: e1 } = await supabase
          .from('wine_catalog')
          .select(COLS)
          .ilike('name', name)
          .limit(1)
          .single()
        if (e1 && e1.code !== 'PGRST116') console.error('[find-wine] exact match error:', e1.message, '| name:', name)
        if (exact) return Response.json({ wine: _toWine(exact), source: 'catalog' })

        // 2. Supabase full-text search
        const q = name
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, '')
          .split(' ')
          .filter(Boolean)
          .join(' & ')
        if (q) {
          const { data: fts, error: e2 } = await supabase
            .from('wine_catalog')
            .select(COLS)
            .textSearch('name', q, { type: 'websearch', config: 'english' })
            .limit(1)
          if (e2) console.error('[find-wine] fts error:', e2.message, '| name:', name)
          if (fts?.length) return Response.json({ wine: _toWine(fts[0]), source: 'catalog' })
        }

        // 3. Claude AI lookup
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) return Response.json({ wine: null, source: 'not_found' })

        const client = new Anthropic({ apiKey })

        try {
          const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 512,
            tools: [
              {
                name: 'wine_info',
                description: 'Structured wine data for palate profiling',
                input_schema: {
                  type: 'object' as const,
                  properties: {
                    found: {
                      type: 'boolean',
                      description: 'Whether you recognize this wine',
                    },
                    name: { type: 'string' },
                    winery: { type: 'string' },
                    variety: { type: 'string', description: 'Primary grape variety' },
                    region: { type: 'string' },
                    country: { type: 'string' },
                    color: {
                      type: 'string',
                      description: 'red, white, rosé, sparkling, dessert, or fortified',
                    },
                    body: {
                      type: 'integer',
                      description: '0=very light, 100=very full-bodied',
                    },
                    tannin: {
                      type: 'integer',
                      description: '0=silky/none, 100=grippy/astringent',
                    },
                    sweetness: { type: 'integer', description: '0=bone dry, 100=very sweet' },
                    acidity: { type: 'integer', description: '0=flat, 100=very crisp/tart' },
                    description: { type: 'string' },
                    points: {
                      type: 'integer',
                      description: 'Typical critic score 80–100 (Wine Enthusiast / Wine Spectator scale), or omit if unknown',
                    },
                    pairings: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'List of 2–4 foods this wine pairs well with, e.g. "grilled salmon", "aged cheddar", "roast lamb"',
                    },
                  },
                  required: ['found'],
                },
              },
            ],
            tool_choice: { type: 'auto' as const },
            messages: [
              {
                role: 'user',
                content: `Look up this wine: "${name}"${vintage ? ` ${vintage}` : ''}. Provide accurate palate axes (body/tannin/sweetness/acidity on 0–100 scale) based on typical style for this wine or producer. Set found=false only if you have no knowledge of this wine at all.`,
              },
            ],
          })

          const toolBlock = msg.content.find((b) => b.type === 'tool_use')
          if (!toolBlock || toolBlock.type !== 'tool_use') {
            console.error('[find-wine] AI returned no tool call for:', name)
            return Response.json({ wine: null, source: 'not_found' })
          }

          const info = toolBlock.input as Record<string, unknown>
          if (!info.found) {
            console.warn('[find-wine] AI returned found=false for:', name)
            return Response.json({ wine: null, source: 'not_found' })
          }

          const clamp = (v: unknown) =>
            typeof v === 'number' ? Math.max(0, Math.min(100, Math.round(v))) : 50
          const clampPoints = (v: unknown) =>
            typeof v === 'number' ? Math.max(80, Math.min(100, Math.round(v))) : null

          const points = clampPoints(info.points)

          const wine = {
            id: `web_${Date.now()}`,
            name: (info.name as string) || name,
            winery: (info.winery as string) || null,
            vintage: vintage || null,
            grape: (info.variety as string) || null,
            region: (info.region as string) || null,
            country: (info.country as string) || null,
            color: (info.color as string) || null,
            body: clamp(info.body),
            tannin: clamp(info.tannin),
            sweetness: clamp(info.sweetness),
            acidity: clamp(info.acidity),
            tasting: (info.description as string) || null,
            rating: points,
            imageUrl: null,
            flavorTags: [] as string[],
            wineStyle: ['conventional'] as string[],
            adventurousness: 3,
            isValue: false,
            isCrowd: points != null && points >= 88,
            pairings: Array.isArray(info.pairings) ? (info.pairings as string[]) : [],
            retailers: [],
          }

          // Best-effort insert into catalog so future lookups are instant
          supabase
            .from('wine_catalog')
            .insert({
              name: wine.name,
              producer: wine.winery,
              vintage: wine.vintage ? parseInt(wine.vintage) : null,
              grape: wine.grape,
              region: wine.region,
              country: wine.country,
              color: wine.color,
              body: wine.body,
              tannin: wine.tannin,
              sweetness: wine.sweetness,
              acidity: wine.acidity,
              description: wine.tasting,
              critic_score: points,
              source: 'ai',
            })
            .catch(() => {})

          return Response.json({ wine, source: 'ai' })
        } catch (err) {
          console.error('[find-wine] AI stage threw:', err instanceof Error ? err.message : err, '| name:', name)
          return Response.json({ wine: null, source: 'error' })
        }
      },
    },
  },
})

function _toWine(row: Record<string, unknown>) {
  const price = typeof row.price_usd === 'number' ? row.price_usd : null
  const score = typeof row.critic_score === 'number' ? row.critic_score : null
  return {
    id: `cat_${row.id}`,
    _catalogId: row.id,
    name: row.name,
    winery: (row.producer as string) || null,
    vintage: row.vintage ? String(row.vintage) : null,
    grape: (row.grape as string) || null,
    region: (row.region as string) || null,
    country: (row.country as string) || null,
    color: (row.color as string) || null,
    body: typeof row.body === 'number' ? row.body : null,
    tannin: typeof row.tannin === 'number' ? row.tannin : null,
    sweetness: typeof row.sweetness === 'number' ? row.sweetness : null,
    acidity: typeof row.acidity === 'number' ? row.acidity : null,
    tasting: (row.description as string) || null,
    rating: score,
    price: price != null ? `$${price}` : null,
    priceNum: price,
    imageUrl: null,
    flavorTags: [],
    wineStyle: ['conventional'],
    adventurousness: 3,
    isValue: price != null && score != null && score >= 90 && price <= 30,
    isCrowd: score != null && score >= 88,
    pairings: [],
    retailers: [],
  }
}
