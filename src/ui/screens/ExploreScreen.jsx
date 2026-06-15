import { useState } from 'react'
import T from '../theme/T.js'
import wineStyles, { styleMatchBadge } from '@/core/data/wineStyles.js'
import BottomNav from '../components/BottomNav.jsx'

// ── StyleCard grid item ───────────────────────────────────────────────────────
function StyleCard({ style, badge, onTap }) {
  return (
    <button
      onClick={() => onTap(style)}
      style={{
        position: 'relative',
        background: style.bg,
        border: 'none',
        borderRadius: 16,
        padding: '18px 14px 14px',
        textAlign: 'left',
        cursor: 'pointer',
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
      }}
    >
      <div style={{ fontFamily: T.fontDisplay, fontSize: 17, fontWeight: 500, color: style.headingColor, lineHeight: 1.15, marginBottom: 4 }}>
        {style.name}
      </div>
      <div style={{ fontFamily: T.fontBody, fontSize: 10.5, color: style.headingColor, opacity: 0.65, lineHeight: 1.35 }}>
        {style.descriptor}
      </div>
      {badge && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 9999, fontFamily: T.fontBody,
          background: badge === 'fit' ? T.forest500 : T.ochre500,
          color: 'white',
        }}>
          {badge === 'fit' ? 'Great fit' : 'Stretch'}
        </div>
      )}
    </button>
  )
}

// ── Bottle card in StyleDetailScreen ─────────────────────────────────────────
function BottleCard({ bottle }) {
  const href = `https://www.wine-searcher.com/find/${encodeURIComponent(bottle.searchQuery)}`
  return (
    <div style={{
      background: 'white', border: `1px solid ${T.ink150}`,
      borderRadius: 14, padding: '13px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 15, color: T.ink900, lineHeight: 1.2, marginBottom: 2 }}>
          {bottle.name}
        </div>
        <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400, marginBottom: 2 }}>
          {bottle.producer} · {bottle.region}
        </div>
        <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink500, fontStyle: 'italic' }}>
          {bottle.grape}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.forest700, fontFamily: T.fontBody,
          background: T.forest100, padding: '3px 9px', borderRadius: 9999, marginBottom: 6,
        }}>
          {bottle.priceRange}
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: 11, fontWeight: 600, color: T.cobalt500,
            fontFamily: T.fontBody, textDecoration: 'none',
            background: T.cobalt50, padding: '3px 9px', borderRadius: 9999,
            display: 'inline-block',
          }}
        >
          Find it →
        </a>
      </div>
    </div>
  )
}

// ── StyleDetailScreen (sub-view) ──────────────────────────────────────────────
function StyleDetailScreen({ style, badge, onBack }) {
  const searchUrl = `https://www.wine-searcher.com/find/${encodeURIComponent(style.searchQuery)}`
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.ink0 }}>
      {/* Hero */}
      <div style={{
        background: style.bg,
        padding: '52px 22px 22px',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: 'none',
            color: style.headingColor, opacity: 0.7,
            fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1,
            marginBottom: 16, display: 'block',
          }}
        >
          ←
        </button>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 30, fontWeight: 500, color: style.headingColor, lineHeight: 1.1, marginBottom: 6 }}>
          {style.name}
        </div>
        <div style={{ fontFamily: T.fontBody, fontSize: 12, color: style.headingColor, opacity: 0.65 }}>
          {style.descriptor}
        </div>
        {badge && (
          <div style={{
            marginTop: 12,
            display: 'inline-block',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '4px 12px', borderRadius: 9999, fontFamily: T.fontBody,
            background: badge === 'fit' ? T.forest500 : T.ochre500,
            color: 'white',
          }}>
            {badge === 'fit' ? '✓ Great fit for your palate' : '↑ A stretch for your palate'}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>
        {/* Description */}
        <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.ink700, lineHeight: 1.65, margin: '0 0 24px' }}>
          {style.description}
        </p>

        {/* What to look for */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink400, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.fontBody, marginBottom: 10 }}>
            What to look for on a label
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {style.whatToLook.map((kw, i) => (
              <span key={i} style={{
                fontFamily: T.fontBody, fontSize: 12, fontWeight: 500,
                padding: '5px 12px', borderRadius: 9999,
                background: T.ink50, color: T.ink700,
                border: `1px solid ${T.ink150}`,
              }}>
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Example bottles */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink400, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.fontBody, marginBottom: 10 }}>
            Example bottles
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {style.bottles.map((b, i) => <BottleCard key={i} bottle={b} />)}
          </div>
        </div>

        {/* Search all link */}
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%', padding: '14px',
            background: `linear-gradient(135deg, ${T.cobalt500} 0%, ${T.cobalt700} 100%)`,
            color: 'white', border: 'none', borderRadius: 9999,
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          Search all wines like this →
        </a>
      </div>
    </div>
  )
}

// ── ExploreScreen (grid + sub-view) ──────────────────────────────────────────
export default function ExploreScreen({ navigate, goBack, tasteProfile }) {
  const [selected, setSelected] = useState(null)

  if (selected) {
    const badge = styleMatchBadge(selected, tasteProfile)
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <StyleDetailScreen style={selected} badge={badge} onBack={() => setSelected(null)} />
        <BottomNav activeTab="explore" navigate={navigate} tasteProfile={tasteProfile} />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.ink0, position: 'relative', overflow: 'hidden' }}>
      {/* Watercolor washes */}
      <div style={{ position: 'absolute', top: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: T.forest300, opacity: 0.06, filter: 'blur(56px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 40, right: -40, width: 180, height: 180, borderRadius: '50%', background: T.cobalt300, opacity: 0.05, filter: 'blur(44px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <div style={{ padding: '52px 22px 16px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1, marginBottom: 12, display: 'block' }}>←</button>
        <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 30, color: T.ink900, margin: '0 0 6px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
          Explore the wine world
        </h1>
        <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.ink400, margin: 0, lineHeight: 1.45 }}>
          {tasteProfile
            ? '12 styles. Badges show how each fits your palate.'
            : '12 styles to try. Pick one and go deep.'}
        </p>
      </div>

      {/* 2-column grid */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}>
          {wineStyles.map(style => (
            <StyleCard
              key={style.id}
              style={style}
              badge={styleMatchBadge(style, tasteProfile)}
              onTap={setSelected}
            />
          ))}
        </div>
      </div>

      <BottomNav activeTab="explore" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}
