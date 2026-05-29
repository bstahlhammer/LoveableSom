import { useState, useEffect } from 'react'
import { theme } from '../theme/theme.js'
import MatchScore from './MatchScore.jsx'
import TwoSignalBars from './TwoSignalBars.jsx'
import { explainMatch, computeMatchWithConfidence } from '@/core/api'
import { getConfidenceLevel } from '@/core/engine/matchEngine.js'

const LABEL_STRIPE = {
  red:       '#5C7A52',
  white:     '#C4973A',
  rosé:      '#D4726A',
  rose:      '#D4726A',
  sparkling: '#3A7A8A',
  dessert:   '#C4973A',
}

function BottleThumbnail({ wine }) {
  const initial = wine.imageUrl || wine.label_image || wine.image || null
  const [imageUrl, setImageUrl] = useState(initial)
  const [imgFailed, setImgFailed] = useState(false)
  const stripe = LABEL_STRIPE[wine.color] ?? LABEL_STRIPE.red

  useEffect(() => {
    if (imageUrl || !wine._catalogId) return
    let cancelled = false
    fetch(`/api/wine-image?name=${encodeURIComponent(wine.name)}&catalog_id=${wine._catalogId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data?.imageUrl) setImageUrl(data.imageUrl) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [wine._catalogId, wine.name, imageUrl])

  const placeholder = (
    <div style={{
      width: 56, height: 88, borderRadius: 6, flexShrink: 0,
      background: '#FAFAF8',
      border: `1px solid #E0DDD6`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      <div style={{ height: 3, background: stripe, flexShrink: 0 }} />
    </div>
  )

  if (!imageUrl || imgFailed) return placeholder

  return (
    <div style={{
      width: 56, height: 88, borderRadius: 6, flexShrink: 0,
      overflow: 'hidden',
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.surfaceAlt,
    }}>
      <img
        src={imageUrl}
        alt={wine.name}
        onError={() => setImgFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        loading="lazy"
      />
    </div>
  )
}

export default function WineCard({ wine, personalized, isBestMatch, tasteProfile, onTap, onSave, saved }) {
  const { score: matchScore, isLow: matchIsLow, reason: matchReason } = personalized && tasteProfile
    ? computeMatchWithConfidence(wine, tasteProfile)
    : { score: wine.computedMatch ?? wine.match ?? 50, isLow: false, reason: null }
  const matchExplanation = personalized && tasteProfile ? explainMatch(wine, tasteProfile) : null
  const wePoints = wine.rating ?? null
  const confidenceLevel = personalized ? getConfidenceLevel(matchScore, wePoints) : null

  const priceStr = wine.price && wine.price !== ',' && String(wine.price).trim() !== ''
    ? (String(wine.price).startsWith('$') ? wine.price : `$${wine.price}`)
    : null
  const meta = [wine.vintage, wine.region, wine.grape]
    .filter(v => v && String(v).trim() !== '')
    .join(' · ')

  const highlight = personalized ? wine.why : wine.tasting

  return (
    <button
      onClick={() => onTap?.(wine)}
      style={{
        width: '100%',
        backgroundColor: theme.colors.surface,
        border: isBestMatch
          ? `1px solid ${theme.colors.gold}`
          : `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: isBestMatch ? theme.shadows.brass : theme.shadows.card,
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.15s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadows.elevated }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = isBestMatch ? theme.shadows.brass : theme.shadows.card }}
    >
      {/* Main row: thumbnail + info + right controls */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        {/* Bottle thumbnail */}
        <BottleThumbnail wine={wine} />

        {/* Wine info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isBestMatch && (
            <div style={{ fontSize: 9, color: theme.colors.gold, fontFamily: theme.typography.fontSans, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 2 }}>
              ✦ Best Match
            </div>
          )}
          <div style={{
            fontSize: 15, fontWeight: 500, color: theme.colors.text,
            fontFamily: theme.typography.fontDisplay, lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {wine.name}
          </div>
          {meta && (
            <div style={{
              fontSize: 11, color: theme.colors.textMuted,
              fontFamily: theme.typography.fontSans, marginTop: 2,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {meta}
            </div>
          )}
          {highlight && (
            <div style={{
              fontSize: 11, color: theme.colors.textMuted,
              fontFamily: theme.typography.fontSans, marginTop: 3, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {highlight}
            </div>
          )}
        </div>

        {/* Right: save toggle + price + match score (anon only) */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {onSave && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); onSave(wine) }}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.stopPropagation(), onSave(wine))}
              aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'}
              style={{
                fontSize: 18, lineHeight: 1, cursor: 'pointer', userSelect: 'none',
                color: saved ? theme.colors.magenta : theme.colors.dotEmpty,
                transition: 'color 150ms',
              }}
            >
              {saved ? '♥' : '♡'}
            </span>
          )}
          {priceStr && (
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: theme.colors.text,
              fontFamily: theme.typography.fontSans,
            }}>
              {priceStr}
            </span>
          )}
          {!personalized && <MatchScore score={matchScore} explanation={matchExplanation} compact lowConfidence={matchIsLow} reason={matchReason} />}
        </div>
      </div>

      {/* Two-signal bars — personalized view only */}
      {personalized && (
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${theme.colors.border}` }}>
          <TwoSignalBars tasteFit={matchScore} wePoints={wePoints} confidenceLevel={confidenceLevel} />
        </div>
      )}
    </button>
  )
}
