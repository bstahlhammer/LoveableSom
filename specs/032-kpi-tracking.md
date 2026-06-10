# Spec 032 — KPI Tracking + Admin Panel

## Problem
There is no visibility into whether the two core success functions — bottle recognition and recommendation quality — are working. The admin panel shows engagement metrics (users, scans, weekly activity) but has no signal on how well the app performs at its actual job.

## Goals
- Track the 16 KPIs defined for bottle recognition and recommendation quality.
- Display them in two new sections on the existing admin panel (`/admin`).
- Reuse the `user_events` table stub that already exists (migration 005, not yet instrumented).
- Show DB-derivable KPIs immediately (from existing `scans`/`scan_wines` data); show event-based KPIs as "—" until events flow in.

## Non-Goals
- Real-time dashboards or external analytics services.
- Tracking anonymous (unauthenticated) user behavior — RLS on `user_events` requires auth.
- Alerting or thresholds.
- Retention of raw events beyond what Supabase stores naturally.

## Behavior

### Events emitted (client-side, authenticated users only)

| Event | When fired | Key metadata |
|---|---|---|
| `scan_started` | Top of `scanImage()` in `useScan.js` | none |
| `scan_completed` | Before return in `scanImage()` | `wineCount`, `catalogHits`, `paletteDataCount`, `sonnetFallback`, `durationMs` |
| `sort_changed` | Sort toggle `onChange` in PersonalizedResultsScreen | `sortKey` |
| `wine_saved` | Shortlist toggle (add only) in PersonalizedResultsScreen | `wineName`, `catalogId` |
| `wine_detail_viewed` | Wine card tap in PersonalizedResultsScreen | `wineName`, `catalogId`, `computedMatch` |

All events are fire-and-forget: they never block or delay UI actions. Unauthenticated users silently skip event emission.

### DB views (migration 011)

Five new views:
- `v_kpi_recognition` — recognition rate and zero-result rate from `scans`
- `v_kpi_catalog` — catalog hit rate and palate data coverage from `scan_wines` JSONB
- `v_kpi_latency` — latency p50/p95, fallback rate, completion rate from `user_events`
- `v_kpi_sort` — sort mode adoption from `user_events`
- `v_kpi_engagement` — save rate and detail view rate from `user_events`

### Admin panel additions
Two new sections inserted between "Overview" and "Users":
- **Bottle Recognition** — 6 KpiCards: recognition rate, zero-result rate, catalog hit rate, fallback rate, latency p50, latency p95
- **Recommendation Quality** — 4 KpiCards + sort adoption table: palate coverage, save rate, detail view rate, completion rate

## Edge Cases
- No scan events in 30 days: KpiCards show 0% or "—".
- No `user_events` yet: event-based KpiCards show "—" (view returns NULLs, not an error).
- View query fails (migration not run): KpiCards show "—" silently (error is caught, not surfaced).

## Acceptance Criteria
- `scan_completed` event appears in `user_events` table after an authenticated scan, with correct metadata shape.
- `sort_changed` event appears after clicking a sort tab.
- `wine_saved` event appears when saving (not when removing) a wine.
- `wine_detail_viewed` appears on wine card tap.
- Admin panel shows two new sections; DB-derivable KPIs (recognition rate, zero-result rate, catalog hit rate, palate coverage) show numeric values immediately from existing data.
- Event-based KPIs show "—" before first events; populate automatically once events exist.

## Files
- `supabase/migrations/011_kpi_analytics.sql` — 5 SQL views
- `src/core/analytics.js` — `trackEvent()` utility
- `src/ui/hooks/useScan.js` — wire `scan_started` + `scan_completed`
- `src/ui/screens/PersonalizedResultsScreen.jsx` — wire `sort_changed`, `wine_saved`, `wine_detail_viewed`
- `src/ui/screens/AdminScreen.jsx` — 2 new sections, 5 new data fetches
