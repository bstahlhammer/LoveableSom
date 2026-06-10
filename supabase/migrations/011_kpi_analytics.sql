-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new
--
-- Creates 5 KPI views for the admin panel (spec 032).
-- user_events table already exists from migration 005.

-- ── v_kpi_recognition: recognition & zero-result rates from scans table ────────

CREATE OR REPLACE VIEW public.v_kpi_recognition AS
SELECT
  COUNT(*)::int                                                                    AS total_scans_30d,
  COUNT(*) FILTER (WHERE wine_count > 0)::int                                     AS scans_with_results,
  COUNT(*) FILTER (WHERE wine_count = 0)::int                                     AS zero_result_scans,
  ROUND(100.0 * COUNT(*) FILTER (WHERE wine_count > 0) / NULLIF(COUNT(*), 0), 1) AS recognition_rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE wine_count = 0) / NULLIF(COUNT(*), 0), 1) AS zero_result_rate_pct
FROM public.scans
WHERE created_at >= NOW() - INTERVAL '30 days';

-- ── v_kpi_catalog: catalog hit rate + palate coverage from scan_wines JSONB ────

CREATE OR REPLACE VIEW public.v_kpi_catalog AS
SELECT
  COUNT(*)::int                                                                          AS total_wine_appearances,
  COUNT(*) FILTER (WHERE sw.wine->>'_catalogId' IS NOT NULL)::int                       AS catalog_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE sw.wine->>'_catalogId' IS NOT NULL)
    / NULLIF(COUNT(*), 0), 1)                                                           AS catalog_hit_rate_pct,
  COUNT(*) FILTER (
    WHERE sw.wine->>'body'   IS NOT NULL
      AND sw.wine->>'tannin' IS NOT NULL
  )::int                                                                                AS wines_with_palate_data,
  ROUND(100.0 * COUNT(*) FILTER (
    WHERE sw.wine->>'body'   IS NOT NULL
      AND sw.wine->>'tannin' IS NOT NULL
  ) / NULLIF(COUNT(*), 0), 1)                                                           AS palate_coverage_pct
FROM public.scan_wines sw
JOIN public.scans s ON s.id = sw.scan_id
WHERE s.created_at >= NOW() - INTERVAL '30 days';

-- ── v_kpi_latency: scan latency, fallback rate, completion from user_events ────

CREATE OR REPLACE VIEW public.v_kpi_latency AS
SELECT
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY (metadata->>'durationMs')::int)           AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'durationMs')::int)           AS p95_ms,
  ROUND(100.0 * COUNT(*) FILTER (WHERE (metadata->>'sonnetFallback')::boolean)
    / NULLIF(COUNT(*), 0), 1)                                                            AS fallback_rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE (metadata->>'wineCount')::int > 0)
    / NULLIF(COUNT(*), 0), 1)                                                            AS completion_rate_pct
FROM public.user_events
WHERE event_type = 'scan_completed'
  AND created_at >= NOW() - INTERVAL '30 days';

-- ── v_kpi_sort: sort mode adoption from user_events ───────────────────────────

CREATE OR REPLACE VIEW public.v_kpi_sort AS
SELECT
  metadata->>'sortKey'                                                                   AS sort_key,
  COUNT(*)::int                                                                          AS times_selected,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1)                        AS pct_of_sort_changes
FROM public.user_events
WHERE event_type = 'sort_changed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY metadata->>'sortKey'
ORDER BY times_selected DESC;

-- ── v_kpi_engagement: save rate + detail view rate from user_events ───────────

CREATE OR REPLACE VIEW public.v_kpi_engagement AS
SELECT
  (SELECT COUNT(*)::int FROM public.user_events
     WHERE event_type = 'scan_completed'
       AND created_at >= NOW() - INTERVAL '30 days')                                    AS scans_completed,
  (SELECT COUNT(*)::int FROM public.user_events
     WHERE event_type = 'wine_saved'
       AND created_at >= NOW() - INTERVAL '30 days')                                    AS wines_saved,
  (SELECT COUNT(*)::int FROM public.user_events
     WHERE event_type = 'wine_detail_viewed'
       AND created_at >= NOW() - INTERVAL '30 days')                                    AS detail_views,
  ROUND(100.0 *
    (SELECT COUNT(*) FROM public.user_events
       WHERE event_type = 'wine_saved'
         AND created_at >= NOW() - INTERVAL '30 days') /
    NULLIF(
      (SELECT SUM((metadata->>'wineCount')::int) FROM public.user_events
         WHERE event_type = 'scan_completed'
           AND created_at >= NOW() - INTERVAL '30 days'), 0
    ), 1)                                                                               AS save_rate_pct,
  ROUND(100.0 *
    (SELECT COUNT(*) FROM public.user_events
       WHERE event_type = 'wine_detail_viewed'
         AND created_at >= NOW() - INTERVAL '30 days') /
    NULLIF(
      (SELECT SUM((metadata->>'wineCount')::int) FROM public.user_events
         WHERE event_type = 'scan_completed'
           AND created_at >= NOW() - INTERVAL '30 days'), 0
    ), 1)                                                                               AS detail_view_rate_pct;
