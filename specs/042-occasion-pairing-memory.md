# Spec 042 — Occasion & Pairing Memory

## Problem
The app captures scan context (restaurant vs. shelf) and knows the food pairings for every wine. But it never connects these signals over time. A user who has scanned at restaurants 4 times and consistently ordered medium reds has no feedback loop — they can't see their own patterns. This matters especially for someone learning to pair wine with their life: understanding "I gravitate toward whites when cooking at home" or "at restaurants I always pick by the glass" is personal insight that builds confidence over time.

## Goals
- Aggregate a user's scan and rating history by occasion/context (restaurant, home/shelf, wine shop, special occasion).
- Surface 2–3 pattern sentences in ProfileScreen when enough data exists (≥5 scans or ≥8 ratings).
- Optionally let users tag any scan with an occasion note (free text, short).

## Non-Goals
- Automated food pairing recommendations based on what the user is cooking (out of scope).
- Occasion-specific match scoring changes (that's spec 027 context-aware scoring).
- Pairing history as a separate browsable list.

## Behavior

### Occasion tagging on scan
In `ScanPromptScreen`, after the existing scan-type selection (wine list / shelf / bottle), add an optional occasion note field:

```
What's the occasion?  (optional)
[ Restaurant dinner ]  [ Cooking at home ]  [ Wine shop find ]
[ Special occasion  ]  [ Just exploring   ]
```

Five quick-select chips. Selecting one sets `occasion` on the scan metadata. Not required — user can tap "Skip" or proceed without selecting. The existing "Continue →" button is not gated on this.

Persist `occasion TEXT` on the `scans` table (new nullable column via migration).

### Pattern detection hook
`useOccasionPatterns()` in `src/ui/hooks/useOccasionPatterns.js`.

Queries `scans` (with occasion + scan_type) joined to `scan_wines` (top-rated/ordered wines). Returns `patterns: string[]` — plain-language sentences.

Pattern rules (minimum data thresholds in parentheses):

| Pattern | Threshold | Example sentence |
|---|---|---|
| Dominant occasion | ≥3 scans same occasion | "Most of your scans are from restaurant dinners — you're a table-first wine person." |
| Style by occasion split | ≥2 scans each of 2 occasions | "At restaurants you tend toward reds. When scanning shelves, you gravitate toward whites." |
| Pairing affinity | ≥5 saved wines with a shared pairing tag | "Wines you save most often pair with red meat and cheese — rich, structured bottles." |
| Exploration velocity | ≥3 new grapes in last 30 days | "You've tried 3 new grapes this month. Your wine world is actively expanding." |
| Evening / occasion cadence | ≥2 "special occasion" tags | "You've used Uncork for special occasions twice — you trust it when it matters." |

No pattern fires if its threshold isn't met. Maximum 3 patterns shown at once (pick the 3 with strongest data support).

### Rendering in ProfileScreen
New subsection in the **Tonight** tab, above the existing tonight-mode content. Heading: `YOUR PATTERNS`.

Renders as a vertical stack of up to 3 pattern sentences, each in a soft card:
- T.ink50 background, T.ink150 border, 12px borderRadius, padding 12px 14px.
- Sentence: T.fontBody 14px T.ink700, line-height 1.5.
- No icons or embellishments — just clean readable text.

If no patterns meet their thresholds: section omitted entirely (no empty state card).

### Occasion chip in HistoryScreen
Each scan row in HistoryScreen shows the `occasion` tag if set — a small chip beside the scan label (same style as existing place chip). Tapping the chip does nothing in v1 (display only).

## Edge Cases
- User never selects an occasion: patterns that require occasion data will never fire; patterns based on scan_type alone (shelf vs. restaurant) still work.
- All scans are the same scan_type ("shelf"): the style-by-occasion-split pattern doesn't fire.
- User deletes their ratings: pattern data becomes stale — hook re-fetches on ProfileScreen mount, patterns disappear if thresholds are no longer met.
- `occasion` column migration: existing scans get `NULL` for occasion; no backfill.

## Acceptance Criteria
- The ScanPromptScreen shows the occasion chips below the scan-type selector.
- Selecting an occasion chip and completing a scan saves the occasion to `scans.occasion`.
- A user with 3+ restaurant scans sees the "restaurant dinner" dominant occasion sentence in the Tonight tab.
- A user with no occasion data set and fewer than 5 scans sees no "Your Patterns" section.
- The occasion chip renders in HistoryScreen on scan rows that have one set.
- "Skip" or proceeding without selecting an occasion does not block or delay the scan flow.

## Files
- `supabase/migrations/014_scan_occasion.sql` — add `occasion TEXT` to `scans`
- `src/ui/screens/ScanPromptScreen.jsx` — add occasion chip selector (optional, skippable)
- `src/ui/hooks/useOccasionPatterns.js` — new hook, pattern detection
- `src/ui/screens/ProfileScreen.jsx` — Tonight tab: add "Your Patterns" section
- `src/ui/screens/HistoryScreen.jsx` — show occasion chip on scan rows
- `src/ui/hooks/useScanHistory.js` — include `occasion` in scan data returned
