# Spec 018 — Image Prefetch on Scan Results

## Problem

Images are currently fetched lazily — only when a user taps into WineDetailScreen. That means:
- First tap into any wine shows a blank hero until the SerpAPI call completes (~1–2s)
- If the user never taps a wine, its image is never fetched

## Goal

When a results screen loads (PersonalizedResultsScreen or AnonResultsScreen), fire background image fetches for every wine in the list. By the time the user taps a card, the image is already cached in Supabase and WineDetailScreen loads it instantly.

## Non-goals

- No UI changes — images still only appear in WineDetailScreen
- No changes to scan speed or the scanning pipeline
- No new API endpoints

## Behavior

On mount of either results screen, after the wine list is ready:
1. Collect all wines that have a `_catalogId` (catalog-backed wines only — non-catalog wines have no row to write back to)
2. Filter to wines that don't already have `imageUrl` set (already have an image — skip)
3. Fire `fetchCatalogImage(wine._catalogId, wine.name)` for each, in parallel, as fire-and-forget
4. No UI feedback — this is silent background work
5. Capped at the top 20 wines by list order (preserves SerpAPI quota — free tier is 100/month)

## Edge cases

- If a wine already has `imageUrl` in the enriched data, skip it (no unnecessary API calls)
- Non-catalog wines (source = 'web' or 'ai', no `_catalogId`) are skipped
- If SerpAPI quota is exhausted, endpoint returns `{ imageUrl: null }` gracefully — no error shown to user
- Fire-and-forget: prefetch failure is silent; WineDetailScreen lazy fetch still runs as fallback

## Files to change

| File | Change |
|---|---|
| `src/ui/screens/PersonalizedResultsScreen.jsx` | Add prefetch useEffect after wines are ready |
| `src/ui/screens/AnonResultsScreen.jsx` | Same |

## Acceptance criteria

- [ ] Opening PersonalizedResultsScreen triggers image fetches for up to 20 catalog wines in the background
- [ ] Opening AnonResultsScreen does the same
- [ ] Wines with existing `imageUrl` are skipped (no redundant calls)
- [ ] Wines without `_catalogId` are skipped
- [ ] Tapping into WineDetailScreen for a prefetched wine shows the image immediately (from cache)
- [ ] No visible UI change — no loading states, no errors shown
