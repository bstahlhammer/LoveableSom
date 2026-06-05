# Spec 013 — Scan Resilience & Visual Label Recognition

## Problem

The scan pipeline returns "I could not identify any wines" for wide-angle shelf photos that previously produced results. Root cause: commit `0731de2` added two prompt rules incompatible with wide-angle shelf photography:

1. **CRITICAL RULE FOR SHELF PHOTOS** — only report wines where you can read the physical bottle label directly; skip shelf tags entirely.
2. **Producer name requirement** — skip any wine entry without a legible producer/winery name on the bottle.

For wide-angle shots where labels are small, Haiku strictly enforces both rules and returns `{"wines":[]}` for every tile. The aggregator sees zero wines and throws the user-visible error. There is no fallback.

The fundamental error in those rules: they treat the model as a pure OCR engine. Claude's vision model can **recognize wine labels visually** — by logo, label artwork, colors, typography, and label design — even when individual letters are too small to read. This capability must be explicitly enabled, not suppressed.

## Goals

1. Reliably identify wines from wide-angle shelf photos where bottle labels are not individually legible character-by-character.
2. Enable visual label recognition (logo, artwork, label design, colors) as a first-class identification method alongside text OCR.
3. Add a Sonnet fallback so the scan never hard-fails on a valid shelf photo.
4. Increase per-tile token budget to handle dense shelves without silent truncation.

## Non-Goals

- No change to `splitImageIntoTiles` (6-tile 2×3/3×2 with 25% overlap — keep as-is).
- No change to `makeStreamingWineParser` — keep as-is.
- No change to deduplication, catalog lookup, or AI enrichment pipeline — keep as-is.
- No change to `isGenericVarietalName` filter — keep as-is.
- No new UI screens or components.
- No Supabase schema changes.

## Technical Changes

### 1. `src/routes/api/scan.ts` — Rewrite PROMPT, bump max_tokens, add enhanced mode

**Prompt rewrite**: Replace the entire PROMPT constant. The new prompt:
- Leads with three identification methods: (1) read label text, (2) visually recognize label design, (3) read shelf-edge tags.
- Names real wine label visual anchors (Caymus copper label, 19 Crimes mugshot portraits, Silver Oak woodcut art, The Prisoner Goya figure, Whispering Angel blush bottle) to activate the model's visual knowledge.
- Assigns graduated confidence tiers: 80–100 = text clearly read; 50–79 = visually recognized; 20–49 = shelf tag only.
- Replaces hard "must read text" / "must have producer name" requirements with explicit anti-hallucination guards only.
- Keeps all existing output fields unchanged.

**max_tokens**: 1024 → 2048. At ~110 tokens/wine, 1024 caps at ~9 wines per tile. Dense shelf tiles have 15+ wines; truncation silently drops the tail before catalog lookup runs.

**Enhanced mode**: Accept `enhanced?: boolean` in request body. When `true`, use `claude-sonnet-4-6` with `max_tokens: 4096`. Normal tiles use `claude-haiku-4-5-20251001` with `max_tokens: 2048`.

### 2. `src/ui/hooks/useScan.js` — Sonnet fallback + enhanced param

**`scanTile()`**: Add `enhanced = false` parameter, pass `enhanced: true` in the fetch body when set.

**After tile aggregation**: If all tiles return zero wines and `photoBase64` is available, make one call to `/api/scan` with `enhanced: true` using the full resized image (`photoBase64`, already in scope from `resizeForSpotlight(img)`). Show progress message "Taking a closer look…". If Sonnet finds wines, push them into `allWines` and continue the normal pipeline. If Sonnet also returns nothing, the original error message fires.

## User-Facing Behavior

- **Most shelf photos**: Haiku tiles identify wines normally. "N wines identified" counter increments during streaming as before. No visible change to the happy path.
- **Zero-result scans** (fallback triggered): After tile completion, status shows "Taking a closer look…" for 5–15 seconds while Sonnet analyzes the full image. If wines found, they flow into the normal catalog + enrichment pipeline.
- **Genuinely unidentifiable photo** (not a wine shelf): Both Haiku tiles and Sonnet fallback return nothing; original error message appears.

## Acceptance Criteria

- [ ] Wide-angle shelf photo (labels small, 6–10 ft away) returns ≥ 5 wines without triggering Sonnet fallback.
- [ ] Dense shelf photo (50+ bottles) returns ≥ 10 wines.
- [ ] Wine menu / list photo continues to identify wines; `scanType = "list"`.
- [ ] Sonnet fallback fires only when all Haiku tiles return zero wines.
- [ ] "Taking a closer look…" message appears during Sonnet fallback.
- [ ] Non-wine photo (landscape, food) shows error message after both Haiku and Sonnet return nothing.
- [ ] No regression on single-bottle close-up photos.
- [ ] No tile JSON response is truncated on a shelf with 15–18 wines visible.
- [ ] Happy path (currently-working scans) runs identical code path as before this change.
