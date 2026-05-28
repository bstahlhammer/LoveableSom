# Spec 009 — Wine Image Pipeline (Multi-Source)

## Context / why previous attempts stalled

- Spec 005 (WineSensed) designed but never spiked — HF archive structure unvalidated.
- Spec 007 (Google CSE cron) designed but never implemented — both specs assumed `GOOGLE_CSE_KEY` / `GOOGLE_CSE_ID` secrets already existed in Cloudflare; `wrangler secret list` confirms they do not.
- `/api/wine-image` endpoint is fully coded but silently returns `null` for every request because no image API keys are configured.

**Result today:** `wine_catalog.image_url` is null for virtually all rows. WineDetailScreen hero has no photo for any scanned wine.

---

## Goals

1. **Unstick the on-demand path** — `WineDetailScreen` shows a bottle photo when the user taps a scanned wine.
2. **Pre-fill the catalog** — run a bulk script that fills `image_url` for the top N wines so future scans hit the cache instead of calling an external API.
3. **Keep it filled** — a nightly Cloudflare cron tops up newly-seen wines automatically.
4. **Use multiple sources** — don't depend on any single API; degrade gracefully.

## Non-goals

- Showing bottle images in the results card list (PersonalizedResultsScreen, AnonResultsScreen) — those use MiniBottle by design.
- Real-time label resolution during scan (scan speed must not increase).
- Perfect label accuracy — a plausible bottle photo is good enough.

---

## Image sources (tried in priority order)

| Priority | Source | Free tier | Effort | Notes |
|---|---|---|---|---|
| 1 | **Google Custom Search Engine** | 100/day free | Low — already coded | Already in `wine-image.ts`; just needs `GOOGLE_CSE_KEY` + `GOOGLE_CSE_ID` |
| 2 | **Bing Image Search** (Azure) | 1,000/month free | Low — add to endpoint | Azure Cognitive Services; good image quality |
| 3 | **SerpAPI** | 100/month free | Low | Wraps Google Images; cleaner URLs; already mentioned in code comments |
| 4 | **WineSensed (Hugging Face)** | Free dataset | High — spike required | 897k bottle label JPGs; CC BY-NC-ND; needs archive extraction |

The implementation tries sources 1→2→3 in order at request time. Source 4 is a separate bulk script run once (or on demand).

---

## Implementation phases

### Phase 1 — Fix on-demand path (unblock WineDetailScreen)

**Step 1a: Confirm Google CSE works**

Before adding Bing/SerpAPI, verify Google CSE actually returns wine images:

1. Create a Google CSE at https://programmablesearchengine.google.com configured for image search across the whole web.
2. Get a `cx` (CSE ID) and an API key from Google Cloud Console (Custom Search JSON API).
3. Run `npx wrangler secret put GOOGLE_CSE_KEY` and `npx wrangler secret put GOOGLE_CSE_ID` from `LoveableSom/LoveableSom/`.
4. Test locally: `curl 'http://localhost:5173/api/wine-image?name=Caymus+Cabernet+Sauvignon&catalog_id=1'`
5. If `imageUrl` is non-null, proceed. If null, check Cloudflare dashboard logs for the CSE error.

**Step 1b: Add Bing Image Search as fallback**

Modify `wine-image.ts` to try Bing if Google CSE returns no result:

- Env var: `BING_IMAGE_KEY` (Azure Cognitive Services key, Bing Image Search v7)
- Endpoint: `https://api.bing.microsoft.com/v7.0/images/search?q={name}+wine+bottle&count=5&imageType=Photo`
- Same cache/upsert logic — write result to `wine_catalog.image_url` regardless of source.
- Add `BING_IMAGE_KEY` to wrangler secrets after testing.

**Step 1c: Add SerpAPI as third fallback** (optional — only if Google CSE + Bing both underperform)

- Env var: `SERPAPI_KEY`
- Endpoint: `https://serpapi.com/search.json?engine=google_images&q={name}+wine+bottle&num=5`
- Same fallback pattern.

**Modified `wine-image.ts` logic:**

```
1. Check wine_catalog by catalog_id → return cached image_url if set
2. Check wine_catalog by name → return + backfill if found
3. If image_fetched_at already set (previous miss) → return null (skip re-query)
4. Try Google CSE → if imageUrl found, cache and return
5. Try Bing → if imageUrl found, cache and return
6. Try SerpAPI → if imageUrl found, cache and return
7. Mark image_fetched_at = now(), image_url = null (confirmed miss), return null
```

