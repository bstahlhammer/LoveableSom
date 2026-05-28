# Spec 002 — Rich Flavor Profiles & Natural Wine Intelligence

## Goals

- Add a structured flavor taxonomy to every wine in the 130k catalog
- Detect and classify natural/adventurous wines so Uncork can serve that underserved audience
- Compute an "adventurousness" score that surfaces funky, unconventional, and natural wines
- Scale bottle art beyond the current 50 hand-curated wines

## Non-goals

- Real-time AI enrichment per user request (enrichment is an offline batch process)
- Scraping Vivino or other gated sources at scale
- Replacing the existing 4 palate axes (body/tannin/sweetness/acidity) — those stay

---

## Flavor Taxonomy

Three new structured fields added to `wine_catalog`:

### `flavor_tags TEXT[]`
Primary aroma/flavor categories detected from the tasting `description`. Values drawn from a fixed vocabulary:

**Fruit:**
`red-fruit`, `dark-fruit`, `citrus`, `stone-fruit`, `tropical`, `dried-fruit`, `orchard-fruit`

**Secondary:**
`earth`, `mineral`, `floral`, `herbal`, `spice`, `oak`, `tobacco`, `leather`, `smoke`

**Funky / Natural:**
`brett`, `barnyard`, `volatile`, `oxidative`, `funky`, `savory`, `umami`

### `wine_style TEXT[]`
High-level style descriptors that inform filtering and discovery. Values:

`natural`, `biodynamic`, `organic`, `skin-contact`, `orange-wine`, `pét-nat`, `amphora`,
`low-intervention`, `unfiltered`, `whole-cluster`, `carbonic`, `conventional`

At least one value always set. Default: `['conventional']`.

### `adventurousness SMALLINT`
Score 1–10 reflecting how unconventional/adventurous the wine is relative to mainstream expectations.

| Range | Meaning |
|-------|---------|
| 1–3   | Crowd-pleaser (Napa Cab, Chardonnay, Chianti) |
| 4–6   | Interesting but approachable |
| 7–8   | Distinctly adventurous (natural markers, rare varieties) |
| 9–10  | Challenging / acquired taste (heavy brett, orange wine, very tannic) |

---

## Detection Approach

**Rule-based keyword extraction** from the existing `description` field (no API cost, runs across all 130k wines in minutes):

### Natural wine signals → `wine_style`

| Signal phrase | Tag applied |
|--------------|-------------|
| biodynamic, biodynamically | `biodynamic`, `natural` |
| organic, organically farmed | `organic` |
| skin contact, skin-macerated, orange wine, amber | `skin-contact`, `orange-wine` |
| pét-nat, pétillant naturel, méthode ancestrale | `pét-nat`, `natural` |
| amphora, clay vessel, qvevri | `amphora`, `natural` |
| low intervention, minimal intervention, unfined, unfiltered | `low-intervention`, `natural` |
| whole cluster, whole-bunch | `whole-cluster` |
| carbonic maceration, semi-carbonic | `carbonic` |
| brett, barnyard, funky, wild yeast, spontaneous | `natural` (+ funky signals) |
| certified organic, demeter, ecocert | `organic` |

Any wine with 0 natural signals → `['conventional']`.

### Adventurousness scoring

Base score from `wine_style`:
- `natural` = +3
- `skin-contact` / `orange-wine` = +3
- `pét-nat` / `amphora` = +2
- `biodynamic` / `organic` / `low-intervention` = +1

Adjust from `flavor_tags`:
- `brett` / `barnyard` / `volatile` / `funky` = +2
- `oxidative` = +1
- `earth` / `mineral` = +0.5

Adjust from grape rarity (varieties not in the top-20 common list) = +1

Adjust from region (rare/emerging regions vs. classic) = +0.5

Clamp to 1–10. Conventional wine with no tags scores 3 (default baseline).

---

## Schema Migration — `003_flavor_profiles.sql`

```sql
ALTER TABLE wine_catalog
  ADD COLUMN IF NOT EXISTS flavor_tags     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wine_style      TEXT[] NOT NULL DEFAULT '{conventional}',
  ADD COLUMN IF NOT EXISTS adventurousness SMALLINT NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS wine_catalog_flavor_gin  ON wine_catalog USING GIN (flavor_tags);
CREATE INDEX IF NOT EXISTS wine_catalog_style_gin   ON wine_catalog USING GIN (wine_style);
CREATE INDEX IF NOT EXISTS wine_catalog_adventure_idx ON wine_catalog (adventurousness);
```

---

## Enrichment Script — `enrich-flavor-profiles.mjs`

One-time script, run after ingestion:

1. Reads wines from Supabase in batches of 500
2. For each wine: applies keyword rules to `description` + `variety` → derives `flavor_tags`, `wine_style`, `adventurousness`
3. Upserts results back (batch updates via `id`)
4. Supports `--dry-run`, `--limit N`, `--skip N` (same pattern as `ingest-wines.mjs`)
5. Prints a summary of natural wine counts, tag distribution

---

## Bottle Art — Scaled Strategy

### Current state
50 wines have images in R2 via manual Vivino scraping. The `image_url` column in `wine_catalog` is otherwise null. The setup guide already mentions lazy SerpAPI fetch per wine view (100 free/month).

### Approach: Lazy + Batch hybrid

**Lazy fetch (existing plan, already in WINE-CATALOG-SETUP.md):** When a user views a wine with `image_url = null`, the Cloudflare Worker calls SerpAPI Google Images, caches the result in `image_url`, and returns it. This handles organic traffic.

**Batch pre-fetch for top wines:** Run a one-time script that pre-fetches images for the top ~1000 wines by `points DESC` using SerpAPI. This covers the wines most likely to appear on menus before any user triggers them.

**Open Food Facts bulk matching (supplemental):**
- Download the OFF CSV dump (wines only, filtered by category)
- Fuzzy-match winery + wine name against `wine_catalog`
- For matches with confidence > 0.85, copy `image_front_url` into `wine_catalog.image_url`
- OFF images are CC-licensed, no per-call cost
- Expected match rate: ~15-25% of catalog (OFF wine coverage is patchy)

No new infra required — all images stored in existing Supabase `image_url` column (external URLs, not copied to R2 unless serving perf requires it).

---

## User-facing Changes

After enrichment, the app can:

1. **Filter by adventurousness** — a slider or "Surprise me" toggle on Explore/Results screens
2. **Natural wine badge** — tag chip on wine cards ("Natural", "Skin-contact", "Pét-nat")
3. **Flavor tag chips** — shown in WineDetailScreen below the palate axes
4. **Natural wine discovery mode** — "Show me only natural wines" preference in ProfileScreen

UI changes are a separate spec; this spec covers data only.

---

## Acceptance Criteria

- [ ] `003_flavor_profiles.sql` migration runs clean on Supabase
- [ ] `enrich-flavor-profiles.mjs --dry-run` prints sample output for 5 wines including tag assignments
- [ ] Full run enriches all ~130k wines in under 10 minutes
- [ ] At least 5% of catalog tagged as containing some natural wine signal (realistic given Wine Enthusiast focus on conventional wines)
- [ ] Adventurousness distribution is not pathological (not all wines scoring 3 or all scoring 10)
- [ ] Top-1000 wines by points have `image_url` populated (either via SerpAPI or OFF matching)
- [ ] No regressions in existing ingest script or grape rules
