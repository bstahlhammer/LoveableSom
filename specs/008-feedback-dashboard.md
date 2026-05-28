# Spec 008 · Feedback Dashboard

## Goals
- Give users a low-friction way to submit bugs, feature requests, and UX feedback from within the app
- Give the admin a prioritized, scannable view of all feedback in the admin panel

## Non-goals
- Email notifications on new submissions
- Public-facing status page or user-facing "we got it" tracking
- Rich-text formatting or attachments

## Supabase schema

New table: `feedback`

```sql
create table feedback (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('bug', 'feature', 'ux')),
  message     text not null,
  user_id     uuid references auth.users(id) on delete set null,
  page        text,          -- e.g. 'home', 'results', 'detail', 'admin'
  created_at  timestamptz default now(),
  status      text not null default 'new' check (status in ('new', 'reviewed', 'resolved'))
);

-- Allow authenticated users to insert their own rows; no read
alter table feedback enable row level security;
create policy "insert own" on feedback for insert to authenticated
  with check (user_id = auth.uid());
-- Admin reads all via service role (API route)
```

## API route: POST /api/feedback
- Authenticated (requires Bearer session token)
- Body: `{ type, message, page? }`
- Inserts row into `feedback`; returns 201
- No AI processing — pure pass-through

## User-facing submission UI
A floating "Feedback" tab on the right edge of the screen, visible on all main app screens (Home, ScanPrompt, PersonalizedResults, WineDetail). Tapping opens a bottom sheet with:

1. Type selector: three pill buttons — Bug | Feature | UX feedback
2. Textarea: "Describe the issue or idea…" (4 rows, 1000 char max)
3. Submit button (disabled until type + message filled)
4. On success: brief confirmation ("Thanks — got it") then auto-dismiss after 1.5s

The tab + sheet live in a shared `FeedbackWidget` component rendered by the top-level `App` or root layout, so it doesn't need to be threaded into every screen.

## Admin dashboard section (in AdminScreen.jsx)

New `FeedbackSection` component appended after the Cost Estimator section.

### Summary row (KPI cards)
- New (status = 'new')
- Reviewed (status = 'reviewed')
- Resolved (status = 'resolved')
- Total

### Type breakdown (inline counts)
Bug · Feature · UX — shown as small badges below the KPI row

### Submissions list
Table columns: Type pill | Message (truncated to 2 lines) | User email | Page | Age | Status toggle

Status toggle: click cycles new → reviewed → resolved (PATCH via Supabase admin client using service role from the API, or direct Supabase update from the admin screen since we already trust the logged-in admin).

Most recent 50 submissions, newest first.

## Edge cases
- Unauthenticated users: submission silently requires sign-in; no submission UI shown to logged-out users
- Empty message or no type: Submit button stays disabled
- Network failure: show inline error "Couldn't send — try again"

## Acceptance criteria
- [ ] Feedback table migration runs cleanly
- [ ] Floating widget appears on main screens, does not obscure primary UI
- [ ] Bug/Feature/UX submissions write to Supabase with correct type + user_id
- [ ] Admin panel shows count cards and list of recent submissions
- [ ] Admin can toggle status (new/reviewed/resolved) inline
- [ ] Confirmed on deployed build
