# Spec 012 — Catalog Enrichment: Seed Script + Scan-Triggered

## Diagnosis
The `wine_catalog` Supabase table has 280K+ rows, all with palate data. The gap is not null values —
it's that common grocery/restaurant brands (Meiomi, Cooper & Thief, Pessimist, Josh Cellars, etc.)
are simply absent. The catalog is a fine/premium wine dataset; mass-market commercial wines were
never included.

## Goals
1. **Seed script** — one-time run that bulk-inserts ~200 common US grocery/restaurant wines with
   AI-generated palate profiles
2. **Scan-triggered enrichment** — when a scanned wine has no flavor data, silently call
   `/api/find-wine` in the background; update the displayed card when data arrives; the endpoint
   already inserts into the catalog so future scans are instant

## Non-Goals
- Re-enriching rows that already have body/tannin/sweetness/acidity
- Changing scoring or inference logic
- A cron pass (all existing rows already have data; the scan-trigger handles new misses organically)

---

## Part A — Seed Script (`scripts/seed-common-wines.mjs`)

### What it does
1. Hardcoded list of ~200 common US wines by brand/variety (see list below)
2. For each wine not already in the catalog (checked by name ilike), call Claude Haiku
3. Insert result into `wine_catalog` with all four palate axes
4. Print a progress line per wine; summary at end

### Running it
```
ANTHROPIC_API_KEY=... node scripts/seed-common-wines.mjs
```
Uses the same Supabase anon key already in the codebase (has INSERT permission).
Batches 10 wines per Haiku call to stay fast. Skips wines already present.
Rate-limit: 500ms between batches to avoid API throttling.

### Wine list (grouped by segment)
**Grocery staples:** Meiomi (Pinot Noir, Cabernet Sauvignon, Rosé), Josh Cellars (Cabernet
Sauvignon, Chardonnay, Prosecco), Kim Crawford (Sauvignon Blanc, Pinot Gris), Whispering Angel
Rosé, 19 Crimes (Red Blend, Cabernet Sauvignon), Apothic (Red, Dark, Inferno), Bota Box
(Cabernet Sauvignon, Pinot Grigio), Barefoot (Pinot Grigio, Chardonnay, Merlot, Cabernet
Sauvignon), Yellow Tail (Chardonnay, Shiraz, Cabernet Sauvignon), Mark West Pinot Noir,
Cupcake Vineyards (Sauvignon Blanc, Malbec), Dark Horse (Cabernet Sauvignon, Chardonnay),
La Crema (Pinot Noir, Chardonnay), Bread & Butter (Pinot Noir, Chardonnay), The Prisoner,
Decoy (Cabernet Sauvignon, Pinot Noir), Ferrari-Carano Chardonnay, Rombauer Chardonnay,
Sonoma-Cutrer Russian River Ranches Chardonnay, Stag's Leap Wine Cellars Artemis,
Robert Mondavi Private Selection, Kendall-Jackson Vintner's Reserve Chardonnay

**Restaurant pours:** Caymus Cabernet Sauvignon, Jordan Cabernet Sauvignon, Duckhorn Merlot,
Flowers Pinot Noir, Kosta Browne Pinot Noir, Sea Smoke Pinot Noir, Matanzas Creek Merlot,
Cakebread Chardonnay, Far Niente Chardonnay, Shafer One Point Five Cabernet Sauvignon,
Silver Oak Alexander Valley Cabernet Sauvignon, Opus One, Screaming Eagle Cabernet Sauvignon,
Penfolds Bin 389, Penfolds Grange, Cloudy Bay Sauvignon Blanc, Simi Chardonnay,
Franciscan Estate Cabernet Sauvignon, Beringer Private Reserve Chardonnay, Chateau Ste Michelle
Riesling, Stags' Leap Winery Petite Sirah, Coppola Diamond Collection

**On-premise staples:** Cooper & Thief Red Wine Blend, Pessimist Red Blend, The Federalist
Bourbon Barrel-Aged Cabernet Sauvignon, Rabble Red Blend, Orin Swift Abstract, Orin Swift
Machete, Orin Swift Mercury Head, Joel Gott 815 Cabernet Sauvignon, Layer Cake Cabernet
Sauvignon, Layer Cake Primitivo, Earthquake Cabernet Sauvignon, Predator Cabernet Sauvignon,
Gnarly Head Old Vine Zin, Bogle Old Vine Zinfandel, Bogle Phantom, Ménage à Trois Red,
Ménage à Trois California Chardonnay, Conundrum White, 7 Deadly Zins, The Walking Dead
Cabernet Sauvignon, Notorious Pink Rosé

### Acceptance criteria
- [ ] Script runs to completion without crashing
- [ ] Each wine either inserted or skipped (already present) — logged per wine
- [ ] Inserted wines have non-null body/tannin/sweetness/acidity
- [ ] Running the script a second time inserts nothing (idempotent via name check)

---

## Part B — Scan-Triggered Enrichment (`PersonalizedResultsScreen.jsx`)

### What it does
On mount, collect any displayed wines where `body == null`. For each, call `findWineOnWeb(name, vintage)`.
When a result returns, patch that wine's entry in local state so the card updates without reload.
`/api/find-wine` already inserts successful results into the catalog, so future scans get the data for free.

### Constraints
- Max 5 concurrent requests (use a semaphore or sequential batching)
- Only fire once per mount (not on every re-render)
- Only for wines with `body == null` — don't re-fetch wines that already have data
- If enrichment fails, leave the card as-is (silent failure, no toast)

### Acceptance criteria
- [ ] Wines with no flavor data trigger enrichment calls on screen mount
- [ ] Cards update in place when data arrives (no full re-render of the list)
- [ ] Wines that already have flavor data are not re-fetched
- [ ] Silent failure — no error UI shown to user
- [ ] After enrichment, a re-scan of the same wine list shows data immediately (it's in the catalog now)