---

### Phase 2 — Bulk fill script

A local Node script (`scripts/fill-wine-images.mjs`) that fills `image_url` for wines that have never been attempted.

**CLI:**

```bash
# Dry run — shows which wines would be queried
SUPABASE_SERVICE_KEY=... node scripts/fill-wine-images.mjs --dry-run

# Fill up to 500 wines (default)
SUPABASE_SERVICE_KEY=... node scripts/fill-wine-images.mjs

# Fill up to N wines
SUPABASE_SERVICE_KEY=... node scripts/fill-wine-images.mjs --limit 200

# Use a specific source only
SUPABASE_SERVICE_KEY=... node scripts/fill-wine-images.mjs --source bing
```

**Behavior:**

1. Query `wine_catalog` for rows where `image_url IS NULL AND image_fetched_at IS NULL`, ordered by `points DESC` (most-rated wines first).
2. For each wine, call the same source cascade (Google CSE → Bing → SerpAPI).
3. Write `image_url` and `image_fetched_at` to `wine_catalog` after each result.
4. 500ms delay between calls to avoid rate limits.
5. Print progress: `[12/200] Caymus Cabernet Sauvignon → found (google_cse)`.
6. Print summary at end: found/missed/errored counts by source.

---

### Phase 3 — Nightly Cloudflare cron (from Spec 007)

This is unchanged from Spec 007, but depends on Phase 1 succeeding first.

- Thin `src/worker.ts` wrapper that adds `scheduled` export to the TanStack Start handler.
- `wrangler.jsonc`: `"main": "src/worker.ts"` + `"triggers": { "crons": ["0 7 * * *"] }`.
- Batch: query up to 95 wines per night with `image_url IS NULL AND image_fetched_at IS NULL`, apply source cascade, write results.
- No UI changes.

---

### Phase 4 — WineSensed bulk import (spike first)

This is the highest-effort option but covers 350k wines with actual bottle photos.

**Spike required before implementation:**

1. Browse `https://huggingface.co/datasets/Dakhoo/L2T-NeurIPS-2023/tree/main` and confirm:
   - Exact path(s) of the metadata JSONL files
   - Archive naming scheme for image tar.gz files
   - Whether individual images are addressable by URL or require archive extraction
2. Download one small archive, extract one image, confirm it's a real bottle label.
3. Report back before writing any extraction code.

If the spike succeeds, the enrichment script from Spec 005 applies unchanged.

**License:** CC BY-NC-ND 4.0 — acceptable for this personal/demo app. Must revisit before monetization.

---

## Schema (no new tables needed — `wine_catalog` already has `image_url` and `image_fetched_at`)

The `label_requests` table from Spec 005 is already created and used. No additional migration required.

---

## Acceptance criteria

**Phase 1 done when:**
- [ ] `wrangler secret list` shows `GOOGLE_CSE_KEY` and `GOOGLE_CSE_ID`
- [ ] `curl /api/wine-image?name=Caymus+Cabernet+Sauvignon&catalog_id=...` returns a non-null `imageUrl` in both local dev and production
- [ ] Opening WineDetailScreen for a scanned wine shows a bottle photo in the hero section
- [ ] If Google CSE returns no result, Bing is tried and logged
- [ ] Confirmed misses set `image_fetched_at` so the same wine isn't re-queried

**Phase 2 done when:**
- [ ] `--dry-run` runs without error and prints wine names that would be queried
- [ ] Full run successfully fills at least 20 wines in `wine_catalog`
- [ ] Script is idempotent — running twice doesn't re-query wines with `image_fetched_at` set
- [ ] After script runs, scanned wines that matched those catalog rows show labels in the app

**Phase 3 done when:**
- [ ] Cloudflare dashboard shows Scheduled trigger
- [ ] `wrangler dev --test-scheduled` triggers batch and writes rows
- [ ] HTTP routing unchanged

**Phase 4 done when:**
- [ ] Spike validated: metadata JSONL path confirmed, one image extracted successfully
- [ ] Bulk script fills at least 10 test wines from WineSensed end-to-end
