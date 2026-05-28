import { useMemo } from 'react'
import T from '../theme/T.js'
import { getWines, sortWines, computeMatch, computeMatchWithConfidence } from '@/core/api'

function palateDescriptor(axis, value) {
  if (axis === 'body') {
    if (value >= 75) return 'Full'
    if (value >= 50) return 'Medium'
    return 'Light'
  }
  if (axis === 'sweetness') {
    if (value >= 60) return 'Sweet'
    if (value >= 35) return 'Off-dry'
    if (value >= 15) return 'Dry'
    return 'Bone dry'
  }
  if (axis === 'tannin') {
    if (value >= 75) return 'High'
    if (value >= 45) return 'Medium'
    return 'Low'
  }
  if (axis === 'acidity') {
    if (value >= 65) return 'High'
    if (value >= 45) return 'Medium'
    return 'Low'
  }
  return ''
}

function PalateBar({ label, value, descriptor }) {
  const h = 6
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink500 }}>{label}</span>
        <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.forest500, fontWeight: 600 }}>{descriptor}</span>
      </div>
      <div style={{ position: 'relative', height: h, background: T.ink100, borderRadius: h / 2 }}>
        <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%, -50%)', width: h + 6, height: h + 6, borderRadius: '50%', background: T.forest500, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
      </div>
    </div>
  )
}

