# Spec 001 — In-App Feedback Capture

## Goals
- Let authenticated users submit feedback or feature requests without leaving the app
- Auto-capture context (current screen, user ID, timestamp) so every submission is actionable
- Store everything in Supabase (existing infra) where Brian can review, prioritize, and track status

## Non-goals
- Anonymous/guest feedback (only logged-in users)
- Two-way communication back to the submitter
- A dedicated admin UI — Brian reviews via Supabase Table Editor

---

## Supabase setup (manual step before code)

Run in Supabase SQL editor:

```sql
create table feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  type          text not null check (type in ('Bug', 'Feature Request', 'UX Feedback')),
  description   text not null check (char_length(description) between 10 and 500),
  screen        text,
  submitted_at  timestamptz not null default now(),
  status        text not null default 'New',
  priority      text
);

-- Users can insert their own rows; only service role (Brian's dashboard) can read
alter table feedback enable row level security;

create policy "users can submit feedback"
  on feedback for insert
  to authenticated
  with check (auth.uid() = user_id);
```

Brian reviews at: Supabase dashboard → Table Editor → `feedback`

---

## User-facing behavior

### Floating Action Button (FAB)
- Fixed position: bottom-right corner, `bottom: 88px` (clears BottomNav), `right: 16px`
- Visible on all screens where `auth.user` is present
- Small pill button: pencil icon + "Feedback" label
- Uses `theme.colors.brand` background, `theme.colors.textOnDark` text

### Feedback Modal
Opens on FAB click. Contains:

1. **Type** — three tappable pill options: `Bug` | `Feature Request` | `UX Feedback`  
   Default: `Feature Request`
2. **Description** — textarea, placeholder "What's on your mind?", char counter "N/500"
3. **Submit** — disabled until description ≥ 10 chars; shows spinner while submitting
4. **Cancel / ×** — closes modal, resets form

Modal style: dark overlay (`rgba(0,0,0,0.5)`), centered card in `theme.colors.surface`, `theme.radius.lg`, consistent with existing sheet patterns.

### Submission flow
- Submit tapped → button disabled + spinner
- **Success:** modal closes + resets, calls `showToast('Feedback sent — thanks!')` via existing `showToast` prop
- **Error:** calls `showToast('Couldn\'t send — try again')`, modal stays open, inputs re-enabled

### Auto-captured (not shown to user)
| Field | Source |
|---|---|
| `user_id` | `auth.user.id` from `useAuth()` |
| `screen` | `screen` state from `UncorkApp.jsx` |
| `submitted_at` | Supabase `default now()` |

---

## Components

| File | Purpose |
|---|---|
| `src/ui/components/FeedbackFAB.jsx` | Floating button; owns modal open/close state |
| `src/ui/components/FeedbackModal.jsx` | Overlay form; receives `currentScreen`, `userId`, `showToast`, `onClose` |

Both are self-contained inline-style components following the existing pattern.

### Integration in `UncorkApp.jsx`
Add after the existing `{toast && <Toast message={toast} />}` line:

```jsx
import FeedbackFAB from './ui/components/FeedbackFAB.jsx'

{auth.user && (
  <FeedbackFAB
    currentScreen={screen}
    userId={auth.user.id}
    showToast={showToast}
  />
)}
```

---

## Edge cases
- Network / Supabase failure → error toast; modal stays open for retry
- Double-tap submit → button disabled on first tap
- Paste over 500 chars → textarea capped at 500, counter turns red at ≥490
- BottomNav overlap → FAB `bottom` offset accounts for nav height (88px)

---

## Acceptance criteria
- [ ] Supabase `feedback` table exists with RLS in place
- [ ] FAB visible on all screens when logged in; hidden for guests
- [ ] FAB does not overlap BottomNav or critical interactive elements
- [ ] Modal captures type + description; auto-captures screen, user_id, timestamp
- [ ] Successful submit creates a row in Supabase with all fields populated
- [ ] `showToast('Feedback sent — thanks!')` fires on success, modal closes + resets
- [ ] `showToast('Couldn\'t send — try again')` fires on error, modal stays open
- [ ] Submit button disabled until description ≥ 10 chars
- [ ] Textarea hard-capped at 500 chars with counter
- [ ] No console errors on happy path
