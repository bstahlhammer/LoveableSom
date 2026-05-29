# Wine Catalog Setup

Expands the app from 50 hardcoded wines to 130,000+ wines from the
Kaggle Wine Reviews dataset, stored in Supabase with lazy image fetching.

---

## Step 1 — Run the Supabase migration

Open the SQL editor for your project:
https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new

Paste and run the contents of:
  supabase/migrations/002_wine_catalog.sql

---

## Step 2 — Download the Kaggle dataset

1. Create a free account at https://www.kaggle.com (if you don't have one)
2. Go to: https://www.kaggle.com/datasets/zynicide/wine-reviews
3. Click **Download** → download `winemag-data-130k-v2.csv`
4. Save it as `wine-reviews.csv` in this project root

---

## Step 3 — Get your Supabase service-role key

You need the **service-role** key (not the anon key) to bypass RLS for bulk inserts.

Go to: https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/settings/api
Copy the **service_role** key (secret — do not commit it).

---

## Step 4 — Run the ingest

```bash
# Dry run first to verify parsing looks right
node ingest-wines.mjs --dry-run

# Insert all 130k wines (takes ~5-10 minutes)
SUPABASE_SERVICE_KEY=your_service_key node ingest-wines.mjs

# Or insert just the first 1000 to test
SUPABASE_SERVICE_KEY=your_service_key node ingest-wines.mjs --limit 1000
```

---

## Step 5 — Run the flavor profile enrichment

Adds `flavor_tags`, `wine_style`, and `adventurousness` to every wine.
Run this **after** Step 4 (ingestion) and **after** applying the migration below.

### 5a — Apply the migration

Open the SQL editor:
https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new

Paste and run:
  supabase/migrations/003_flavor_profiles.sql

### 5b — Run the enrichment

```bash
# Dry run first — previews 5 wines with computed tags
SUPABASE_SERVICE_KEY=your_key node enrich-flavor-profiles.mjs --dry-run

# Full enrichment (~5 min for 130k wines)
SUPABASE_SERVICE_KEY=your_key node enrich-flavor-profiles.mjs

# Or enrich only the first 1000 to spot-check
SUPABASE_SERVICE_KEY=your_key node enrich-flavor-profiles.mjs --limit 1000

# Resume a partial run (use the last printed ID)
SUPABASE_SERVICE_KEY=your_key node enrich-flavor-profiles.mjs --after-id 65000
```

The script prints a breakdown of wine styles, top flavor tags, and
adventurousness score distribution when it finishes.

---

## Step 6 — (Optional) Enable wine bottle images

Images are fetched lazily from SerpAPI the first time a wine is viewed,
then cached forever in Supabase.

1. Create a free account at https://serpapi.com (100 free searches/month)
2. Get your API key from the dashboard
3. Add it to wrangler.jsonc:

```jsonc
{
  "vars": {
    "SERPAPI_KEY": "your_serpapi_key_here"
  }
}
```

Without this key the app still works — wines just show the bottle silhouette placeholder.

---

## Step 7 — Deploy

```bash
npm run build && npx wrangler deploy
```

---

## How it works

- When a user scans a wine menu, each identified wine name is looked up in
  the Supabase catalog via full-text search
- If found, the catalog's imageUrl is attached (and a lazy SerpAPI fetch
  is triggered if the image slot is empty)
- The catalog has 130k+ wines with grape-variety-inferred palate axes
  (body / tannin / sweetness / acidity) so the match engine can score
  any wine found on a menu — not just the 50 curated ones
