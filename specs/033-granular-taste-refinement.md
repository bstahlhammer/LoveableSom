# Spec 033 — Granular Taste Refinement

## Problem
Users have no quick path to manually correct their palate profile without retaking the full quiz. The Stats tab already visualizes the four primary axes (body, sweetness, tannin, acidity) as read-only dots on a track — that surface is intuitive for editing but currently passive. The "Tell us what to change" section in the Words tab is a static placeholder: the textarea is a styled div, not a real input, and the suggestion chips do nothing. Neither user intent (dial adjustments, freeform feedback) is captured or persisted.

## Goals
- Make the Stats view interactive: the four axis tracks become draggable range inputs with a "Save palate" button.
- Wire up the "Tell us what to change" textarea in the Words view: real `<textarea>`, chips append text, value persists to Supabase.
- Add a `recommendation_feedback` column to `profiles` so feedback survives across sessions.
- Emit analytics events for both actions (fits the existing `trackEvent` framework).

## Non-Goals
- Using the freeform feedback text in the ranking/scoring engine (separate spec).
- AI summarization or admin UI for feedback text (separate spec).
- Adding character-axis sliders to the Stats view (they already exist in Words tab).
- Any change to the Radar, Tonight, Receipt, or Account tabs.

## Behavior

### Stats tab — interactive palate sliders
The existing "Style profile · dot = your taste" card in `StatsView` replaces each read-only dot track with a `<input type="range">`. Behavior:
- Dragging any slider updates local state immediately and moves the dot.
- A "Save palate" button appears at the bottom of the card (same visual treatment as the one in Words tab, calls the same `handleSaveTune`).
- The button is disabled while saving; shows "Saving…" text.
- After save, a toast "Palate updated" flashes at the bottom.
- `palateDescriptor` label next to each axis name updates live as user drags.
- `handleSaveTune` is already defined on the parent screen; `StatsView` receives it and `savingTune` as props (same pattern as `WordsView`).
- A `palate_refined` analytics event fires on save: `{ source: 'stats_sliders', axisCount: 4 }`.

### Words tab — functional recommendation feedback textarea
The static styled `<div>` that displays `"Push me a little more adventurous…"` is replaced with a real `<textarea>`. Behavior:
- Placeholder text: `"Tell us what to change — e.g. push me toward more adventurous, less oak, cheaper bottles…"`
- Value is a new `feedbackText` state string initialized from `profiles.recommendation_feedback` on load.
- Suggestion chips (`less sweet`, `more reds`, `open me up`, `cheaper`, `splurgier`) append `", {chip text}"` to the current textarea value when clicked (if empty, insert chip text without the leading comma).
- The existing "Save palate" button in `WordsView` also saves `feedbackText` to `profiles.recommendation_feedback`. No separate save button needed.
- A `recommendation_feedback_saved` analytics event fires on save: `{ charCount: feedbackText.length, hadChips: feedbackText.length > 0 }`.

### Data persistence
`profiles.recommendation_feedback TEXT` — nullable; holds the raw freeform string. Written on every "Save palate" action (alongside `taste_profile`). Read once on profile load and threaded into `ProfileScreen` as part of `tasteProfile` or separately via `auth.profile`.

## DB change
New migration `012_recommendation_feedback.sql`:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recommendation_feedback TEXT;
```
No RLS change needed — existing profile RLS (users read/write own row) covers the new column.

## Edge Cases
- Empty feedback (never typed anything): save writes `NULL` or empty string; no event fired if string is `''`.
- Profile not yet created: "Save palate" already guards on `!tasteProfile`; same guard prevents writing feedback.
- Stats save when profile has no changes: still valid — user may have dragged sliders to the same position. Save proceeds.
- Long feedback text: no client-side length cap needed; Postgres TEXT has no length limit. Add `maxLength={2000}` on the textarea as a UX guard.

## Acceptance Criteria
- Dragging a slider in the Stats tab live-updates the palate descriptor label next to the axis name.
- Clicking "Save palate" in the Stats tab persists the new slider values to Supabase `profiles.taste_profile`.
- After saving from Stats tab, opening the Words tab shows sliders reflecting the values just set.
- "Tell us what to change" textarea accepts input and reflects it in state.
- Clicking a suggestion chip appends text to the textarea without clearing existing content.
- Saving from Words tab writes both `taste_profile` and `recommendation_feedback` to Supabase.
- Reloading the app and returning to the Words tab shows previously saved feedback text.
- `palate_refined` and `recommendation_feedback_saved` events appear in `user_events` after each respective save.

## Files
- `supabase/migrations/012_recommendation_feedback.sql` — new column
- `src/ui/screens/ProfileScreen.jsx` — StatsView gets interactive sliders + save button; WordsView textarea wired up; chips functional; load/save feedback text
- `src/ui/hooks/useTasteProfileSync.js` — extend `saveProfile` to accept + persist `recommendationFeedback` alongside `taste_profile`, and extend `loadProfile` to return it
