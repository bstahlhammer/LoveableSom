# Spec 011 — Score Feedback

## Goal

Let users tell the app whether the taste fit score and wine quality score matched their actual experience with a wine. This gives Brian signal on model accuracy and builds user trust ("we're listening").

## Non-goals

- Does not replace or change the existing "Rate this wine" star/taste-match flow in the sticky footer.
- Does not migrate existing localStorage ratings to Supabase (separate task).
- Does not use the score feedback to recalculate scores in real time.

## User-facing behavior

### Where it appears

A "How'd We Do?" card appears in the **scrollable body of WineDetailScreen**, between the "Find this wine online" button and the Shelf Spotlight (or the bottom padding). It is only shown when:
- A `matchScore` is present (i.e., the user has a taste profile and the score is computed), **OR** `wine.rating > 0` (critic score is shown)
- The user is logged in (`user` is truthy)

### Interaction

The card shows a single prompt and three choice chips:

```
─────────────────────────────────
  HOW'D WE DO?
  Did our score match your experience?

  [ Nailed it ]  [ Pretty close ]  [ Missed it ]
─────────────────────────────────
```

- Tapping a chip saves immediately (no separate Save button).
- After save, the card transitions to a confirmation state:
  ```
  ✓ Thanks — this helps us get better.   [Change]
  ```
  The [Change] link resets to the picker.
- An optional note textarea appears only after "Missed it" is selected (before save), to let the user say what was off.

### Saved data

Saves to a new Supabase table `wine_score_feedback`:

| column | type | notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users, cascade delete |
| wine_catalog_id | bigint | FK wine_catalog.id, nullable |
| wine_name | text | denormalized — always set |
| taste_fit_score | int | matchScore at time of feedback, nullable |
| we_points | int | wine.rating at time of feedback, nullable |
| accuracy | text | `nailed_it` / `pretty_close` / `missed_it` |
| note | text | nullable, only populated on missed_it |
| submitted_at | timestamptz | default now() |

RLS: users can insert/select/update/delete their own rows only.

### Persistence across sessions

On component mount, query Supabase for any existing feedback for this wine (matched by `wine_catalog_id` if available, else `wine_name`). If found, start in confirmation state showing the prior choice.

### Edge cases

- No match score AND no critic score → card is hidden (nothing meaningful to rate accuracy on).
- User not logged in → card is hidden.
- Supabase insert fails → show a brief inline "Couldn't save, try again" error; do not show a modal.
- Same wine appears in multiple scans → feedback is per `wine_catalog_id` (or `wine_name`), not per scan. Only one feedback record per user per wine.

## Acceptance criteria

- [ ] Migration `007_wine_score_feedback.sql` creates the table with RLS.
- [ ] "How'd we do?" card renders below "Find this wine online" only when conditions are met.
- [ ] Tapping a chip saves to Supabase and transitions to confirmation state.
- [ ] "Missed it" reveals a note textarea before save.
- [ ] Returning to a wine with prior feedback shows the confirmation state.
- [ ] Logged-out users do not see the card.
- [ ] All inline (Painted Bunting T.* tokens, no CSS relative color syntax, inline component per style guide).
