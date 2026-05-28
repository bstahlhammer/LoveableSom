# Spec 005 — Label Enrichment Pipeline

**Goal:** Let users flag wines that are missing bottle labels, then automatically fill those labels (and enrich metadata) on a weekly cycle using the WineSensed dataset from Hugging Face.

---

## Goals

- Users can signal "this wine has no label" from the WineDetailScreen
- A scheduled pipeline matches flagged wines against WineSensed, fetches label images, and writes them to Supabase Storage
- Matched wines also get enriched with WineSensed metadata (alcohol %, grape composition, Vivino rating) if those fields are empty in the catalog
- The pipeline is a standalone Node script runnable locally or via a Cloudflare Cron Trigger

## Non-goals

- Real-time label resolution (the enrichment is async / batch, not on-demand)
- Replacing the existing SerpAPI lazy-fetch path (it stays as a fallback for wines WineSensed doesn't cover)
- Downloading and storing all 897k WineSensed images (we only fetch images for flagged wines)
- Modifying the Kaggle ingest or flavor-profile pipelines

---

## Data source

**WineSensed** (Dakhoo/L2T-NeurIPS-2023, CC BY-NC-ND 4.0)
- 350k+ wine vintages with: name, winery, year, country, region, grape, alcohol %, price, Vivino rating, review text
- 897k bottle label JPGs stored in tar.gz archives in the HF repo
- Metadata is in JSONL sidecar files keyed by image filename; `vintage_id` is the join key

**Access reality:** The HF Datasets Server API returns 501 for this dataset (custom loading script, not auto-indexed). Images are not directly URL-addressable — they live inside tar.gz archives. The pipeline must download archive files from the HF git repo, extract images, and re-host in Supabase Storage.

**License constraint:** CC BY-NC-ND 4.0 — non-commercial, no derivatives. Acceptable for the current personal/demo app. Must be revisited before any monetization.

---

## Schema changes

### New table: `label_requests`

```sql
CREATE TABLE label_requests (
  id           BIGSERIAL PRIMARY KEY,
  catalog_id   BIGINT REFERENCES wine_catalog(id) ON DELETE CASCADE,
  wine_name    TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'matched' | 'no_match' | 'skipped'
  matched_at   TIMESTAMPTZ,
  winesensed_vintage_id TEXT
);

-- One open request per wine (don't pile up duplicates)
CREATE UNIQUE INDEX label_requests_catalog_pending_idx
  ON label_requests (catalog_id)
  WHERE status = 'pending';
```

### New column: `wine_catalog.alcohol`

```sql
ALTER TABLE wine_catalog ADD COLUMN IF NOT EXISTS alcohol NUMERIC(4,1);
```

(Grape composition is already in `variety`; Vivino rating maps to `points` if currently null.)

---

## User-facing behavior

**Trigger:** `WineDetailScreen` — when `wine.imageUrl` is null and the user is logged in, show a small muted link below the bottle silhouette: "Missing label? Let us know →"

**On tap:** POST to `/api/label-request` with `{ catalog_id, wine_name }`. The API inserts a row into `label_requests` (or no-ops if one already exists for this wine). Returns `{ ok: true }`. The UI swaps the link to "Thanks — we'll track it down." No loading state required.

**No label, not logged in:** Link is hidden. Upsell card is already shown elsewhere.

---

## Enrichment pipeline (`enrich-labels.mjs`)

Runs as a standalone Node script. Designed to be invoked locally or by a Cloudflare Cron Trigger via a protected Worker endpoint.

### Step 1 — Load pending requests

Query `label_requests` where `status = 'pending'`, join to `wine_catalog` to get `name`, `winery`, `vintage`, `variety`, `country`.

### Step 2 — Download WineSensed metadata (one-time or cached)

Download the metadata JSONL sidecar file(s) from the HF dataset git repo:

```
https://huggingface.co/datasets/Dakhoo/L2T-NeurIPS-2023/resolve/main/<metadata-path>
```

Cache the parsed metadata on disk at `~/.uncork-cache/winesensed-meta.json` with a 7-day TTL so repeated runs don't re-download. The metadata file maps `image_filename → { wine, winery_id, year, country, region, grape, alcohol, price, rating, review, vintage_id }`.

> **Spike needed (Step 2a):** Confirm the exact metadata file path and JSONL schema by browsing the HF repo data directory. This is the first thing the implementation script should validate.

### Step 3 — Fuzzy name matching

For each pending request, score WineSensed entries using:

1. **Exact match** on normalized wine name (`lower(trim())`) → score 1.0
2. **Token overlap** (Jaccard on name tokens) → score 0.4–0.8
3. **Vintage year match bonus** (+0.15 if year matches)
4. **Country match bonus** (+0.1 if country matches)

Accept matches with score ≥ 0.65. Mark as `no_match` if nothing clears the threshold.

### Step 4 — Fetch and store the label image

For each matched wine:

1. Identify which tar.gz archive contains the image (archive names are deterministic based on `vintage_id` ranges — confirm during spike)
2. Stream-download only the relevant archive segment, or download the smallest archive that contains the target image
3. Extract the label JPG
4. Upload to Supabase Storage bucket `wine-labels` at path `winesensed/{vintage_id}.jpg` (public bucket, same pattern as existing `scan-photos`)
5. Get the public URL from Supabase

### Step 5 — Write enrichment to `wine_catalog`

```sql
UPDATE wine_catalog SET
  image_url        = <supabase-storage-url>,
  image_fetched_at = NOW(),
  alcohol          = COALESCE(alcohol, <winesensed-alcohol>),
  points           = COALESCE(points, <winesensed-rating>)
WHERE id = <catalog_id>;
```

Only fill `alcohol` and `points` if currently null (never overwrite existing data).

### Step 6 — Update `label_requests`

```sql
UPDATE label_requests SET
  status                = 'matched',   -- or 'no_match'
  matched_at            = NOW(),
  winesensed_vintage_id = <vintage_id>
WHERE id = <request_id>;
```

### Script CLI

```bash
# Dry run — show matches without writing anything
SUPABASE_SERVICE_KEY=... node enrich-labels.mjs --dry-run

# Full run
SUPABASE_SERVICE_KEY=... node enrich-labels.mjs

# Limit to N wines (for testing)
SUPABASE_SERVICE_KEY=... node enrich-labels.mjs --limit 10

# Force re-download of WineSensed metadata cache
SUPABASE_SERVICE_KEY=... node enrich-labels.mjs --refresh-cache
```

---

## Scheduling

**Option A (local cron):** Run via `launchd` or `cron` on your Mac, weekly. Simple, no infrastructure.

**Option B (Cloudflare Cron Trigger):** Add a `[triggers] crons = ["0 9 * * 1"]` to `wrangler.jsonc` pointing to a protected Worker handler (`/api/enrich-labels?secret=...`) that runs the pipeline server-side. More reliable; runs even when your laptop is off.

Recommendation: start with Option A (local cron via launchd), move to Option B when the pipeline is proven.

---

## Edge cases

| Case | Handling |
|---|---|
| Same wine flagged by multiple users | Unique index on `(catalog_id) WHERE status='pending'` prevents duplicate rows |
| Wine already has `image_url` set by the time pipeline runs | Skip (re-query `image_url` before processing each batch) |
| WineSensed has the vintage but image extract fails | Mark `status = 'no_match'`, leave SerpAPI path as fallback |
| Archive download is too large / times out | Implement per-image size cap (skip archives > 500MB); log and continue |
| WineSensed metadata cache is stale | `--refresh-cache` flag; auto-expire after 7 days |
| User not logged in | API endpoint requires auth session; return 401 |

---

## API endpoint: `POST /api/label-request`

```
Headers: Authorization: Bearer <supabase-session-token>
Body:    { catalog_id: number, wine_name: string }
Returns: { ok: true } | { error: string }
```

Server handler: verify session, upsert `label_requests` row, return 200.

---

## Acceptance criteria

- [ ] **Spike complete:** metadata JSONL file path confirmed, schema matches spec, at least one image successfully extracted from archive
- [ ] `label_requests` table and `wine_catalog.alcohol` column migration applied
- [ ] Logged-in user can tap "Missing label?" on a wine with no image; request is written to DB; link changes to confirmation text
- [ ] `enrich-labels.mjs --dry-run` prints matched/unmatched summary without writing to DB
- [ ] Full run resolves at least 5 test wines end-to-end: label appears in app after enrichment
- [ ] Matched wines with previously null `points` or `alcohol` are enriched; existing non-null values are not overwritten
- [ ] `no_match` wines are marked correctly and still get SerpAPI fallback on next page view
- [ ] Script is idempotent: running twice doesn't create duplicate storage objects or double-update rows
