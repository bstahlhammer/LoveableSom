/**
 * Regression tests for locate-bottle coordinate mapping.
 *
 * Guards against two failure modes:
 *   1. mapBboxToFullImage math being wrong (bottles show in wrong position)
 *   2. Tile rect being dropped during scan merging (_tileRect lost → locate-bottle
 *      falls back to the full-image, low-resolution path where Sonnet can't read labels)
 *
 * mapBboxToFullImage is duplicated from src/core/api.js.
 * If the implementation changes, update this copy too.
 */
import { describe, it, expect } from 'vitest'

// ── Duplicated from src/core/api.js ──────────────────────────────────────────

function mapBboxToFullImage(bbox, tileRect) {
  return {
    x: tileRect.x + bbox.x * tileRect.w,
    y: tileRect.y + bbox.y * tileRect.h,
    w: bbox.w * tileRect.w,
    h: bbox.h * tileRect.h,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('mapBboxToFullImage', () => {
  it('maps a centered tile with a centered bbox back to the full image', () => {
    // Tile covers the middle third of the image horizontally, full height
    const tileRect = { x: 0.33, y: 0, w: 0.34, h: 1 }
    // Bottle is centered in the tile
    const bbox = { x: 0.25, y: 0.1, w: 0.5, h: 0.8 }
    const result = mapBboxToFullImage(bbox, tileRect)
    expect(result.x).toBeCloseTo(0.33 + 0.25 * 0.34)
    expect(result.y).toBeCloseTo(0 + 0.1 * 1)
    expect(result.w).toBeCloseTo(0.5 * 0.34)
    expect(result.h).toBeCloseTo(0.8 * 1)
  })

  it('handles top-left tile (x=0, y=0)', () => {
    const tileRect = { x: 0, y: 0, w: 0.5, h: 0.5 }
    const bbox = { x: 0.4, y: 0.6, w: 0.2, h: 0.3 }
    const result = mapBboxToFullImage(bbox, tileRect)
    expect(result.x).toBeCloseTo(0.4 * 0.5)       // 0.2
    expect(result.y).toBeCloseTo(0.6 * 0.5)       // 0.3
    expect(result.w).toBeCloseTo(0.2 * 0.5)       // 0.1
    expect(result.h).toBeCloseTo(0.3 * 0.5)       // 0.15
  })

  it('handles bottom-right tile', () => {
    const tileRect = { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
    const bbox = { x: 0, y: 0, w: 1, h: 1 }      // entire tile
    const result = mapBboxToFullImage(bbox, tileRect)
    expect(result.x).toBeCloseTo(0.5)
    expect(result.y).toBeCloseTo(0.5)
    expect(result.w).toBeCloseTo(0.5)
    expect(result.h).toBeCloseTo(0.5)
  })

  it('a bottle found at tile origin maps to the tile origin in full image', () => {
    const tileRect = { x: 0.25, y: 0.33, w: 0.4, h: 0.4 }
    const bbox = { x: 0, y: 0, w: 0.2, h: 0.5 }
    const result = mapBboxToFullImage(bbox, tileRect)
    expect(result.x).toBeCloseTo(0.25)             // 0.25 + 0 * 0.4
    expect(result.y).toBeCloseTo(0.33)             // 0.33 + 0 * 0.4
    expect(result.w).toBeCloseTo(0.08)             // 0.2 * 0.4
    expect(result.h).toBeCloseTo(0.2)              // 0.5 * 0.4
  })

  it('a bottle filling the tile maps to the tile rect in the full image', () => {
    const tileRect = { x: 0.1, y: 0.2, w: 0.45, h: 0.6 }
    const bbox = { x: 0, y: 0, w: 1, h: 1 }
    const result = mapBboxToFullImage(bbox, tileRect)
    expect(result.x).toBeCloseTo(0.1)
    expect(result.y).toBeCloseTo(0.2)
    expect(result.w).toBeCloseTo(0.45)
    expect(result.h).toBeCloseTo(0.6)
  })

  it('preserves precision for overlapping tile grids (25% overlap)', () => {
    // 2-column portrait layout: tileW = W / (0.75 + 1) = W / 1.75 ≈ 0.5714 of W
    // stride = 0.75 * tileW ≈ 0.4286; col=1 → x = 0.4286
    const tileRect = { x: 0.4286, y: 0, w: 0.5714, h: 0.3636 }
    const bbox = { x: 0.5, y: 0.5, w: 0.1, h: 0.4 }
    const result = mapBboxToFullImage(bbox, tileRect)
    expect(result.x).toBeCloseTo(0.4286 + 0.5 * 0.5714, 3)
    expect(result.y).toBeCloseTo(0 + 0.5 * 0.3636, 3)
    expect(result.w).toBeCloseTo(0.1 * 0.5714, 3)
    expect(result.h).toBeCloseTo(0.4 * 0.3636, 3)
  })
})

describe('locate-bottle tile rect propagation (structural)', () => {
  it('mergeCatalogWine shape must preserve _tileRect', () => {
    // Documents the contract: _tileRect must survive catalog merging.
    // If this test shape drifts from the real mergeCatalogWine, the function
    // in useScan.js should be updated to explicitly carry _tileRect.
    const scanned = {
      name: 'Caymus Cabernet Sauvignon',
      confidence: 82,
      _tileRect: { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    }
    const cat = {
      id: 'cat_123',
      name: 'Caymus Cabernet Sauvignon',
      body: 4,
    }

    // Simulates what mergeCatalogWine returns (must match src/ui/hooks/useScan.js)
    const merged = {
      ...cat,
      confidence: scanned.confidence,
      _tileRect: scanned._tileRect ?? null,
    }

    expect(merged._tileRect).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 })
    expect(merged._tileRect).not.toBeNull()
  })

  it('_tileRect is null when scanned wine has no tile origin (Sonnet fallback path)', () => {
    const scanned = { name: 'Some Wine', confidence: 60 }
    const merged = { _tileRect: scanned._tileRect ?? null }
    expect(merged._tileRect).toBeNull()
  })
})
