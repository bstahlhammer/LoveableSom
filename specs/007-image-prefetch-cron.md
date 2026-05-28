# Spec 007 — Wine Image Pre-fetch (Scan + Nightly Cron)

## Goals

1. **Option A — Pre-fetch on scan completion**: after `useScan` enriches wines from the catalog, fire background `/api/wine-image` requests for every wine that has a `catalogId` but no `imageUrl` yet. Users see images appear progressively; the scan return is not delayed.

2. **Option B — Nightly cron**: a Cloudflare scheduled Worker runs once per night, queries Supabase for wines with no image attempt, and fetches up to ~95 images from Google CSE. Fills the catalog passively over time so future scans hit the cache.

## Non-goals

- No UI changes — images already render in WineDetailScreen when `imageUrl` is set.
- No retry logic for confirmed misses (`image_fetched_at` set, `image_url` null) — those are intentionally skipped.
- No admin dashboard for cron status in this spec (covered by spec 006).

---

## Option A — Pre-fetch on scan completion

### Where

`src/ui/hooks/useScan.js` — immediately after the `wines.map(mergeCatalogWine)` block.

### Behavior

```
after catalog enrichment:
  for each wine that has catalogId AND no imageUrl:
    fire fetch('/api/wine-image?name=<name>&catalog_id=<catalogId>')
    // fire-and-forget: no await, no error handling needed
```

The fetches run concurrently in the background. The scan `return` is not delayed. When `WineDetailScreen` mounts and calls its own `fetchCatalogImage`, the image will already be cached in Supabase and the response will be instant.

### Edge cases

- If `catalogId` is missing (wine not in catalog), skip — nothing to cache.
- If `imageUrl` is already set (catalog had it), skip — already cached.
- Max ~10 wines per scan × 1 fetch each = at most 10 CSE calls per scan, well within the 100/day quota for typical usage.

---

## Option B — Nightly Cloudflare Cron

### Architecture

The current `wrangler.jsonc` uses `"main": "@tanstack/react-start/server-entry"` which only exports a `fetch` handler. Cloudflare scheduled events require a `scheduled` export on the main Worker module.

**Approach**: create a thin `src/worker.ts` wrapper that:
1. Re-exports the TanStack Start `fetch` handler unchanged (no HTTP behavior changes)
2. Adds a `scheduled` export for cron events

```ts
// src/worker.ts
import tanstackHandler from '@tanstack/react-start/server-entry'
import { createClient } from '@supabase/supabase-js'

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) =>
    (tanstackHandler as any)(req, env, ctx),

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runImageBatch(env))
  },
}
```

`wrangler.jsonc` changes:
- `"main"` → `"src/worker.ts"`
- Add `"triggers": { "crons": ["0 7 * * *"] }` (7am UTC = midnight MT / 3am ET)

### Batch logic (`runImageBatch`)

```
1. Query Supabase for up to 95 wines where:
   image_url IS NULL AND image_fetched_at IS NULL
   ORDER BY RANDOM()   ← different wines each night

2. For each wine (sequentially, not concurrent — rate-limit friendly):
   a. Call Google CSE API
   b. Upsert image_url + image_fetched_at into wine_catalog
   c. Sleep 500ms between calls to stay well under 100 req/day

3. Log count fetched and any errors (Cloudflare dashboard Logs)
```

Batch limit is 95 (not 100) to leave headroom for user-triggered fetches during the day.

### Env vars

The scheduled handler reads `GOOGLE_CSE_KEY`, `GOOGLE_CSE_ID`, and Supabase credentials from `env` (Cloudflare Worker bindings) rather than `process.env`. The wrangler secrets already exist (`GOOGLE_CSE_KEY`, `GOOGLE_CSE_ID`). Supabase URL and anon key are hardcoded constants (safe for anon key).

### Failure modes

- Google CSE quota exceeded: 429 response → log and stop batch early, don't mark wines as fetched.
- Supabase write error: log and continue to next wine.
- Scheduled event timeout (30s default for free / 15min for paid): process as many as time allows; remaining wines will be picked up next night.

---

## Acceptance Criteria

**Option A**
- [ ] After a scan completes, background fetch calls fire for wines with catalogId and no imageUrl
- [ ] Scan return timing is unchanged (no added latency)
- [ ] Opening WineDetailScreen for a just-scanned wine shows image noticeably faster (cache hit instead of fresh CSE call)

**Option B**
- [ ] `wrangler.jsonc` has a cron trigger configured
- [ ] Cloudflare dashboard shows the scheduled Worker in Triggers tab
- [ ] A manual test via `wrangler dev --test-scheduled` triggers the batch and writes rows to Supabase
- [ ] HTTP routing is unchanged — no regression in the app
- [ ] At most 95 Supabase rows updated per nightly run
