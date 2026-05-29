/**
 * enrich-flavor-profiles.mjs
 *
 * Reads every wine in the Supabase wine_catalog and writes back:
 *   flavor_tags     TEXT[]   — aroma/flavor categories
 *   wine_style      TEXT[]   — natural / biodynamic / conventional / etc.
 *   adventurousness SMALLINT — 1 (crowd-pleaser) → 10 (challenging/natural)
 *
 * Run from the project root after ingestion:
 *
 *   node enrich-flavor-profiles.mjs --dry-run       # preview 5 wines
 *   SUPABASE_SERVICE_KEY=… node enrich-flavor-profiles.mjs
 *   SUPABASE_SERVICE_KEY=… node enrich-flavor-profiles.mjs --limit 1000
 *   SUPABASE_SERVICE_KEY=… node enrich-flavor-profiles.mjs --after-id 50000
 */

import { createClient } from '@supabase/supabase-js'

// ── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL        = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const BATCH               = 500

// ── Args ───────────────────────────────────────────────────────────────────

const argv    = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const LIMIT   = (() => { const i = argv.indexOf('--limit');    return i >= 0 ? Number(argv[i+1]) : Infinity })()
const AFTER_ID = (() => { const i = argv.indexOf('--after-id'); return i >= 0 ? Number(argv[i+1]) : 0 })()

// ── Flavor tag detection ────────────────────────────────────────────────────

const FLAVOR_PATTERNS = [
  // Fruit — red
  ['red-fruit',     /\b(strawberr|raspberr|cranberr|pomegranate|red[- ]currant|redcurrant|red[- ]cherry|tart cherry|sour cherry|maraschino|red[- ]plum|red[- ]fruit|red[- ]berry|cherry)\b/i],
  // Fruit — dark
  ['dark-fruit',    /\b(blackberr|blueberr|black[- ]cherry|black[- ]plum|cassis|blackcurrant|black[- ]currant|boysenberr|mulberr|dark[- ]fruit|dark[- ]berry|bramble|damson)\b/i],
  // Fruit — stone
  ['stone-fruit',   /\b(peach|nectarine|apricot|stone[- ]fruit|plum)\b/i],
  // Fruit — citrus
  ['citrus',        /\b(lemon|lime|grapefruit|orange[- ]peel|orange[- ]zest|yuzu|tangerine|bergamot|blood[- ]orange|mandarin|meyer[- ]lemon|citrus[- ]peel|citrus[- ]zest|lemon[- ]curd|lemon[- ]zest|citrus)\b/i],
  // Fruit — tropical
  ['tropical',      /\b(pineapple|passion[- ]fruit|passionfruit|guava|mango|papaya|lychee|banana|coconut|tropical[- ]fruit|kiwi)\b/i],
  // Fruit — dried
  ['dried-fruit',   /\b(raisin|dried[- ]fig|\bfig\b|prune|dried[- ]cherry|dried[- ]plum|dried[- ]apricot|dried[- ]fruit|medjool)\b/i],
  // Fruit — orchard
  ['orchard-fruit', /\b(apple|pear|quince|orchard[- ]fruit|pip[- ]fruit)\b/i],

  // Earth / forest
  ['earth',         /\b(earth|earthy|soil|forest[- ]floor|mushroom|truffle|loamy|undergrowth|humus|woodland|decomposed|leaf[- ]litter|compost)\b/i],
  // Mineral
  ['mineral',       /\b(mineral|minerality|slate|chalk|flint|gravel|limestone|rocky|saline|graphite|wet[- ]stone|flinty|schist|granite|volcanic|chalky|stony|oyster[- ]shell|sea[- ]salt|salinity)\b/i],
  // Floral
  ['floral',        /\b(floral|violet|rose[- ]petal|jasmine|lavender|iris|hibiscus|elderflower|honeysuckle|lilac|peony|blossom|geranium|acacia|wisteria|orange[- ]blossom)\b/i],
  // Herbal / green
  ['herbal',        /\b(herb|herbal|grassy|grass|bay[- ]leaf|thyme|rosemary|sage|mint|eucalyptus|dill|vegetal|tarragon|fennel|tea[- ]leaf|dried[- ]herb|fresh[- ]herb|green[- ]olive|capsicum|bell[- ]pepper)\b/i],
  // Spice
  ['spice',         /\b(pepper|peppercorn|cinnamon|clove|cardamom|licorice|allspice|nutmeg|ginger|star[- ]anise|cayenne|chili|white[- ]pepper|black[- ]pepper|pink[- ]pepper|five[- ]spice)\b/i],
  // Oak / vanilla / wood
  ['oak',           /\b(oak|vanilla|cedar|toast|toasty|sawdust|woody|coffee|mocha|chocolate|cocoa|caramel|butterscotch|cream|buttery|new[- ]oak|french[- ]oak|american[- ]oak|oak[- ]spice)\b/i],
  // Tobacco
  ['tobacco',       /\b(tobacco|cigar[- ]box|tobacco[- ]leaf|pipe[- ]tobacco|dried[- ]tobacco)\b/i],
  // Leather
  ['leather',       /\b(leather|saddle|suede|boot[- ]polish)\b/i],
  // Smoke
  ['smoke',         /\b(smoke|smoky|smoked|charcoal|ash|campfire|gunflint|bonfire|meaty[- ]smoke)\b/i],

  // Funky / natural markers
  ['brett',         /\b(brett|brettanomyces|bretty)\b/i],
  ['barnyard',      /\b(barnyard|farmyard|stable|horse[- ]sweat|manure|feral|straw|hay)\b/i],
  ['volatile',      /\b(volatile[- ]acid|volatile[- ]acidity|vinegar[- ]like|acetic)\b/i],
  ['oxidative',     /\b(oxidative|oxidized|rancio|nutty|walnut|hazelnut|almonds?|sherry[- ]like)\b/i],
  ['funky',         /\b(funky|unusual[- ]wine|wild[- ]ferment|weird|eccentric[- ]wine)\b/i],
  ['savory',        /\b(savory|meaty|umami|olive|tapenade|cured[- ]meat|charcuterie|jerky|soy[- ]sauce|miso)\b/i],
]

