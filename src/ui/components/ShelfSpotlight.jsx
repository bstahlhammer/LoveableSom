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
import { theme } from '../theme/theme.js'

export default function ShelfSpotlight({ photoUrl, bbox, loading, error, onRetry, label }) {
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
