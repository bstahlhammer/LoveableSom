/**
 * One-time script to seed common US grocery/restaurant wines into wine_catalog.
 * Checks for existing entries before inserting (idempotent).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/seed-common-wines.mjs
 *
 * Optional: BATCH_SIZE=15  DELAY_MS=600
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'
const MODEL = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? '10', 10)
const DELAY_MS = parseInt(process.env.DELAY_MS ?? '800', 10)

// ── Wine list ────────────────────────────────────────────────────────────────
// Format: [name, variety, region, country]
const WINES = [
  // Grocery staples
  ['Meiomi Pinot Noir',                        'Pinot Noir',            'California',         'US'],
  ['Meiomi Cabernet Sauvignon',                'Cabernet Sauvignon',    'California',         'US'],
  ['Meiomi Rosé',                              'Rosé',                  'California',         'US'],
  ['Josh Cellars Cabernet Sauvignon',          'Cabernet Sauvignon',    'California',         'US'],
  ['Josh Cellars Chardonnay',                  'Chardonnay',            'California',         'US'],
  ['Josh Cellars Pinot Noir',                  'Pinot Noir',            'California',         'US'],
  ['Josh Cellars Sauvignon Blanc',             'Sauvignon Blanc',       'California',         'US'],
  ['Josh Cellars Prosecco',                    'Glera',                 'Veneto',             'Italy'],
  ['Kim Crawford Sauvignon Blanc',             'Sauvignon Blanc',       'Marlborough',        'New Zealand'],
  ['Kim Crawford Pinot Gris',                  'Pinot Gris',            'Hawke\'s Bay',       'New Zealand'],
  ['Kim Crawford Pinot Noir',                  'Pinot Noir',            'Marlborough',        'New Zealand'],
  ['Whispering Angel Rosé',                    'Rosé blend',            'Côtes de Provence',  'France'],
  ['19 Crimes Red Blend',                      'Red blend',             'South Eastern Australia', 'Australia'],
  ['19 Crimes Cabernet Sauvignon',             'Cabernet Sauvignon',    'South Eastern Australia', 'Australia'],
  ['19 Crimes Chardonnay',                     'Chardonnay',            'South Eastern Australia', 'Australia'],
  ['19 Crimes Rosé',                           'Rosé blend',            'South Eastern Australia', 'Australia'],
  ['Apothic Red',                              'Red blend',             'California',         'US'],
  ['Apothic Dark',                             'Red blend',             'California',         'US'],
  ['Apothic Inferno',                          'Red blend',             'California',         'US'],
  ['Apothic Rosé',                             'Rosé blend',            'California',         'US'],
  ['Dark Horse Cabernet Sauvignon',            'Cabernet Sauvignon',    'California',         'US'],
  ['Dark Horse Chardonnay',                    'Chardonnay',            'California',         'US'],
  ['Dark Horse Rosé',                          'Rosé blend',            'California',         'US'],
  ['La Crema Pinot Noir',                      'Pinot Noir',            'Sonoma Coast',       'US'],
  ['La Crema Chardonnay',                      'Chardonnay',            'Sonoma Coast',       'US'],
  ['La Crema Rosé',                            'Rosé',                  'Sonoma Coast',       'US'],
  ['Bread & Butter Pinot Noir',                'Pinot Noir',            'California',         'US'],
  ['Bread & Butter Chardonnay',                'Chardonnay',            'California',         'US'],
  ['Bread & Butter Sauvignon Blanc',           'Sauvignon Blanc',       'California',         'US'],
  ['Mark West Pinot Noir',                     'Pinot Noir',            'California',         'US'],
  ['Cupcake Malbec',                           'Malbec',                'Mendoza',            'Argentina'],
  ['Cupcake Sauvignon Blanc',                  'Sauvignon Blanc',       'Marlborough',        'New Zealand'],
  ['Cupcake Chardonnay',                       'Chardonnay',            'California',         'US'],
  ['Cupcake Pinot Noir',                       'Pinot Noir',            'California',         'US'],
  ['Barefoot Pinot Grigio',                    'Pinot Grigio',          'California',         'US'],
  ['Barefoot Chardonnay',                      'Chardonnay',            'California',         'US'],
  ['Barefoot Merlot',                          'Merlot',                'California',         'US'],
  ['Barefoot Cabernet Sauvignon',              'Cabernet Sauvignon',    'California',         'US'],
  ['Barefoot Moscato',                         'Muscat',                'California',         'US'],
  ['Bota Box Cabernet Sauvignon',              'Cabernet Sauvignon',    'California',         'US'],
  ['Bota Box Pinot Grigio',                    'Pinot Grigio',          'California',         'US'],
  ['Bota Box Chardonnay',                      'Chardonnay',            'California',         'US'],
  ['Bota Box Merlot',                          'Merlot',                'California',         'US'],
  ['Yellow Tail Chardonnay',                   'Chardonnay',            'South Eastern Australia', 'Australia'],
  ['Yellow Tail Shiraz',                       'Syrah',                 'South Eastern Australia', 'Australia'],
  ['Yellow Tail Cabernet Sauvignon',           'Cabernet Sauvignon',    'South Eastern Australia', 'Australia'],
  ['Yellow Tail Pinot Grigio',                 'Pinot Grigio',          'South Eastern Australia', 'Australia'],
  ['Woodbridge Cabernet Sauvignon',            'Cabernet Sauvignon',    'California',         'US'],
  ['Woodbridge Chardonnay',                    'Chardonnay',            'California',         'US'],
  ['Woodbridge Pinot Noir',                    'Pinot Noir',            'California',         'US'],
  ['Bogle Cabernet Sauvignon',                 'Cabernet Sauvignon',    'California',         'US'],
  ['Bogle Old Vine Zinfandel',                 'Zinfandel',             'California',         'US'],
  ['Bogle Phantom',                            'Red blend',             'California',         'US'],
  ['Gnarly Head Old Vine Zin',                 'Zinfandel',             'Lodi',               'US'],
  ['Gnarly Head 1924 Double Black',            'Red blend',             'Lodi',               'US'],

  // Mid-tier / restaurant pours
  ['The Prisoner',                             'Red blend',             'Napa Valley',        'US'],
  ['The Prisoner Chardonnay',                  'Chardonnay',            'California',         'US'],
  ['The Prisoner Rosé',                        'Rosé blend',            'California',         'US'],
  ['Decoy Cabernet Sauvignon',                 'Cabernet Sauvignon',    'Sonoma County',      'US'],
  ['Decoy Pinot Noir',                         'Pinot Noir',            'Sonoma County',      'US'],
  ['Decoy Chardonnay',                         'Chardonnay',            'Sonoma County',      'US'],
  ['Decoy Rosé',                               'Rosé',                  'Sonoma County',      'US'],
  ['Ferrari-Carano Chardonnay',                'Chardonnay',            'Sonoma County',      'US'],
  ['Ferrari-Carano Fumé Blanc',                'Sauvignon Blanc',       'Sonoma County',      'US'],
  ['Rombauer Chardonnay',                      'Chardonnay',            'Carneros',           'US'],
  ['Rombauer Zinfandel',                       'Zinfandel',             'Sierra Foothills',   'US'],
  ['Sonoma-Cutrer Russian River Ranches',      'Chardonnay',            'Russian River Valley', 'US'],
  ['Sonoma-Cutrer The Cutrer',                 'Chardonnay',            'Sonoma Coast',       'US'],
  ['Kendall-Jackson Vintner\'s Reserve Chardonnay', 'Chardonnay',       'California',         'US'],
  ['Kendall-Jackson Vintner\'s Reserve Cabernet Sauvignon', 'Cabernet Sauvignon', 'California', 'US'],
  ['Kendall-Jackson Vintner\'s Reserve Pinot Noir', 'Pinot Noir',       'California',         'US'],
  ['Robert Mondavi Private Selection Cabernet Sauvignon', 'Cabernet Sauvignon', 'Central Coast', 'US'],
  ['Robert Mondavi Private Selection Chardonnay', 'Chardonnay',         'Central Coast',      'US'],
  ['Chateau Ste Michelle Riesling',            'Riesling',              'Columbia Valley',    'US'],
  ['Chateau Ste Michelle Cabernet Sauvignon',  'Cabernet Sauvignon',    'Columbia Valley',    'US'],
  ['Chateau Ste Michelle Chardonnay',          'Chardonnay',            'Columbia Valley',    'US'],
  ['La Marca Prosecco',                        'Glera',                 'Veneto',             'Italy'],
  ['Mionetto Prosecco',                        'Glera',                 'Veneto',             'Italy'],
  ['Lunetta Prosecco',                         'Glera',                 'Treviso',            'Italy'],
  ['Angeline Pinot Noir',                      'Pinot Noir',            'California',         'US'],
  ['Seaglass Sauvignon Blanc',                 'Sauvignon Blanc',       'California',         'US'],
  ['Seaglass Pinot Noir',                      'Pinot Noir',            'California',         'US'],
  ['Seaglass Rosé',                            'Rosé',                  'California',         'US'],
  ['Charles & Charles Rosé',                   'Rosé blend',            'Columbia Valley',    'US'],
  ['Charles & Charles Red Blend',              'Red blend',             'Columbia Valley',    'US'],
  ['Underwood Pinot Noir',                     'Pinot Noir',            'Oregon',             'US'],
  ['Underwood Pinot Gris',                     'Pinot Gris',            'Oregon',             'US'],
  ['Underwood Rosé',                           'Rosé',                  'Oregon',             'US'],
  ['Saved Red Blend',                          'Red blend',             'California',         'US'],
  ['Saved Rosé',                               'Rosé',                  'California',         'US'],

  // On-premise staples
  ['Cooper & Thief Red Wine Blend',            'Red blend',             'California',         'US'],
  ['Cooper & Thief Chardonnay',                'Chardonnay',            'California',         'US'],
  ['Cooper & Thief Cabernet Sauvignon',        'Cabernet Sauvignon',    'California',         'US'],
  ['Pessimist Red Blend',                      'Red blend',             'Paso Robles',        'US'],
  ['Pessimist Cabernet Sauvignon',             'Cabernet Sauvignon',    'Paso Robles',        'US'],
  ['The Federalist Bourbon Barrel Cabernet Sauvignon', 'Cabernet Sauvignon', 'Lodi',           'US'],
  ['Rabble Red Blend',                         'Red blend',             'Paso Robles',        'US'],
  ['Rabble Cabernet Sauvignon',                'Cabernet Sauvignon',    'Paso Robles',        'US'],
  ['Orin Swift Abstract',                      'Red blend',             'California',         'US'],
  ['Orin Swift Machete',                       'Red blend',             'California',         'US'],
  ['Orin Swift Mercury Head',                  'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Orin Swift Papillon',                      'Red blend',             'Napa Valley',        'US'],
  ['Orin Swift D66',                           'Red blend',             'Languedoc',          'France'],
  ['Joel Gott 815 Cabernet Sauvignon',         'Cabernet Sauvignon',    'California',         'US'],
  ['Joel Gott Pinot Noir',                     'Pinot Noir',            'California',         'US'],
  ['Layer Cake Cabernet Sauvignon',            'Cabernet Sauvignon',    'California',         'US'],
  ['Layer Cake Primitivo',                     'Primitivo',             'Puglia',             'Italy'],
  ['Layer Cake Malbec',                        'Malbec',                'Mendoza',            'Argentina'],
  ['Layer Cake Merlot',                        'Merlot',                'California',         'US'],
  ['Earthquake Cabernet Sauvignon',            'Cabernet Sauvignon',    'Lodi',               'US'],
  ['Earthquake Petite Sirah',                  'Petite Sirah',          'Lodi',               'US'],
  ['Earthquake Zinfandel',                     'Zinfandel',             'Lodi',               'US'],
  ['Predator Cabernet Sauvignon',              'Cabernet Sauvignon',    'Lodi',               'US'],
  ['Ménage à Trois Red',                       'Red blend',             'California',         'US'],
  ['Ménage à Trois Chardonnay',                'Chardonnay',            'California',         'US'],
  ['Ménage à Trois Rosé',                      'Rosé blend',            'California',         'US'],
  ['Conundrum White',                          'White blend',           'California',         'US'],
  ['Conundrum Red',                            'Red blend',             'California',         'US'],
  ['7 Deadly Zins',                            'Zinfandel',             'Lodi',               'US'],
  ['Notorious Pink Rosé',                      'Rosé blend',            'Languedoc',          'France'],
  ['Francis Ford Coppola Diamond Collection Black Label Claret', 'Cabernet Sauvignon', 'California', 'US'],
  ['Francis Ford Coppola Director\'s Cut Cabernet Sauvignon', 'Cabernet Sauvignon', 'Alexander Valley', 'US'],
  ['Wente Morning Fog Chardonnay',             'Chardonnay',            'Livermore Valley',   'US'],
  ['The Walking Dead Cabernet Sauvignon',      'Cabernet Sauvignon',    'California',         'US'],
  ['Mashed Cabernet Sauvignon',                'Cabernet Sauvignon',    'California',         'US'],
  ['Rex Goliath Cabernet Sauvignon',           'Cabernet Sauvignon',    'California',         'US'],
  ['Smoking Loon Cabernet Sauvignon',          'Cabernet Sauvignon',    'California',         'US'],
  ['Smoking Loon Pinot Noir',                  'Pinot Noir',            'California',         'US'],
  ['Storypoint Cabernet Sauvignon',            'Cabernet Sauvignon',    'California',         'US'],
  ['Storypoint Chardonnay',                    'Chardonnay',            'California',         'US'],
  ['Daou Cabernet Sauvignon',                  'Cabernet Sauvignon',    'Paso Robles',        'US'],
  ['Daou Reserve Cabernet Sauvignon',          'Cabernet Sauvignon',    'Paso Robles',        'US'],
  ['Coppola Sofia Blanc de Blancs',            'Pinot Blanc',           'Monterey',           'US'],
  ['Liberty School Cabernet Sauvignon',        'Cabernet Sauvignon',    'Paso Robles',        'US'],
  ['Treana Red Blend',                         'Red blend',             'Paso Robles',        'US'],

  // Premium restaurant / by-the-glass
  ['Caymus Cabernet Sauvignon',                'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Caymus Special Selection Cabernet Sauvignon', 'Cabernet Sauvignon', 'Napa Valley',        'US'],
  ['Jordan Cabernet Sauvignon',                'Cabernet Sauvignon',    'Alexander Valley',   'US'],
  ['Jordan Chardonnay',                        'Chardonnay',            'Russian River Valley', 'US'],
  ['Duckhorn Merlot',                          'Merlot',                'Napa Valley',        'US'],
  ['Duckhorn Cabernet Sauvignon',              'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Flowers Pinot Noir',                       'Pinot Noir',            'Sonoma Coast',       'US'],
  ['Flowers Chardonnay',                       'Chardonnay',            'Sonoma Coast',       'US'],
  ['Cakebread Chardonnay',                     'Chardonnay',            'Napa Valley',        'US'],
  ['Cakebread Cabernet Sauvignon',             'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Far Niente Chardonnay',                    'Chardonnay',            'Napa Valley',        'US'],
  ['Far Niente Cabernet Sauvignon',            'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Shafer One Point Five Cabernet Sauvignon', 'Cabernet Sauvignon',    'Stags Leap District', 'US'],
  ['Shafer Hillside Select Cabernet Sauvignon','Cabernet Sauvignon',    'Stags Leap District', 'US'],
  ['Silver Oak Alexander Valley Cabernet Sauvignon', 'Cabernet Sauvignon', 'Alexander Valley', 'US'],
  ['Silver Oak Napa Valley Cabernet Sauvignon','Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Kosta Browne Pinot Noir',                  'Pinot Noir',            'Russian River Valley', 'US'],
  ['Sea Smoke Southing Pinot Noir',            'Pinot Noir',            'Santa Rita Hills',   'US'],
  ['Sea Smoke Botella Pinot Noir',             'Pinot Noir',            'Santa Rita Hills',   'US'],
  ['Stag\'s Leap Wine Cellars Artemis',        'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Stag\'s Leap Wine Cellars Karia',          'Chardonnay',            'Napa Valley',        'US'],
  ['Stags\' Leap Winery Petite Sirah',         'Petite Sirah',          'Napa Valley',        'US'],
  ['Darioush Cabernet Sauvignon',              'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Beringer Private Reserve Cabernet Sauvignon', 'Cabernet Sauvignon', 'Napa Valley',        'US'],
  ['Beringer Private Reserve Chardonnay',      'Chardonnay',            'Napa Valley',        'US'],
  ['Simi Chardonnay',                          'Chardonnay',            'Sonoma County',      'US'],
  ['Simi Cabernet Sauvignon',                  'Cabernet Sauvignon',    'Alexander Valley',   'US'],
  ['Franciscan Estate Cabernet Sauvignon',     'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Franciscan Estate Chardonnay',             'Chardonnay',            'Napa Valley',        'US'],
  ['Cloudy Bay Sauvignon Blanc',               'Sauvignon Blanc',       'Marlborough',        'New Zealand'],
  ['Cloudy Bay Pinot Noir',                    'Pinot Noir',            'Marlborough',        'New Zealand'],
  ['Opus One',                                 'Cabernet Sauvignon blend', 'Napa Valley',      'US'],
  ['Penfolds Bin 389 Cabernet Shiraz',         'Cabernet Sauvignon blend', 'South Australia',  'Australia'],
  ['Penfolds Bin 407 Cabernet Sauvignon',      'Cabernet Sauvignon',    'South Australia',    'Australia'],
  ['Penfolds Bin 28 Kalimna Shiraz',           'Syrah',                 'South Australia',    'Australia'],
  ['Penfolds St Henri Shiraz',                 'Syrah',                 'South Australia',    'Australia'],
  ['Penfolds Grange',                          'Syrah',                 'South Australia',    'Australia'],
  ['St. Supery Sauvignon Blanc',               'Sauvignon Blanc',       'Napa Valley',        'US'],
  ['St. Supery Cabernet Sauvignon',            'Cabernet Sauvignon',    'Napa Valley',        'US'],
  ['Schramsberg Blanc de Blancs',              'Chardonnay',            'North Coast',        'US'],
  ['Schramsberg Blanc de Noirs',               'Pinot Noir',            'North Coast',        'US'],
  ['Gruet Brut',                               'Chardonnay blend',      'New Mexico',         'US'],
]

// ── Helpers ──────────────────────────────────────────────────────────────────
const clamp = v => typeof v === 'number' ? Math.max(0, Math.min(100, Math.round(v))) : null

async function paletteForBatch(client, wines) {
  const names = wines.map(w => w.name)

  const prompt = `You are a wine reference. For each wine in this list, return palate profile data.

Rules:
- body: 0 (very light body) to 100 (very full body)
- tannin: 0 (none/silky) to 100 (very grippy/astringent). Use 0-8 for whites and rosés.
- sweetness: 0 (bone dry) to 100 (very sweet)
- acidity: 0 (flat) to 100 (very crisp/tart)
- color: one of "red", "white", "rosé", "sparkling", "dessert", "fortified"
- description: one short sentence tasting note, or null
- If you don't recognize the wine or are not confident, set body to null (all other fields can also be null).

Return ONLY a JSON array — no markdown, no code fences, no explanation.
Array length must equal input length. Preserve order.

Wines:
${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed) || parsed.length !== wines.length) {
    throw new Error(`Expected ${wines.length} results, got ${parsed.length}`)
  }
  return parsed
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required')
    console.error('Usage: ANTHROPIC_API_KEY=sk-... node scripts/seed-common-wines.mjs')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

  console.log(`Checking ${WINES.length} wines against catalog...`)

  // ── Pass 1: check which wines already exist ───────────────────────────────
  const toEnrich = []
  let skipped = 0
  for (const wine of WINES) {
    const [name] = wine
    const { data } = await supabase
      .from('wine_catalog')
      .select('id')
      .ilike('name', name)
      .limit(1)
    if (data?.length) {
      process.stdout.write('.')
      skipped++
    } else {
      toEnrich.push({ name: wine[0], variety: wine[1], region: wine[2], country: wine[3] })
    }
  }
  console.log(`\n${skipped} already in catalog. Enriching ${toEnrich.length} missing wines...`)

  if (toEnrich.length === 0) {
    console.log('Nothing to do!')
    return
  }

  // ── Pass 2: enrich in batches ─────────────────────────────────────────────
  let inserted = 0
  let unknown = 0
  let errors = 0

  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    const batch = toEnrich.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(toEnrich.length / BATCH_SIZE)
    process.stdout.write(`\nBatch ${batchNum}/${totalBatches}: `)

    let results
    try {
      results = await paletteForBatch(client, batch)
    } catch (err) {
      console.error(`\n  Batch failed: ${err.message}`)
      errors += batch.length
      continue
    }

    for (let j = 0; j < batch.length; j++) {
      const wine = batch[j]
      const r = results[j]

      if (!r || r.body == null) {
        process.stdout.write('?')
        unknown++
        continue
      }

      const { error } = await supabase.from('wine_catalog').insert({
        name:        wine.name,
        grape:       wine.variety,
        region:      wine.region,
        country:     wine.country,
        color:       r.color || null,
        body:        clamp(r.body),
        tannin:      clamp(r.tannin),
        sweetness:   clamp(r.sweetness),
        acidity:     clamp(r.acidity),
        description: typeof r.description === 'string' ? r.description : null,
        source:      'seed',
      })

      if (error) {
        process.stdout.write('✗')
        console.error(`\n  Insert error for "${wine.name}": ${error.message}`)
        errors++
      } else {
        process.stdout.write('✓')
        inserted++
      }
    }

    if (i + BATCH_SIZE < toEnrich.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n\nDone!`)
  console.log(`  ✓ Inserted:  ${inserted}`)
  console.log(`  ? Unknown:   ${unknown}  (AI had no data — OK to skip)`)
  console.log(`  ✗ Errors:    ${errors}`)
  console.log(`  → Skipped:   ${skipped}  (already in catalog)`)
}

main().catch(err => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