function detectFlavorTags(description) {
  const tags = []
  for (const [tag, re] of FLAVOR_PATTERNS) {
    if (re.test(description)) tags.push(tag)
  }
  return tags
}

// ── Wine style detection ────────────────────────────────────────────────────

const STYLE_SIGNALS = [
  // Signal regex → styles to add
  [/biodynamic|demeter\b/i,                                            ['biodynamic', 'natural', 'low-intervention']],
  [/\b(certified[- ]organic|organically[- ]farmed|ecocert|practicing[- ]organic)\b/i, ['organic']],
  [/\b(organic)\b/i,                                                   ['organic']],
  [/skin[- ]contact|skin[- ]macerat|orange[- ]wine|amber[- ]wine/i,   ['skin-contact', 'orange-wine', 'natural', 'low-intervention']],
  [/pét[- ]nat|petillant[- ]naturel|p[eé]tillant|méthode[- ]ancestrale|methode[- ]ancestrale|ancestral[- ]method/i, ['pét-nat', 'natural', 'low-intervention']],
  [/amphora|clay[- ]vessel|qvevri|kvevri|talha/i,                     ['amphora', 'natural', 'low-intervention']],
  [/low[- ]intervention|minimal[- ]intervention|unfined|unfiltered|no[- ]added[- ]sulfur|no[- ]so2\b/i, ['low-intervention', 'natural']],
  [/\bnatural[- ]wine\b/i,                                             ['natural', 'low-intervention']],
  [/whole[- ]cluster|whole[- ]bunch/i,                                 ['whole-cluster']],
  [/carbonic[- ]maceration|semi[- ]carbonic|\bcarbonic\b/i,           ['carbonic', 'natural']],
  [/wild[- ]yeast|spontaneous[- ]ferment|indigenous[- ]yeast/i,       ['natural', 'low-intervention']],
  [/brett|barnyard|farmyard/i,                                         ['natural']],   // strong natural signal in prose
]

function detectWineStyle(description) {
  const styles = new Set()
  for (const [re, tags] of STYLE_SIGNALS) {
    if (re.test(description)) for (const t of tags) styles.add(t)
  }
  if (styles.size === 0) styles.add('conventional')
  return [...styles]
}

// ── Adventurousness score ───────────────────────────────────────────────────

// Varieties in the mainstream — score no rarity bonus
const COMMON_VARIETIES = new Set([
  'cabernet sauvignon', 'merlot', 'pinot noir', 'chardonnay', 'sauvignon blanc',
  'riesling', 'syrah', 'shiraz', 'malbec', 'zinfandel', 'sangiovese', 'tempranillo',
  'grenache', 'garnacha', 'pinot grigio', 'pinot gris', 'prosecco', 'champagne blend',
  'red blend', 'white blend', 'rosé', 'port', 'viognier', 'gewürztraminer', 'albariño',
  'cabernet franc', 'bordeaux-style red blend', 'nebbiolo', 'barbera', 'gamay',
  'muscat', 'moscato', 'chenin blanc', 'sparkling blend', 'meritage', 'italian red blend',
  'rhône-style red blend', 'portuguese red', 'spanish red blend',
])

