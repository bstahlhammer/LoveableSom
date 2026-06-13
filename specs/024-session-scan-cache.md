# Spec 024 — Session Scan Cache

## Problem
Every time a user scans the same shelf (e.g., their home wine rack, a restaurant they visit regularly), the full pipeline runs from scratch: tile OCR → catalog lookup × N wines → AI enrichment pass. There is no memory of what was on that shelf last time. Errors repeat and quota is spent redundantly.

## Goals
- Within a single app session, skip the catalog lookup chain for wines whose name→catalog_id mapping was already resolved.
- Reduce cold-scan time for repeat scans of familiar wines.
- Zero risk of stale data — cache is session-only (never persisted to disk/localStorage).

## Non-Goals
- Cross-session persistence (that requires user accounts and a server-side cache).
- Caching partial or uncertain results — only confirmed catalog matches are cached.
- Caching AI enrichment results.

## Behavior

### Session cache structure
A module-level `Map<normalizedName, catalogWine | null>` in `api.js`:

```js
const _sessionCatalogCache = new Map()
```

- Key: `normalizeWineName(name)` (same normalization as `useScan.js`).
- Value: the `_catalogToWine` result, or `null` if the lookup confirmed no match exists.
- Lifetime: the JS module instance (survives navigation, clears on hard refresh or tab close).

### Cache write
At the end of `lookupWineCatalog`, before returning:
- If a match was found: `_sessionCatalogCache.set(key, result)`
- If no match was found after all passes: `_sessionCatalogCache.set(key, null)` — prevents re-querying a known miss.

### Cache read
At the top of `lookupWineCatalog`, before any Supabase call:
```js
const key = normalizeWineName(name)  // must import or duplicate the normalization
if (_sessionCatalogCache.has(key)) return _sessionCatalogCache.get(key)
```

### Cache invalidation
None needed — the cache is session-scoped. Any catalog data change (e.g., we update a `price_usd`) will be live on the next session. This is acceptable because catalog data changes are rare and user-invisible for day-to-day scanning.

### Cache size limit
Cap at 500 entries to avoid unbounded memory growth in very long sessions:
```js
if (_sessionCatalogCache.size >= 500) _sessionCatalogCache.clear()
```
Simple LRU is not worth the complexity here; a full clear on overflow is fine since 500 entries represents ~500 distinct wine names scanned in one session, which is far beyond normal usage.

## Edge Cases
- Two wines with different names that normalize to the same 40-char key: the second overwrites the first in the cache. Acceptable — this is an edge case of the normalization spec (019), not this spec.
- `lookupWineCatalog` called concurrently for the same name (from the tile pipeline): the second call may start before the first has written the cache. Both will query Supabase in parallel. The second write will just overwrite the first with the same value. No data corruption.
- `null` cached result: `_sessionCatalogCache.has(key)` returns `true`, and `get(key)` returns `null` — caller receives null immediately, AI enrichment can still run if eligible.

## Acceptance Criteria
- On the second scan of the same session containing "Silver Oak Cabernet Sauvignon," no Supabase query is made for that wine (verified via browser network tab — 0 requests to Supabase for cached names).
- A wine that returned null on first lookup returns null immediately on second lookup (no Supabase query).
- Scanning 501 distinct wines in one session does not throw or produce unexpected results (cache clears at 500, subsequent lookups go to Supabase normally).
- Cache is empty on hard page refresh.

## Files to Change
- `src/core/api.js` — add `_sessionCatalogCache` map; add read/write in `lookupWineCatalog`.
- `src/core/api.js` — import or inline the same `normalizeWineName` logic (or extract to a shared util).
