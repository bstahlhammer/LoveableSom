# Spec 040 — Learn From What You Disliked

## Problem
When a user rates a wine 1 or 2 stars, the app records the rating but learns almost nothing from it. A dislike is treated the same as an absence of data — the low score feeds into `inferPalateFromRatings` as a weak negative signal, but the user never finds out what specifically they didn't like, and the app never surfaces that learning back to them. For a curious wine learner, understanding *why* a wine didn't work for them is at least as valuable as knowing what they love. "Too tannic" and "too sharp" are different problems that point to different future choices.

## Goals
- When a user rates a wine 1 or 2 stars, prompt them to pick what put them off (multi-select, optional).
- Map each "off" reason to a palate axis direction, and surface the aggregate learning in ProfileScreen.
- Show a plain-language "what we learned from your dislikes" insight when ≥3 dislike reasons have been submitted.

## Non-Goals
- Changing the existing star rating UX for 3–5 star wines.
- Using dislike reasons to directly adjust the palate vector (that's spec 015 adaptive palate — this spec only surfaces insight, not auto-adjustment).
- Requiring the dislike reason before the rating saves (always optional, never blocking).

## Behavior

### Dislike reason picker
In WineDetailScreen, immediately after the user taps 1 or 2 stars, a new row expands below the StarRating component (same slot where TasteMatchPicker currently appears for all ratings):

```
What put you off?  (skip)

[ Too tannic ]  [ Too oaky ]  [ Too sharp ]
[ Too sweet ]   [ Too bitter ] [ Too flat ]
[ Too strong ]  [ Just not my style ]
```

Multi-select pills. Same pill style as ProfileScreen suggestion chips (border, rounded, T.fontBody 13px). Selected state: T.scarlet100 background, T.scarlet600 border and text. "skip" is an inline text link (T.ink400, 12px, underlined) that dismisses the picker without recording reasons.

The reasons save alongside the star rating when the user taps the "Save" button (which already exists in the footer rating section). The picker only appears for 1–2 star ratings — not for 3–5 stars.

### Dislike reason options and axis mappings
| Option | Display label | Axis signal |
|---|---|---|
| too_tannic | Too tannic | tannin ↓ |
| too_oaky | Too oaky | oak ↓ (character axis) |
| too_sharp | Too sharp/acidic | acidity ↓ |
| too_sweet | Too sweet | sweetness ↓ |
| too_bitter | Too bitter | tannin ↓ |
| too_flat | Too flat/boring | acidity ↑, body ↑ (wants more structure) |
| too_strong | Too strong/alcoholic | body ↓ |
| not_my_style | Just not my style | no axis signal |

### Data persistence
Extend `user_ratings` with `dislike_reasons TEXT[]` (nullable). New Supabase migration.

`saveRating` in `useWineRatings` accepts an optional `dislikeReasons: string[]` parameter and writes it to the column when provided.

### "What your dislikes tell us" insight (ProfileScreen)
New section in the ProfileScreen Words tab, below the existing recommendation feedback textarea. Renders only when the user has ≥3 dislike reasons recorded (across all low-rated wines).

Heading: `WHAT YOUR DISLIKES TELL US`

Content: up to 3 plain-language insights, generated from the aggregate of all `dislike_reasons` records. Each insight is a single sentence.

Examples:
- 5 ratings said "too tannic" → "You've flagged tannic wines 5 times. We've noted you want soft, approachable reds."
- 3 ratings said "too sharp" → "Highly acidic wines have felt sharp to you — we dial back on racy, high-acid styles."
- Only "not_my_style" present: no insights rendered (no axis signal).

`generateDislikeInsights(reasonCounts)` function added to `src/core/engine/palateDescriptor.js`. Input: `{ too_tannic: 5, too_sharp: 3, ... }`. Output: `string[]` of insight sentences.

### Hook: `useDislikeReasons`
`src/ui/hooks/useDislikeReasons.js` — fetches all dislike reasons for the logged-in user, returns aggregated counts. Called once in ProfileScreen on mount.

## Edge Cases
- User taps 1 star, sees the picker, then changes to 4 stars: the picker collapses and the saved rating clears any previously selected reasons for this wine.
- User rates the same wine a second time: the second rating overwrites the first (existing behavior) including any dislike reasons.
- Picker is shown but user immediately taps Save without selecting any reason: `dislikeReasons` saves as null.
- `dislike_reasons` column added as nullable — no migration on existing rows, no backfill needed.

## Acceptance Criteria
- Rating a wine 1 or 2 stars expands the dislike reason picker below the star row.
- Rating a wine 3 stars does not show the dislike picker.
- Selecting "Too tannic" and "Too oaky" and tapping Save persists both reasons to `user_ratings.dislike_reasons`.
- Tapping "skip" dismisses the picker and saves the rating without any reasons.
- A user who has selected "Too tannic" on 5 different wines sees the tannin insight sentence in the ProfileScreen Words tab.
- The Words tab shows no dislike-insights block when the user has fewer than 3 total dislike reasons recorded.

## Files
- `supabase/migrations/013_dislike_reasons.sql` — add `dislike_reasons TEXT[]` to `user_ratings`
- `src/ui/screens/WineDetailScreen.jsx` — dislike picker below StarRating for 1–2 star ratings
- `src/ui/hooks/useWineRatings.js` — extend `saveRating` to accept + persist `dislikeReasons`
- `src/ui/hooks/useDislikeReasons.js` — new hook, fetches + aggregates reasons
- `src/core/engine/palateDescriptor.js` — add `generateDislikeInsights(reasonCounts)`
- `src/ui/screens/ProfileScreen.jsx` — Words tab: add dislike insights section