function computeAdventurousness(flavorTags, wineStyle, variety) {
  let score = 2  // baseline for conventional wines

  // Style bonuses
  if (wineStyle.includes('natural'))        score += 3
  if (wineStyle.includes('skin-contact'))   score += 2
  if (wineStyle.includes('orange-wine'))    score += 1
  if (wineStyle.includes('pét-nat'))        score += 2
  if (wineStyle.includes('amphora'))        score += 2
  if (wineStyle.includes('carbonic'))       score += 1
  if (wineStyle.includes('biodynamic'))     score += 1
  if (wineStyle.includes('organic'))        score += 0.5
  if (wineStyle.includes('low-intervention')) score += 0.5
  if (wineStyle.includes('whole-cluster'))  score += 0.5

  // Flavor bonuses
  if (flavorTags.includes('brett'))         score += 2
  if (flavorTags.includes('barnyard'))      score += 1.5
  if (flavorTags.includes('volatile'))      score += 1.5
  if (flavorTags.includes('funky'))         score += 1
  if (flavorTags.includes('oxidative'))     score += 1
  if (flavorTags.includes('savory'))        score += 0.5
  if (flavorTags.includes('earth'))         score += 0.3
  if (flavorTags.includes('mineral'))       score += 0.3

  // Variety rarity bonus
  if (variety && !COMMON_VARIETIES.has(variety.toLowerCase())) score += 1

  return Math.max(1, Math.min(10, Math.round(score)))
}

// ── Main ───────────────────────────────────────────────────────────────────

if (!DRY_RUN && !SUPABASE_SERVICE_KEY) {
  console.error('\n❌  SUPABASE_SERVICE_KEY is not set.')
  console.error('   Get it from: https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/settings/api')
  console.error('   Then run:  SUPABASE_SERVICE_KEY=your_key node enrich-flavor-profiles.mjs\n')
  process.exit(1)
}

const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

console.log(`\n🍷  Uncork flavor profile enrichment`)
console.log(`   Supabase: ${SUPABASE_URL}`)
if (DRY_RUN) console.log('   🔍  DRY RUN — no data will be written')
if (LIMIT !== Infinity) console.log(`   Limit:    ${LIMIT} wines`)
if (AFTER_ID > 0)       console.log(`   After ID: ${AFTER_ID} (resume)`)
console.log()

let afterId       = AFTER_ID
let totalProcessed = 0
let totalNatural   = 0
let dryRunSamples  = 0

// Stats accumulators
const tagCounts   = {}
const styleCounts = {}
const advDist     = Array(11).fill(0)  // index = score 0-10

