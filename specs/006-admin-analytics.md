# Spec 006 — Admin Analytics Dashboard

**Goal:** A `/admin` screen showing user KPIs and usage patterns, backed by Supabase SQL views built on existing data. No third-party analytics tools.

---

## Goals

- See all users: who they are, when they joined, how often they use the app
- Track key KPIs: total users, MAU/WAU, scans, feature adoption
- See top wines being scanned
- Weekly trend view (new users + active users over last 8 weeks)
- Gated to admin only (bstahlhammer@gmail.com)
- All data from existing tables — no new instrumentation required for phase 1

## Non-goals

- Per-event tracking (wine views, shortlist taps, etc.) — defined in schema as phase 2, not instrumented yet
- Charts or graph libraries — all visuals are plain divs/bars using the existing design system
- Export / CSV download
- Multiple admin users

---

## Architecture

### Why a `user_profiles` mirror table

`auth.users` (where emails and signup dates live) is not readable by the anon key — only by the Supabase service role. Rather than expose a service key in the deployed Worker, we create a `user_profiles` table in `public` schema, populated by a Postgres trigger whenever a user signs up or logs in. Views join to this table, which is readable by the authenticated admin via RLS.

### Data flow

```
auth.users → [trigger] → public.user_profiles
                                 ↓
              scans + scan_wines + label_requests
                                 ↓
                    SQL views (v_admin_*)
                                 ↓
                      /admin screen (React)
```

---

## Schema changes (`005_admin_analytics.sql`)

### `public.user_profiles`
```sql
id              UUID PRIMARY KEY  -- matches auth.users.id
email           TEXT NOT NULL
display_name    TEXT
created_at      TIMESTAMPTZ
last_sign_in_at TIMESTAMPTZ
```

Trigger: `AFTER INSERT OR UPDATE ON auth.users` → upserts into `user_profiles`.

Backfill: a one-time query (run in SQL editor with service-role access) copies existing `auth.users` rows into `user_profiles`.

RLS:
- Authenticated users can read their own row (`id = auth.uid()`)
- Admin can read all rows (`auth.email() = 'bstahlhammer@gmail.com'`)

### `public.user_events` (phase 2 — defined now, instrumented later)
```sql
id          BIGSERIAL PRIMARY KEY
user_id     UUID REFERENCES auth.users(id)
event_type  TEXT   -- 'wine_viewed' | 'shortlist_saved' | 'rating_given' | 'taste_builder_completed'
metadata    JSONB  -- e.g. { wine_id, wine_name }
created_at  TIMESTAMPTZ DEFAULT NOW()
```

RLS: users insert/read their own rows. Admin reads all.

---

## SQL Views

### `v_admin_overview` — single summary row
| Column | Source |
|---|---|
| total_users | COUNT(user_profiles) |
| new_users_7d | signups in last 7 days |
| new_users_30d | signups in last 30 days |
| mau | distinct user_ids with a scan in last 30 days |
| wau | distinct user_ids with a scan in last 7 days |
| total_scans_30d | scans.created_at in last 30 days |
| total_scans_all | COUNT(scans) |
| avg_scans_per_user | total_scans / total_users |
| label_requests_total | COUNT(label_requests) |

### `v_admin_users` — one row per user
| Column | Source |
|---|---|
| user_id | user_profiles.id |
| email | user_profiles.email |
| display_name | user_profiles.display_name |
| joined_at | user_profiles.created_at |
| last_sign_in | user_profiles.last_sign_in_at |
| last_scan_at | MAX(scans.created_at) |
| scan_count | COUNT(scans) |
| wines_scanned | COUNT(scan_wines) |
| label_requests | COUNT(label_requests) |
| days_since_active | NOW() - MAX(scans.created_at) |

Ordered by `last_scan_at DESC` by default.

### `v_admin_weekly` — last 12 weeks of activity
| Column | Source |
|---|---|
| week_start | DATE_TRUNC('week', ...) |
| new_users | users who joined that week |
| active_users | distinct users with a scan that week |
| total_scans | scans that week |

### `v_admin_top_wines` — most scanned wines (last 30 days)
| Column | Source |
|---|---|
| wine_name | scan_wines.wine->>'name' |
| scan_count | COUNT(*) |

Top 20, ordered by scan_count DESC.

---

## `/admin` screen

### Access control
Route renders a `<NotAuthorized />` message if the authenticated user's email is not `bstahlhammer@gmail.com`. Check happens client-side (via `useAuth`) — no server-side enforcement needed for a personal app.

### Layout

**Top bar:** "Admin" label + current date + sign-out link

**KPI cards (horizontal row, scrollable on mobile):**
- Total Users
- MAU (30d)
- WAU (7d)
- New This Week
- Total Scans (30d)
- Avg Scans/User

**Users table (scrollable):**
Columns: Email · Joined · Last Active · Scans · Wines Seen · Days Inactive
Default sort: Last Active desc. Click row → (no action in phase 1)

**Weekly activity (last 8 weeks):**
Two relative-width bar rows per week (new users / active users). No chart library — plain divs.

**Top wines:**
Ranked list of wine names + scan count for last 30 days.

### Navigation
`/admin` is a proper TanStack route (added to `routeTree.gen.ts`). Access it by navigating directly to the URL. No nav link in the main app UI (admin-only, no need to clutter the user-facing nav).

---

## Acceptance criteria

- [ ] Migration applied: `user_profiles` table exists, trigger fires on login (verify by logging in and checking the table)
- [ ] Backfill run: all existing users appear in `user_profiles`
- [ ] All 4 views return data without error when queried as the admin user
- [ ] `/admin` renders KPI cards with real numbers
- [ ] User table shows all users with correct scan counts
- [ ] Weekly activity rows render for the last 8 weeks
- [ ] Top wines list appears
- [ ] Navigating to `/admin` while logged in as a non-admin user shows a "not authorized" message
- [ ] Navigating to `/admin` while logged out redirects to or shows the auth screen
