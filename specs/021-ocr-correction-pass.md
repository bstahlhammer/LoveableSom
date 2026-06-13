# Spec 021 — OCR Name Correction Pass

## Problem
The vision model occasionally returns names with character substitutions, dropped articles, or ligature breakdowns that prevent catalog lookup from matching. Common patterns:
- `0` → `O` confusion ("Orin Swift" scanned as "0rin Swift")
- `l` → `I` or `1` confusion ("Stag's Leap" → "Stag's 1eap")
- Dropped "The" or "Le" at the start of a name
- Run-together words from labels with no spacing ("SilverOak" → should be "Silver Oak")
- Unicode ligatures ("ﬁ" → "fi")

These errors hit `lookupWineCatalog` before any correction, causing exact and FTS to miss even when the catalog row exists.

## Goals
- Apply deterministic, low-risk corrections before the first catalog lookup attempt.
- Do not mutate the scanned name stored on the wine object — only the name used for lookup.
- Cover the 10 most common OCR patterns without introducing a false-correction risk.

## Non-Goals
- Spell-check or AI-based correction (introduces latency and new failure modes).
- Correcting producer names that are genuinely spelled unusually (e.g., "daou" is correct).
- Changes to catalog data.

## Behavior

### `correctOcrName(name: string): string`
A pure function that applies a fixed set of transformations in order:

1. **Unicode normalization** — replace common ligatures: `ﬁ→fi`, `ﬂ→fl`, `ﬀ→ff`, `ﬃ→ffi`, `ﬄ→ffl`.
2. **Digit-for-letter fixes** — apply only at word boundaries or when surrounded by letters:
   - `0` → `O` when adjacent to letters (regex: `/(?<=[a-zA-Z])0|0(?=[a-zA-Z])/g`)
   - `1` → `l` when between letters (regex: `/(?<=[a-zA-Z])1(?=[a-zA-Z])/g`)
3. **Run-together camelCase split** — insert space before uppercase letters that follow a lowercase letter and are not preceded by a space: `SilverOak → Silver Oak`.
4. **Strip leading noise** — remove leading digits, hyphens, or bullet characters that OCR sometimes prepends from shelf number labels.
5. Return the result trimmed.

### Where it runs
In `lookupWineCatalog` in `api.js`, before the exact `ilike` attempt:

```js
const correctedName = correctOcrName(name)
// use correctedName for all three lookup passes (exact, FTS, fuzzy)
// wine.name on the result object still comes from the catalog row, not correctedName
```

The original `name` argument is preserved for error logging.

### What it does NOT change
- The wine's `.name` property as returned to the UI — always sourced from the catalog row.
- The `normalizeWineName` dedup key — that operates on the raw OCR name and is separate.

## Edge Cases
- Legitimate wine names with digits (e.g., "19 Crimes", "14 Hands") — digit-for-letter rules only fire when the digit is surrounded by letters, so "19 Crimes" is unaffected.
- All-caps names ("DAOU") — camelCase split does not fire on all-caps sequences.
- Already-correct names — all transformations are no-ops on clean input; no regression risk.
- Empty or whitespace-only input: return the input unchanged.

## Acceptance Criteria
- `correctOcrName("0rin Swift")` → `"Orin Swift"`
- `correctOcrName("Stag's 1eap")` → `"Stag's leap"` (1 between letters)
- `correctOcrName("SilverOak")` → `"Silver Oak"`
- `correctOcrName("ﬁne Wine")` → `"fine Wine"`
- `correctOcrName("19 Crimes")` → `"19 Crimes"` (no change — digits not between letters)
- `correctOcrName("14 Hands")` → `"14 Hands"` (no change)
- `correctOcrName("DAOU")` → `"DAOU"` (no change — all-caps)
- After the correction pass, `lookupWineCatalog("0rin Swift")` returns the Orin Swift catalog row.

## Files to Change
- `src/core/api.js` — add `correctOcrName` function; call it at the top of `lookupWineCatalog` before the first query.
