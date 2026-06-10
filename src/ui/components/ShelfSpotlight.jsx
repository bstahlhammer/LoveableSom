/**
 * ShelfSpotlight — given a scan photo URL and a normalized bbox,
 * renders the photo with a "spotlight cone" effect that draws the eye
 * to the requested bottle.
 *
 * - Outside the cone: black & white + heavy dim
 * - Inside the cone: full color, sharp, with a soft warm glow
 * - Edges of the cone: gentle radial fade so it feels like a flashlight
 *
 * If `loading` is true we show a "Pinpointing the bottle…" overlay.
 * If `bbox` is null we show the photo with a "Couldn't locate this bottle" hint.
 */
import { useState, useRef, useEffect } from 'react'
import { theme } from '../theme/theme.js'

export default function ShelfSpotlight({ photoUrl, bbox, loading, error, onRetry, label }) {
  const [expanded, setExpanded] = useState(false)

  if (!photoUrl) {
    return (
      <div style={emptyShell}>
        <span>No shelf photo for this scan.</span>
      </div>
    )
  }

  const hasBbox = bbox && bbox.w > 0 && bbox.h > 0
  // Center of the spotlight in % of container
  const cx = hasBbox ? (bbox.x + bbox.w / 2) * 100 : 50
  const cy = hasBbox ? (bbox.y + bbox.h / 2) * 100 : 50
  // Ellipse radii sized to the bbox itself (with padding) so the spotlight
  // hugs the bottle's tall, narrow shape instead of a generic circle.
  // 0.75 = bbox half-extent, +padding for breathing room.
  // Generous padding so the spotlight is clearly larger than the bottle.
  const padX = 24 // % of container width
  const padY = 18  // % of container height
  const rxInner = hasBbox ? bbox.w * 100 + padX : 0
  const ryInner = hasBbox ? bbox.h * 100 + padY : 0
  const rxOuter = rxInner + 20
  const ryOuter = ryInner + 16
  const innerShape = `ellipse ${rxInner}% ${ryInner}% at ${cx}% ${cy}%`
  const outerShape = `ellipse ${rxOuter}% ${ryOuter}% at ${cx}% ${cy}%`

  return (
    <>
      <div style={frame}>
        {/* Base layer: B&W + dimmed — renders at natural aspect ratio to size the container */}
        <img
          src={photoUrl}
          alt={label ? `Shelf where ${label} is located` : 'Shelf photo'}
          style={{
            ...imgBase,
            filter: 'grayscale(1) brightness(0.45) contrast(1.05)',
          }}
          draggable={false}
        />

        {/* Color layer: same image, masked to spotlight */}
        {hasBbox && !loading && (
          <img
            src={photoUrl}
            alt=""
            aria-hidden
            style={{
              ...imgFill,
              WebkitMaskImage: `radial-gradient(${outerShape}, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${(rxInner / rxOuter) * 100}%, rgba(0,0,0,0) 100%)`,
              maskImage: `radial-gradient(${outerShape}, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${(rxInner / rxOuter) * 100}%, rgba(0,0,0,0) 100%)`,
              filter: 'saturate(1.15) contrast(1.05)',
            }}
            draggable={false}
          />
        )}

        {/* Warm glow ring around the bottle */}
        {hasBbox && !loading && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(${outerShape}, ${theme.colors.emberBright}38 0%, ${theme.colors.ember}1f ${(rxInner / rxOuter) * 70}%, transparent 100%)`,
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Inflated bbox highlight — bigger than the raw bbox so the bottle
            isn't hugged too tight. Grows the box ~30% on each axis. */}
        {hasBbox && !loading && (() => {
          const grow = 1.0
          const gx = Math.max(0, bbox.x - bbox.w * grow / 2)
          const gy = Math.max(0, bbox.y - bbox.h * grow / 2)
          const gw = Math.min(1 - gx, bbox.w * (1 + grow))
          const gh = Math.min(1 - gy, bbox.h * (1 + grow))
          return (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: `${gx * 100}%`,
                top: `${gy * 100}%`,
                width: `${gw * 100}%`,
                height: `${gh * 100}%`,
                border: `2px solid ${theme.colors.emberBright}`,
                borderRadius: 6,
                boxShadow: `0 0 24px 4px ${theme.colors.ember}77`,
                pointerEvents: 'none',
              }}
            />
          )
        })()}

        {/* Expand button */}
        {!loading && (
          <button
            onClick={() => setExpanded(true)}
            aria-label="Expand photo"
            style={expandBtn}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" />
            </svg>
          </button>
        )}

        {/* Loading state */}
        {loading && (
          <div style={overlayCenter}>
            <div style={overlayPill}>
              <span style={pulseDot} />
              <span>Pinpointing the bottle…</span>
            </div>
          </div>
        )}

        {/* No-bbox state */}
        {!loading && !hasBbox && (
          <div style={overlayCenter}>
            <div style={{ ...overlayPill, background: `${theme.colors.brandDark}E6` }}>
              <span>{error ? 'Could not locate this bottle.' : 'No shelf location yet.'}</span>
              {onRetry && (
                <button onClick={onRetry} style={retryBtn}>
                  {error ? 'Retry' : 'Find on shelf'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <ExpandedModal
          photoUrl={photoUrl}
          bbox={hasBbox ? bbox : null}
          label={label}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  )
}

function ExpandedModal({ photoUrl, bbox, label, onClose }) {
  const hasBbox = bbox && bbox.w > 0 && bbox.h > 0
  const cx = hasBbox ? (bbox.x + bbox.w / 2) * 100 : 50
  const cy = hasBbox ? (bbox.y + bbox.h / 2) * 100 : 50
  const padX = 24, padY = 18
  const rxInner = hasBbox ? bbox.w * 100 + padX : 0
  const ryInner = hasBbox ? bbox.h * 100 + padY : 0
  const rxOuter = rxInner + 20
  const ryOuter = ryInner + 16
  const outerShape = `ellipse ${rxOuter}% ${ryOuter}% at ${cx}% ${cy}%`
  const maskStop = rxOuter > 0 ? (rxInner / rxOuter) * 100 : 0

  const [scale, setScale] = useState(hasBbox ? 2 : 1)
  const [originX, setOriginX] = useState(hasBbox ? cx : 50)
  const [originY, setOriginY] = useState(hasBbox ? cy : 50)
  const gestureRef = useRef({})
  const containerRef = useRef(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function pinchDist(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
  }
  function pinchMid(t1, t2) {
    const rect = containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 1, height: 1 }
    return {
      x: ((t1.clientX + t2.clientX) / 2 - rect.left) / rect.width * 100,
      y: ((t1.clientY + t2.clientY) / 2 - rect.top) / rect.height * 100,
    }
  }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault()
      const m = pinchMid(e.touches[0], e.touches[1])
      gestureRef.current = {
        startDist: pinchDist(e.touches[0], e.touches[1]),
        startScale: scale,
      }
      setOriginX(m.x)
      setOriginY(m.y)
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 2 && gestureRef.current.startDist) {
      e.preventDefault()
      const d = pinchDist(e.touches[0], e.touches[1])
      setScale(Math.min(6, Math.max(1, gestureRef.current.startScale * d / gestureRef.current.startDist)))
    }
  }

  function onTouchEnd() { gestureRef.current = {} }

  function onWheel(e) {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setOriginX((e.clientX - rect.left) / rect.width * 100)
      setOriginY((e.clientY - rect.top) / rect.height * 100)
    }
    setScale(s => Math.min(6, Math.max(1, s * (e.deltaY < 0 ? 1.15 : 0.87))))
  }

  const bboxRect = hasBbox ? (() => {
    const grow = 1.0
    const gx = Math.max(0, bbox.x - bbox.w * grow / 2)
    const gy = Math.max(0, bbox.y - bbox.h * grow / 2)
    const gw = Math.min(1 - gx, bbox.w * (1 + grow))
    const gh = Math.min(1 - gy, bbox.h * (1 + grow))
    return { gx, gy, gw, gh }
  })() : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', padding: '10px 12px', zIndex: 2 }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: 'none', color: '#fff', borderRadius: '50%',
            width: 36, height: 36, fontSize: 16, lineHeight: 1,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>

      {/* Photo zone */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden', position: 'relative', touchAction: 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            transformOrigin: `${originX}% ${originY}%`,
            transform: `scale(${scale})`,
          }}
        >
          {/* B&W base */}
          <img
            src={photoUrl}
            alt={label ? `Shelf where ${label} is located` : 'Shelf photo'}
            style={{ display: 'block', width: '100%', height: 'auto', filter: 'grayscale(1) brightness(0.45) contrast(1.05)', userSelect: 'none', pointerEvents: 'none' }}
            draggable={false}
          />
          {/* Color spotlight */}
          {hasBbox && (
            <img
              src={photoUrl}
              aria-hidden
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                WebkitMaskImage: `radial-gradient(${outerShape}, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${maskStop}%, rgba(0,0,0,0) 100%)`,
                maskImage: `radial-gradient(${outerShape}, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${maskStop}%, rgba(0,0,0,0) 100%)`,
                filter: 'saturate(1.15) contrast(1.05)',
                userSelect: 'none', pointerEvents: 'none',
              }}
              draggable={false}
            />
          )}
          {/* Bbox highlight */}
          {bboxRect && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: `${bboxRect.gx * 100}%`,
                top: `${bboxRect.gy * 100}%`,
                width: `${bboxRect.gw * 100}%`,
                height: `${bboxRect.gh * 100}%`,
                border: `2px solid ${theme.colors.emberBright}`,
                borderRadius: 6,
                boxShadow: `0 0 24px 4px ${theme.colors.ember}77`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* Hint */}
      <div style={{ flexShrink: 0, padding: '8px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontFamily: theme.typography.fontSans, fontSize: 11 }}>
        Pinch to zoom · tap ✕ to close
      </div>
    </div>
  )
}

const frame = {
  position: 'relative',
  width: '100%',
  overflow: 'hidden',
  borderRadius: theme.radius.md,
  background: '#000',
  border: `1px solid ${theme.colors.border}`,
}

// Base image sets the container height naturally so bbox % coords align exactly
const imgBase = {
  display: 'block',
  width: '100%',
  height: 'auto',
  userSelect: 'none',
}

const imgFill = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  userSelect: 'none',
}

const overlayCenter = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}

const overlayPill = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 16px',
  background: `${theme.colors.brandDark}D9`,
  color: theme.colors.cream,
  borderRadius: theme.radius.pill,
  fontFamily: theme.typography.fontSans,
  fontSize: 13,
  border: `1px solid ${theme.colors.ember}66`,
}

const pulseDot = {
  width: 8, height: 8,
  borderRadius: '50%',
  background: theme.colors.emberBright,
  boxShadow: `0 0 12px ${theme.colors.emberBright}`,
  animation: 'spotlightPulse 1.2s ease-in-out infinite',
}

const retryBtn = {
  marginLeft: 4,
  padding: '4px 10px',
  background: theme.colors.ember,
  color: theme.colors.cream,
  border: 'none',
  borderRadius: theme.radius.sm,
  fontFamily: theme.typography.fontSans,
  fontSize: 12,
  cursor: 'pointer',
}

const expandBtn = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 6,
  color: '#fff',
  cursor: 'pointer',
  padding: 0,
}

const emptyShell = {
  ...frame,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.colors.textMuted,
  fontFamily: theme.typography.fontSans,
  fontSize: 13,
  background: theme.colors.surfaceAlt,
}