while (true) {
  // Read a batch of wines
  const { data, error } = DRY_RUN
    ? await (async () => {
        // For dry-run: hit the real DB if key is set, else use placeholder
        if (SUPABASE_SERVICE_KEY) {
          const c = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
          return c.from('wine_catalog')
            .select('id, title, name, winery, vintage, variety, designation, region, province, country, description, points, price, body, tannin, sweetness, acidity, color')
            .gt('id', afterId)
            .order('id')
            .limit(10)
        }
        return { data: null, error: { message: 'No key — dry-run shows pattern matching only' } }
      })()
    : await supabase
        .from('wine_catalog')
        .select('id, title, name, winery, vintage, variety, designation, region, province, country, description, points, price, body, tannin, sweetness, acidity, color')
        .gt('id', afterId)
        .order('id')
        .limit(BATCH)

  if (error) {
    if (DRY_RUN) {
      // Show synthetic demo if no DB access
      const demos = [
        { id: 1, name: 'Arnot-Roberts Trousseau', variety: 'Trousseau', country: 'US',
          description: 'Earthy and funky with bright red cherry, violet florals, and a wild yeast character that leans natural-wine in style. Minimal intervention, unfiltered.' },
        { id: 2, name: 'Caymus Cabernet Sauvignon', variety: 'Cabernet Sauvignon', country: 'US',
          description: 'Rich and opulent, with blackberry, cassis, mocha, vanilla oak, and velvety tannins. Classic Napa style.' },
        { id: 3, name: 'Gut Oggau Mechthild', variety: 'Welschriesling', country: 'Austria',
          description: 'Biodynamic skin-contact wine with orange peel, apricot, mineral slate, and a lightly funky, barnyard quality. Unfiltered.' },
        { id: 4, name: 'La Stoppa Ageno', variety: 'Malvasia', country: 'Italy',
          description: 'Amber wine with extended skin maceration. Dried apricot, walnut, oxidative notes, and an earthy, herbal finish. Amphora aged.' },
        { id: 5, name: 'Kim Crawford Sauvignon Blanc', variety: 'Sauvignon Blanc', country: 'New Zealand',
          description: 'Crisp and zesty with passionfruit, lime, and grassy herbaceous notes. Clean and refreshing.' },
      ]
      for (const wine of demos) {
        const flavorTags  = detectFlavorTags(wine.description)
        const wineStyle   = detectWineStyle(wine.description)
        const adventurousness = computeAdventurousness(flavorTags, wineStyle, wine.variety)
        console.log(`  [${wine.id}] ${wine.name}  (${wine.variety} / ${wine.country})`)
        console.log(`       flavor_tags     = ${JSON.stringify(flavorTags)}`)
        console.log(`       wine_style      = ${JSON.stringify(wineStyle)}`)
        console.log(`       adventurousness = ${adventurousness}`)
        console.log()
      }
      console.log('  (Set SUPABASE_SERVICE_KEY to preview real catalog wines)')
      process.exit(0)
    }
    console.error(`\n❌  DB read error: ${error.message}`)
    process.exit(1)
  }

  if (!data || data.length === 0) break

  const updates = []

  for (const wine of data) {
    const desc  = wine.description || ''
    const flavorTags      = detectFlavorTags(desc)
    const wineStyle       = detectWineStyle(desc)
    const adventurousness = computeAdventurousness(flavorTags, wineStyle, wine.variety || '')

    // Accumulate stats
    if (wineStyle.includes('natural')) totalNatural++
    for (const t of flavorTags)  tagCounts[t]   = (tagCounts[t]   || 0) + 1
    for (const s of wineStyle)   styleCounts[s] = (styleCounts[s] || 0) + 1
    advDist[adventurousness]++

    // Dry-run: print first 5 real catalog wines
    if (DRY_RUN && dryRunSamples < 5) {
      console.log(`  [${wine.id}] ${wine.name}  (${wine.variety || '?'} / ${wine.country || '?'})`)
      console.log(`       flavor_tags     = ${JSON.stringify(flavorTags)}`)
      console.log(`       wine_style      = ${JSON.stringify(wineStyle)}`)
      console.log(`       adventurousness = ${adventurousness}`)
      console.log()
      dryRunSamples++
    }

    updates.push({
      id:            wine.id,
      title:         wine.title,
      name:          wine.name,
      winery:        wine.winery,
      vintage:       wine.vintage,
      variety:       wine.variety,
      designation:   wine.designation,
      region:        wine.region,
      province:      wine.province,
      country:       wine.country,
      description:   wine.description,
      points:        wine.points,
      price:         wine.price,
      body:          wine.body,
      tannin:        wine.tannin,
      sweetness:     wine.sweetness,
      acidity:       wine.acidity,
      color:         wine.color,
      flavor_tags:   flavorTags,
      wine_style:    wineStyle,
      adventurousness,
    })

    totalProcessed++
    if (totalProcessed >= LIMIT) break
  }

  if (!DRY_RUN && updates.length > 0) {
    const { error: upsertErr } = await supabase
      .from('wine_catalog')
      .upsert(updates, { onConflict: 'title', ignoreDuplicates: false })
    if (upsertErr) {
      console.error(`\n  ⚠  Batch upsert error: ${upsertErr.message}`)
    }
  }

  afterId = data[data.length - 1].id
  if (!DRY_RUN) {
    process.stdout.write(
      `\r  Processed: ${totalProcessed.toLocaleString()}   Natural: ${totalNatural.toLocaleString()}   `
    )
  }

  if (totalProcessed >= LIMIT) break
  if (data.length < BATCH) break  // last page
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n\n✅  Done — ${totalProcessed.toLocaleString()} wines enriched`)
console.log()

if (totalProcessed > 0) {
  const natPct = ((totalNatural / totalProcessed) * 100).toFixed(1)
  console.log(`── Wine style breakdown ──────────────────────────────`)
  const sortedStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])
  for (const [s, n] of sortedStyles) {
    const pct = ((n / totalProcessed) * 100).toFixed(1)
    console.log(`   ${s.padEnd(20)} ${n.toLocaleString().padStart(7)}  (${pct}%)`)
  }

  console.log()
  console.log(`── Top flavor tags ───────────────────────────────────`)
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)
  for (const [t, n] of sortedTags) {
    const pct = ((n / totalProcessed) * 100).toFixed(1)
    console.log(`   ${t.padEnd(20)} ${n.toLocaleString().padStart(7)}  (${pct}%)`)
  }

  console.log()
  console.log(`── Adventurousness distribution ──────────────────────`)
  for (let i = 1; i <= 10; i++) {
    const n   = advDist[i] || 0
    const pct = ((n / totalProcessed) * 100).toFixed(1)
    const bar = '█'.repeat(Math.round(n / totalProcessed * 40))
    console.log(`   ${i.toString().padStart(2)}  ${bar.padEnd(40)} ${n.toLocaleString().padStart(7)}  (${pct}%)`)
  }

  console.log()
  console.log(`   Natural wines: ${totalNatural.toLocaleString()} of ${totalProcessed.toLocaleString()} (${natPct}%)`)
}

if (DRY_RUN) {
  console.log('\n  (Dry run — no changes written. Remove --dry-run to enrich the full catalog.)')
}