export default function ProfileRevealScreen({ navigate, goBack, tasteProfile, hasScanned = false, scannedWines, onWineSelect }) {
  if (!tasteProfile) return null

  const { palate } = tasteProfile

  const ranked = useMemo(() => {
    // When the user arrived from a scan, rank only the wines they actually scanned.
    // Falling back to the full catalog only when no scan data is available.
    if (hasScanned && scannedWines) {
      const raw = Array.isArray(scannedWines)
        ? scannedWines
        : Array.isArray(scannedWines?.wines) ? scannedWines.wines : []
      if (raw.length > 0) {
        const scored = raw.map(w => {
          const rawScore = w.computedMatch ?? computeMatch(w, tasteProfile)
          const { score: adjusted, isLow, reason } = computeMatchWithConfidence({ ...w, computedMatch: rawScore }, tasteProfile)
          return { ...w, computedMatch: rawScore, adjustedMatch: adjusted, matchIsLow: isLow, matchReason: reason }
        })
        return scored.sort((a, b) => (b.computedMatch ?? 0) - (a.computedMatch ?? 0))
      }
    }
    return sortWines(getWines(), 'match', tasteProfile)
  }, [tasteProfile, hasScanned, scannedWines])

  const topPick = ranked[0]
  const alsoGreat = ranked.slice(1, 4)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.ink0 }}>
      {/* top zone — dark panel */}
      <div style={{ background: T.dark, position: 'relative', overflow: 'hidden' }}>
        {/* watercolor washes on dark */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: -40, left: -30, width: 180, height: 180, borderRadius: '50%', background: T.forest500, opacity: 0.10, filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', bottom: -20, right: -20, width: 150, height: 150, borderRadius: '50%', background: T.cobalt500, opacity: 0.08, filter: 'blur(40px)' }} />
        </div>

        {/* top bar */}
        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.forest300, fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}>←</button>
          <button onClick={() => navigate('home')} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 13, cursor: 'pointer', padding: 4, fontFamily: T.fontBody }}>✕</button>
        </div>

        <div style={{ padding: '12px 24px 28px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 10, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.ochre500, marginBottom: 10 }}>
            Your Taste Identity
          </div>
          <h1 style={{
            fontFamily: T.fontDisplay, fontSize: 38, fontWeight: 500,
            color: T.ink100, lineHeight: 1.1, marginBottom: 10,
            letterSpacing: '-0.01em',
          }}>
            {tasteProfile.name}
          </h1>
          <p style={{
            fontSize: 14, color: T.ink300, fontFamily: T.fontBody,
            lineHeight: 1.7, maxWidth: 300, margin: '0 auto',
          }}>
            {tasteProfile.description}
          </p>
        </div>
      </div>

      {/* bottom zone — scrollable */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px', background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)` }}>
        {/* palate breakdown */}
        <div style={{ fontSize: 11, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.forest500, marginBottom: 14 }}>
          Your palate breakdown
        </div>

        <PalateBar label="Body"      value={palate.body}      descriptor={palateDescriptor('body',      palate.body)} />
        <PalateBar label="Sweetness" value={palate.sweetness} descriptor={palateDescriptor('sweetness', palate.sweetness)} />
        <PalateBar label="Tannin"    value={palate.tannin}    descriptor={palateDescriptor('tannin',    palate.tannin)} />
        <PalateBar label="Acidity"   value={palate.acidity}   descriptor={palateDescriptor('acidity',   palate.acidity)} />

        {/* you'll usually love */}
        <div style={{ fontSize: 11, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.forest500, marginTop: 20, marginBottom: 10 }}>
          You'll usually love
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tasteProfile.loves.map(g => (
            <span key={g} style={{
              padding: '6px 14px',
              background: T.forest100,
              border: `1px solid ${T.forest300}`,
              borderRadius: 100, fontSize: 13, color: T.forest700,
              fontFamily: T.fontBody,
            }}>
              {g}
            </span>
          ))}
        </div>

        {/* probably skip */}
        <div style={{ fontSize: 11, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.ink400, marginTop: 18, marginBottom: 10 }}>
          Probably skip
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tasteProfile.skips.map(g => (
            <span key={g} style={{
              padding: '6px 14px',
              background: T.ink100, borderRadius: 100,
              fontSize: 13, color: T.ink400,
              fontFamily: T.fontBody, opacity: 0.8,
            }}>
              {g}
            </span>
          ))}
        </div>

        {/* top pick + recommendations */}
        {topPick && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.forest500, marginBottom: 10 }}>
              {hasScanned ? 'Top pick from your scan' : 'Your best match right now'}
            </div>

            <TopPickCard wine={topPick} onTap={() => onWineSelect?.(topPick)} />

            {alsoGreat.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.ink400, marginTop: 18, marginBottom: 10 }}>
                  Also great for you
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alsoGreat.map(w => (
                    <RecRow key={w.id} wine={w} onTap={() => onWineSelect?.(w)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* CTAs */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => navigate('personalizedResults')} style={{
            width: '100%', padding: '16px',
            background: `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
            color: 'white', border: 'none', borderRadius: 100,
            fontSize: 15, fontWeight: 600, fontFamily: T.fontBody, cursor: 'pointer',
          }}>
            {hasScanned ? 'See all matches from your scan' : 'See all matching wines'}
          </button>
          {!hasScanned && (
            <button onClick={() => navigate('scanPrompt')} style={{
              background: 'none', border: 'none', color: T.ink400,
              fontSize: 14, fontFamily: T.fontBody, cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
              padding: '6px', textAlign: 'center',
            }}>
              Scan a wine list or shelf
            </button>
          )}
          <button onClick={() => navigate('rateBottles')} style={{
            background: 'none', border: 'none', color: T.ink400,
            fontSize: 13, fontFamily: T.fontBody, cursor: 'pointer',
            textDecoration: 'underline', textUnderlineOffset: 3,
            padding: '4px', textAlign: 'center',
          }}>
            Refine my profile — rate more bottles
          </button>
          {/* Buried intentionally: first-time users shouldn't be prompted to doubt their profile */}
          <button onClick={() => navigate('quizIntro')} style={{
            background: 'none', border: 'none',
            color: T.ink300, fontSize: 11, fontFamily: T.fontBody,
            cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
            padding: '4px', textAlign: 'center',
          }}>
            Doesn't sound like me — retake
          </button>
        </div>
      </div>
    </div>
  )
}

function TopPickCard({ wine, onTap }) {
  const score = wine.adjustedMatch ?? wine.computedMatch ?? wine.match ?? 0
  const isLow = wine.matchIsLow ?? false
  return (
    <button onClick={onTap} style={{
      width: '100%', textAlign: 'left',
      padding: '16px',
      background: `linear-gradient(160deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
      color: T.ink100, border: 'none', borderRadius: 16,
      cursor: 'pointer', boxShadow: T.shadowLg,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 22, color: 'white', lineHeight: 1.2 }}>
            {wine.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: T.fontBody, marginTop: 2 }}>
            {[wine.grape, wine.region, wine.vintage].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{
          flexShrink: 0, padding: '5px 11px',
          background: T.ochre500, color: T.forest700,
          borderRadius: 100, fontSize: 12, fontWeight: 700,
          fontFamily: T.fontBody, letterSpacing: '0.02em',
        }}>
          {isLow ? `~${score}%` : `${score}%`} match
        </div>
      </div>
      {wine.tasting && (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: T.fontBody, lineHeight: 1.5 }}>
          {wine.tasting}
        </p>
      )}
      {isLow && wine.matchReason && (
        <div style={{ fontSize: 9, color: T.ochre400, fontFamily: T.fontBody, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85 }}>
          ~ estimated · {wine.matchReason}
        </div>
      )}
      <div style={{ fontSize: 11, color: T.ochre400, fontFamily: T.fontBody, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {wine.price} · Tap for details →
      </div>
    </button>
  )
}

function RecRow({ wine, onTap }) {
  const score = wine.adjustedMatch ?? wine.computedMatch ?? wine.match ?? 0
  const isLow = wine.matchIsLow ?? false
  return (
    <button onClick={onTap} style={{
      width: '100%', textAlign: 'left', padding: '12px 14px',
      background: 'white', border: `1px solid ${T.ink150}`,
      borderRadius: 12, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: T.shadowMd,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.fontDisplay, fontSize: 17, color: T.ink900,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {wine.name}
        </div>
        <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody, marginTop: 1 }}>
          {[wine.grape, wine.price].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div style={{
        flexShrink: 0, padding: '4px 10px',
        background: T.forest100, color: T.forest700,
        border: `1px solid ${T.forest300}`,
        borderRadius: 100, fontSize: 12, fontWeight: 600,
        fontFamily: T.fontBody,
      }}>
        {isLow ? `~${score}%` : `${score}%`}
      </div>
    </button>
  )
}
