import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'

const COLS = 'id,name,grape,region,country,body,tannin,sweetness,acidity,description,critic_score,price_usd,color'

function dist(a: number, b: number) { return (a - b) ** 2 }

function euclidean(
  row: Record<string, unknown>,
  body: number, tannin: number, acidity: number, sweetness: number
): number {
  const rb = typeof row.body === 'number' ? row.body : 50
  const rt = typeof row.tannin === 'number' ? row.tannin : 50
  const ra = typeof row.acidity === 'number' ? row.acidity : 50
  const rs = typeof row.sweetness === 'number' ? row.sweetness : 50
  return Math.sqrt(dist(rb, body) + dist(rt, tannin) + dist(ra, acidity) + dist(rs, sweetness))
}

// Normalize a grape/region string for loose matching
function norm(s: unknown): string {
  return typeof s === 'string' ? s.toLowerCase().trim() : ''
}

function isSameGrapeAndRegion(
  row: Record<string, unknown>,
  sourceGrape: string,
  sourceRegion: string
): boolean {
  if (!sourceGrape || !sourceRegion) return false
  const rg = norm(row.grape)
  const rr = norm(row.region)
  // Exclude only if BOTH grape and region overlap — stylistic siblings need at least one dimension different
  const grapeMatch = rg.length > 0 && sourceGrape.length > 0 && (rg.includes(sourceGrape) || sourceGrape.includes(rg))
  const regionMatch = rr.length > 0 && sourceRegion.length > 0 && (rr.includes(sourceRegion) || sourceRegion.includes(rr))
  return grapeMatch && regionMatch
}

function toWine(row: Record<string, unknown>) {
  const price = typeof row.price_usd === 'number' ? row.price_usd : null
  const score = typeof row.critic_score === 'number' ? row.critic_score : null
  return {
    id: `cat_${row.id}`,
    _catalogId: row.id,
    name: row.name,
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

export const Route = createFileRoute('/api/similar-wines')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const catalogId = parseInt(url.searchParams.get('catalogId') ?? '', 10)
        const sourceBody = parseFloat(url.searchParams.get('body') ?? '50')
        const sourceTannin = parseFloat(url.searchParams.get('tannin') ?? '50')
        const sourceAcidity = parseFloat(url.searchParams.get('acidity') ?? '50')
        const sourceSweetness = parseFloat(url.searchParams.get('sweetness') ?? '50')
        const sourceGrape = norm(url.searchParams.get('grape') ?? '')
        const sourceRegion = norm(url.searchParams.get('region') ?? '')

        if (isNaN(catalogId)) {
          return Response.json({ wines: [] })
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
        })

        // Rough body filter for performance — fetch up to 120 candidates
        const bodyLo = Math.max(0, sourceBody - 38)
        const bodyHi = Math.min(100, sourceBody + 38)

        const { data, error } = await supabase
          .from('wine_catalog')
          .select(COLS)
          .neq('id', catalogId)
          .not('body', 'is', null)
          .not('tannin', 'is', null)
          .not('acidity', 'is', null)
          .not('sweetness', 'is', null)
          .gte('body', bodyLo)
          .lte('body', bodyHi)
          .not('name', 'is', null)
          .limit(120)

        if (error || !data?.length) {
          return Response.json({ wines: [] })
        }

        // Score and filter
        const scored = data
          .filter((row) => !isSameGrapeAndRegion(row, sourceGrape, sourceRegion))
          .map((row) => ({
            row,
            d: euclidean(row, sourceBody, sourceTannin, sourceAcidity, sourceSweetness),
          }))
          .sort((a, b) => a.d - b.d)

        // Pick 3 with grape diversity: prefer at least 2 different grapes
        const picked: typeof scored = []
        const usedGrapes = new Set<string>()

        for (const item of scored) {
          if (picked.length >= 6) break
          picked.push(item)
          const g = norm(item.row.grape)
          if (g) usedGrapes.add(g)
        }

        // Select 3 from top 6 maximizing grape diversity
        const final: Record<string, unknown>[] = []
        const finalGrapes = new Set<string>()

        for (const item of picked) {
          if (final.length >= 3) break
          const g = norm(item.row.grape)
          if (g && !finalGrapes.has(g)) {
            final.push(item.row)
            finalGrapes.add(g)
          }
        }

        // If we couldn't fill 3 with diverse grapes, fill remaining slots
        for (const item of picked) {
          if (final.length >= 3) break
          if (!final.includes(item.row)) final.push(item.row)
        }

        return Response.json({ wines: final.map(toWine) })
      },
    },
  },
})
