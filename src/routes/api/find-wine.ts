import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'
const MODEL = 'claude-haiku-4-5-20251001'
const COLS =
  'id,name,producer,vintage,grape,region,country,description,critic_score,price_usd,body,tannin,sweetness,acidity,color'

const CREDIBLE_DOMAINS = ['winemag.com', 'wine-searcher.com', 'vivino.com']

const WINE_INFO_TOOL = {
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
      body: { type: 'integer', description: '0=very light, 100=very full-bodied' },
      tannin: { type: 'integer', description: '0=silky/none, 100=grippy/astringent' },
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
        description: 'List of 2–4 foods this wine pairs well with, e.g. "grilled salmon", "aged cheddar"',
      },
    },
    required: ['found'],
  },
}

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

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) return Response.json({ wine: null, source: 'not_found' })

        const anthropic = new Anthropic({ apiKey })

        // 3. SerpAPI web search against credible wine domains
        const serpApiKey = (process.env as Record<string, string>).SERPAPI_KEY
        if (serpApiKey) {
          try {
            const query = encodeURIComponent(
              `"${name}"${vintage ? ` ${vintage}` : ''} wine site:winemag.com OR site:wine-searcher.com OR site:vivino.com`
            )
            const searchUrl = `https://serpapi.com/search.json?engine=google&q=${query}&num=5&api_key=${serpApiKey}`
            const searchRes = await fetch(searchUrl)

            if (searchRes.ok) {
              const searchData = (await searchRes.json()) as {
                organic_results?: { title?: string; snippet?: string; link?: string }[]
              }

              const snippets = (searchData.organic_results ?? [])
                .filter((r) => CREDIBLE_DOMAINS.some((d) => r.link?.includes(d)))
                .slice(0, 4)
                .map((r) => `${r.title ?? ''}\n${r.snippet ?? ''}`.trim())
                .filter(Boolean)

              if (snippets.length > 0) {
                const prompt =
                  `Extract structured wine data for "${name}"${vintage ? ` ${vintage}` : ''} ` +
                  `from these search results only. Do not add any information not present in the snippets. ` +
                  `Set found=false if the snippets do not clearly describe this specific wine.\n\n` +
                  snippets.join('\n\n---\n\n')

                const info = await _askClaude(anthropic, prompt)
                if (info) {
                  const wine = _buildWine(info, name, vintage)
                  _cacheWine(supabase, wine, 'web')
                  return Response.json({ wine, source: 'web' })
                }
              }
            }
          } catch {
            // SerpAPI error — fall through to Claude AI fallback
          }
        }

        // 4. Claude AI fallback (training data memory)
        const aiPrompt =
          `Look up this wine: "${name}"${vintage ? ` ${vintage}` : ''}. ` +
          `Provide accurate palate axes (body/tannin/sweetness/acidity on 0–100 scale) based on typical style ` +
          `for this wine or producer. Set found=false only if you have no knowledge of this wine at all.`

        const info = await _askClaude(anthropic, aiPrompt)
        if (!info) {
          console.warn('[find-wine] AI returned found=false for:', name)
          return Response.json({ wine: null, source: 'not_found' })
        }

        const wine = _buildWine(info, name, vintage)
        _cacheWine(supabase, wine, 'ai')
        return Response.json({ wine, source: 'ai' })
      },
    },
  },
})

async function _askClaude(
  client: Anthropic,
  prompt: string
): Promise<Record<string, unknown> | null> {
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      tools: [WINE_INFO_TOOL],
      tool_choice: { type: 'auto' as const },
      messages: [{ role: 'user', content: prompt }],
    })
    const toolBlock = msg.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return null
    const info = toolBlock.input as Record<string, unknown>
    return info.found ? info : null
  } catch (err) {
    console.error('[find-wine] Claude call failed:', err instanceof Error ? err.message : err)
    return null
  }
}

function _buildWine(info: Record<string, unknown>, name: string, vintage: string | null) {
  const clamp = (v: unknown) =>
    typeof v === 'number' ? Math.max(0, Math.min(100, Math.round(v))) : 50
  const clampPoints = (v: unknown) =>
    typeof v === 'number' ? Math.max(80, Math.min(100, Math.round(v))) : null

  const points = clampPoints(info.points)

  return {
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _cacheWine(supabase: any, wine: ReturnType<typeof _buildWine>, source: string) {
  // Fire-and-forget: check by name first to avoid accumulating duplicates
  supabase
    .from('wine_catalog')
    .select('id')
    .ilike('name', wine.name)
    .limit(1)
    .maybeSingle()
    .then(({ data }: { data: unknown }) => {
      if (data) return
      supabase
        .from('wine_catalog')
        .insert({
          name: wine.name,
          producer: wine.winery,
          vintage: wine.vintage ? parseInt(wine.vintage) : null,
          grape: wine.grape,
          region: wine.region,
          country: wine.country,
          color: wine.color ?? 'red',
          body: wine.body,
          tannin: wine.tannin,
          sweetness: wine.sweetness,
          acidity: wine.acidity,
          description: wine.tasting,
          critic_score: wine.rating,
          source,
        })
        .then(() => {})
        .catch(() => {})
    })
    .catch(() => {})
}

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
