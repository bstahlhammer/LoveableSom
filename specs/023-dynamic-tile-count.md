# Spec 023 — Dynamic Tile Count

## Problem
The scan pipeline always cuts every image into exactly 6 tiles (2×3 portrait / 3×2 landscape) regardless of what the image actually contains. This creates two failure modes:

1. **Single-bottle close-up** — 5 of 6 tiles contain empty background or partial cork. The model wastes 5 API calls and sometimes returns duplicates or garbage from the empty tiles.
2. **Dense wine list or wide shelf photo** — a 3-column restaurant wine list may not fit cleanly into 2 columns, causing the right column's labels to be split across tile boundaries even with 25% overlap.

## Goals
- Use fewer tiles (and fewer API calls) for simple single-bottle photos.
- Use more tiles for panoramic shelf photos or multi-column wine lists.
- Keep the 25% overlap rule for any layout that uses more than one tile.

## Non-Goals
- Image quality analysis (blur, lighting) — that is already handled by the `retakeReasons` path.
- Changing the Haiku→Sonnet fallback logic.
- Tile size capping (currently MAX_TILE_EDGE = 1500px — keep as-is).

## Behavior

### Layout selection rules

Determine layout before splitting, using aspect ratio and a lightweight content-density heuristic:

| Condition | Layout | Tiles |
|---|---|---|
| Aspect ratio ≥ 2.5 (very wide panorama) | 4×1 wide strip | 4 |
| Aspect ratio ≥ 1.8 (wide shelf) | 3×2 landscape | 6 (current) |
| Aspect ratio 0.55–1.8 (near-square or normal portrait) | 2×3 portrait | 6 (current) |
| Aspect ratio < 0.55 (very tall narrow photo) | 1×4 strip | 4 |
| Short edge < 600px (small/thumbnail image) | 1×1 (full image only) | 1 |

The aspect ratio is `width / height`. These thresholds are named constants.

### Single-tile fast path
When the chosen layout is 1×1, skip tiling entirely — pass the resized full image as a single tile. `normRect` is `{ x: 0, y: 0, w: 1, h: 1 }`. This eliminates 5 unnecessary API calls for close-up scans.

### 4-tile strip
For very wide or very tall images, use a 1×4 or 4×1 grid with 25% overlap (same overlap math as the 2×3 layout, just with COLS=4/ROWS=1 or COLS=1/ROWS=4).

### Unchanged behavior
- Overlap math: 25% between adjacent tiles.
- MAX_TILE_EDGE cap: 1500px per tile edge.
- JPEG quality: 0.82.
- The Sonnet fallback still uses the full resized image (`photoBase64`) regardless of tile count.

## Edge Cases
- Landscape image exactly at 1.8 aspect ratio boundary: use 6-tile layout (round up to the denser option when on a boundary).
- Image where short edge < 600px but aspect ratio suggests a wide shelf: the small-image rule takes priority (single tile); a small image won't benefit from more tiles.
- Existing callers that depend on `tileResults.length === 6`: none — results are processed by `Promise.allSettled` which handles any count.

## Acceptance Criteria
- A 4000×3000 portrait shelf photo (aspect 1.33) produces 6 tiles — same as today.
- A 4000×800 wide panorama (aspect 5.0) produces 4 tiles.
- A 1200×3000 very tall narrow photo (aspect 0.40) produces 4 tiles (vertical strip).
- A 800×600 small image (short edge 600px) produces 1 tile.
- A single-bottle close-up at 1600×2000 (short edge 1600px, portrait) produces 6 tiles (normal path — not small image).
- Scan results for all layouts are structurally identical to current output (same fields, same dedup, same enrichment).

## Files to Change
- `src/ui/hooks/useScan.js` — replace hardcoded `COLS`/`ROWS` constants in `splitImageIntoTiles` with a layout-selection function; add the 1×1 fast path.
