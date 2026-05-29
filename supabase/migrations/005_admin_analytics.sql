-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new
--
-- IMPORTANT: After running this, also run the backfill query at the bottom
-- (separate paste) to populate existing users.

-- ── user_profiles: mirrors auth.users, readable by anon key ──────────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  display_name    TEXT,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin reads all profiles"
  ON public.user_profiles FOR SELECT
  USING (auth.email() = 'bstahlhammer@gmail.com');

-- Trigger: keep user_profiles in sync whenever someone signs up or logs in
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, created_at, last_sign_in_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'display_name',
    NEW.created_at,
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email           = EXCLUDED.email,
    display_name    = EXCLUDED.display_name,
    last_sign_in_at = EXCLUDED.last_sign_in_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_change ON auth.users;
CREATE TRIGGER on_auth_user_change
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile();

-- ── Admin read policies on existing tables ────────────────────────────────────
-- Required so the admin can see all rows in the analytics views.

CREATE POLICY "Admin reads all scans"
  ON public.scans FOR SELECT
  USING (auth.email() = 'bstahlhammer@gmail.com');

CREATE POLICY "Admin reads all scan wines"
  ON public.scan_wines FOR SELECT
  USING (auth.email() = 'bstahlhammer@gmail.com');

CREATE POLICY "Admin reads all label requests"
  ON public.label_requests FOR SELECT
  USING (auth.email() = 'bstahlhammer@gmail.com');

-- ── user_events: phase 2 stub — defined now, instrumented later ───────────────

CREATE TABLE IF NOT EXISTS public.user_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_events_user_created_idx
  ON public.user_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_events_type_created_idx
  ON public.user_events (event_type, created_at DESC);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events"
  ON public.user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own events"
  ON public.user_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all events"
  ON public.user_events FOR SELECT
  USING (auth.email() = 'bstahlhammer@gmail.com');

-- ── Analytics views ───────────────────────────────────────────────────────────

-- Single-row KPI summary
CREATE OR REPLACE VIEW public.v_admin_overview AS
SELECT
  (SELECT COUNT(*)                   FROM public.user_profiles)                                           AS total_users,
  (SELECT COUNT(*)                   FROM public.user_profiles WHERE created_at >= NOW() - INTERVAL '7 days')  AS new_users_7d,
  (SELECT COUNT(*)                   FROM public.user_profiles WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
  (SELECT COUNT(DISTINCT user_id)    FROM public.scans         WHERE created_at >= NOW() - INTERVAL '30 days') AS mau,
  (SELECT COUNT(DISTINCT user_id)    FROM public.scans         WHERE created_at >= NOW() - INTERVAL '7 days')  AS wau,
  (SELECT COUNT(*)                   FROM public.scans         WHERE created_at >= NOW() - INTERVAL '30 days') AS total_scans_30d,
  (SELECT COUNT(*)                   FROM public.scans)                                                    AS total_scans_all,
  (SELECT COUNT(*)                   FROM public.label_requests)                                           AS label_requests_total,
  ROUND(
    (SELECT COUNT(*) FROM public.scans)::numeric /
    NULLIF((SELECT COUNT(*) FROM public.user_profiles), 0),
  1) AS avg_scans_per_user;

-- One row per user with engagement stats
CREATE OR REPLACE VIEW public.v_admin_users AS
SELECT
  up.id                                                        AS user_id,
  up.email,
  up.display_name,
  up.created_at                                                AS joined_at,
  up.last_sign_in_at,
  MAX(s.created_at)                                            AS last_scan_at,
  COUNT(DISTINCT s.id)::int                                    AS scan_count,
  COUNT(DISTINCT sw.id)::int                                   AS wines_scanned,
  COUNT(DISTINCT lr.id)::int                                   AS label_requests,
  EXTRACT(DAY FROM NOW() - MAX(s.created_at))::int             AS days_since_active
FROM public.user_profiles up
LEFT JOIN public.scans         s  ON s.user_id      = up.id
LEFT JOIN public.scan_wines    sw ON sw.user_id     = up.id
LEFT JOIN public.label_requests lr ON lr.requested_by = up.id
GROUP BY up.id, up.email, up.display_name, up.created_at, up.last_sign_in_at
ORDER BY last_scan_at DESC NULLS LAST;

-- New users and active users by week, last 12 weeks
CREATE OR REPLACE VIEW public.v_admin_weekly AS
WITH weeks AS (
  SELECT generate_series(
    DATE_TRUNC('week', NOW() - INTERVAL '11 weeks'),
    DATE_TRUNC('week', NOW()),
    INTERVAL '1 week'
  ) AS week_start
),
signups AS (
  SELECT DATE_TRUNC('week', created_at) AS week_start, COUNT(*) AS new_users
  FROM public.user_profiles GROUP BY 1
),
activity AS (
  SELECT DATE_TRUNC('week', created_at) AS week_start,
         COUNT(DISTINCT user_id)        AS active_users,
         COUNT(*)                       AS total_scans
  FROM public.scans GROUP BY 1
)
SELECT
  w.week_start,
  COALESCE(sg.new_users,      0)::int AS new_users,
  COALESCE(ac.active_users,   0)::int AS active_users,
  COALESCE(ac.total_scans,    0)::int AS total_scans
FROM weeks w
LEFT JOIN signups  sg ON sg.week_start = w.week_start
LEFT JOIN activity ac ON ac.week_start = w.week_start
ORDER BY w.week_start DESC;

-- Top 20 wines scanned in the last 30 days
CREATE OR REPLACE VIEW public.v_admin_top_wines AS
SELECT
  sw.wine->>'name'  AS wine_name,
  COUNT(*)::int     AS scan_count
FROM public.scan_wines sw
JOIN public.scans s ON s.id = sw.scan_id
WHERE s.created_at >= NOW() - INTERVAL '30 days'
  AND sw.wine->>'name' IS NOT NULL
GROUP BY sw.wine->>'name'
ORDER BY scan_count DESC
LIMIT 20;
