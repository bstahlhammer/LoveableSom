# Spec 031 — Collaborative Filtering ("Users Like You Also Loved")

## Problem
Every recommendation is intrinsic — computed solely from wine attributes vs. the individual user's profile. The app has no awareness of other users. Two users with nearly identical palates might love the same obscure wine, but neither benefits from what the other discovered.

Collaborative filtering is the most powerful recommendation technique at scale. Even a simple "users who loved the same wines you loved also rated these highly" signal dramatically improves discovery.

## Goals
- Surface a small set of "Users like you also loved" picks on the results screen.
- Require explicit account creation / rating history — never use anonymous scan data.
- Keep the signal additive: it never replaces the palate-match list, only extends it.
- Design the data model now (even if the UI remains a stub) so the foundation is correct.

## Non-Goals
- Real-time collaborative filtering at scan time (too slow; must be pre-computed).
- Sharing user data across accounts without explicit consent.
- Any implementation before user accounts exist in the app.

## Behavior

### Prerequisite: user accounts
This spec cannot ship before the app has authenticated user accounts with persistent rating history. This spec defines the target architecture; implementation is gated on that prerequisite.

### Data model additions (Supabase)

```sql
-- Per-user wine ratings (loved / liked / disliked / hated)
CREATE TABLE user_ratings (
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  catalog_id   integer NOT NULL REFERENCES wine_catalog(id),
  bucket       text NOT NULL CHECK (bucket IN ('loved','liked','disliked','hated')),
  rated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, catalog_id)
);

-- Pre-computed collaborative picks (refreshed nightly by cron worker)
CREATE TABLE collab_picks (
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  catalog_id   integer NOT NULL REFERENCES wine_catalog(id),
  score        float NOT NULL,  -- collaborative affinity score 0–1
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, catalog_id)
);
```

### Similarity computation (nightly cron)
For each user who has ≥ 3 "loved" ratings:
1. Find all other users who share ≥ 3 loved wines with the current user.
2. For each neighbor, identify wines they "loved" that the current user has not rated.
3. Score each candidate wine by: (number of neighbors who loved it) × (average neighbor similarity score).
4. Write top 10 candidates per user into `collab_picks`.

Neighbor similarity = Jaccard similarity on their sets of loved wine IDs.

This runs as the existing Cloudflare Worker cron (see `wrangler.jsonc` — already scheduled at 7:00 UTC).

### UI surface
On `PersonalizedResultsScreen`, below the main ranked list, a "Neighbors also loved" horizontal scroll section shows up to 3 cards from `collab_picks` that are NOT already in the scanned wine list.

The section only renders when:
- User is authenticated
- `collab_picks` has ≥ 1 entry for this user
- At least 1 of those entries is not in the current scan results

Cards in this section show name, match score, and a "similar users loved it" pill. They do not participate in the main list's sort or ranking.

### Privacy
- `user_ratings` and `collab_picks` are protected by Supabase RLS: each user can only read/write their own rows.
- The similarity computation runs server-side (Worker with SERVICE_KEY) and only writes to `collab_picks` — users never see each other's rating lists.
- Opt-out: a user setting "Don't use my ratings for recommendations" sets a flag that excludes them from the neighbor computation (they still receive collab picks from others who haven't opted out).

## Edge Cases
- User has < 3 loved ratings: no neighbor computation runs; no collab section shown.
- No neighbors share 3+ loved wines: collab section not shown.
- All collab picks are already in the current scan: section not shown.
- Cron hasn't run yet (new user): collab section not shown (table empty).

## Acceptance Criteria (for when accounts exist)
- A user with 5 loved wines in common with another user sees "Neighbors also loved" suggestions from that neighbor.
- Suggestions do not include wines already in the scan results.
- A user with < 3 loved ratings never sees the collaborative section.
- `collab_picks` is refreshed nightly; picks are no more than 25 hours stale.
- Disabling the preference "Use my ratings for recommendations" removes the user from neighbor computations within one cron cycle.

## Files to Create (when accounts are ready)
- `src/routes/api/compute-collab-picks.ts` — new Worker cron handler.
- `src/ui/screens/PersonalizedResultsScreen.jsx` — add "Neighbors also loved" section.
- Supabase: run the SQL above to create `user_ratings` and `collab_picks` tables.
