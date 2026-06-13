# Spec 019 — Wine Name Normalization Fix

## Problem
`normalizeWineName` in `useScan.js` strips all non-ASCII characters and truncates to 20 chars before deduplication and catalog lookup. This causes two classes of failure:

1. **Truncation collisions** — "Château Léoville-Barton" and "Château Léoville-Poyferré" both normalize to "chteau loville" (16 chars) and are treated as the same wine.
2. **Accent loss** — "Grüner Veltliner" becomes "gruner veltliner"; some catalog rows preserve the umlaut. The dedup key and the lookup name diverge.

## Goals
- Dedup keys accurately distinguish wines that differ only by suffix, accent, or punctuation.
- Names sent to `lookupWineCatalog` survive enough that `ilike` matches catalog rows.
- No regression on wines that already resolve correctly.

## Non-Goals
- Phonetic matching or spelling correction (that is Spec 021).
- Changes to the catalog schema.

## Behavior

### Normalization rules (new)
1. Unicode NFC normalize the input string.
2. NFD decompose and strip combining diacritical marks (U+0300–U+036F) — converts accented characters to their ASCII base (`é→e`, `ü→u`, `ñ→n`, etc.).
3. Lowercase.
4. Replace hyphens and en-dashes with a space.
5. Strip any remaining non-alphanumeric non-space characters.
6. Collapse multiple spaces to one and trim.
7. Truncate to **40 characters** (was 20).

### Where it applies
- `normalizeWineName(name)` in `useScan.js` — used for both dedup keys and `catalogCache` keys.
- The name passed into `lookupWineCatalog` is the **raw** OCR name (unchanged) — catalog lookup already does its own normalization via `ilike`. Do not pre-process it.

## Edge Cases
- Null / undefined input: return `''` (no change from current behavior).
- Names shorter than 40 chars: unaffected by truncation change.
- "Louis M. Martini Cabernet" and "Louis Martini Cabernet" still share the same 40-char prefix — this is a known limitation acceptable until Spec 021 (fuzzy lookup) is in place.

## Acceptance Criteria
- `normalizeWineName("Château Léoville-Barton")` → `"chateau leoville barton"` (hyphen → space, accents stripped).
- `normalizeWineName("Château Léoville-Poyferré")` → `"chateau leoville poyferre"` — different key from the above.
- `normalizeWineName("Grüner Veltliner Reserve 2019")` → `"gruner veltliner reserve 2019"`.
- Existing passing dedup tests continue to pass.
- No change to the name string sent to `lookupWineCatalog`.

## Files to Change
- `src/ui/hooks/useScan.js` — `normalizeWineName` function only (lines 381–388).
