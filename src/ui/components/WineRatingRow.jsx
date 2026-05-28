import { useState } from 'react'
import { theme } from '../theme/theme.js'

const TASTE_OPTIONS = [
  { id: 'spot_on', label: 'Spot on' },
  { id: 'close',   label: 'Close' },
  { id: 'off',     label: 'Off base' },
]

function WineLabelPlaceholder({ wine }) {
  const STRIPE = { red: '#5C7A52', white: '#C4973A', rosé: '#D4726A', rose: '#D4726A', sparkling: '#3A7A8A', dessert: '#C4973A' }
  const stripe = STRIPE[wine?.color] ?? '#5C7A52'
  return (
    <div style={{
      width: 44, height: 60, borderRadius: 4, flexShrink: 0,
      background: '#FAFAF8',
      border: '1px solid #E0DDD6',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      <div style={{ height: 3, background: stripe, flexShrink: 0 }} />
    </div>
  )
}

export function StarRating({ value, onChange, onDark }) {
  const filledColor  = onDark ? theme.colors.goldBright : theme.colors.gold
  const emptyColor   = onDark ? `${theme.colors.cream}30` : theme.colors.dotEmpty
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? 0 : n)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px 3px', fontSize: 20, lineHeight: 1,
            color: n <= value ? filledColor : emptyColor,
            transition: 'color 100ms',
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function TasteMatchPicker({ value, onChange, onDark }) {
  const labelColor = onDark ? `${theme.colors.cream}55` : `${theme.colors.brand}55`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
      <span style={{
        fontFamily: theme.typography.fontSans, fontSize: 9,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: labelColor, flexShrink: 0,
      }}>
        Taste match:
      </span>
      {TASTE_OPTIONS.map(opt => {
        const active = value === opt.id
        const borderColor   = active
          ? (onDark ? theme.colors.magentaBright : theme.colors.magenta)
          : (onDark ? `${theme.colors.cream}28` : `${theme.colors.brand}28`)
        const bgColor    = active ? `${theme.colors.magenta}2a` : 'transparent'
        const textColor  = active
          ? (onDark ? theme.colors.cream : theme.colors.brand)
          : (onDark ? `${theme.colors.cream}66` : `${theme.colors.brand}66`)
        return (
          <button
            key={opt.id}
            onClick={() => onChange(active ? null : opt.id)}
            style={{
              padding: '3px 8px',
              borderRadius: theme.radius.pill,
              border: `1px solid ${borderColor}`,
              background: bgColor,
              color: textColor,
              fontFamily: theme.typography.fontSans,
              fontSize: 10, fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 100ms',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// onRate({ stars, tasteMatch, wine }) called on every change — caller decides whether to auto-save or batch.
export function WineRatingRow({ wine, savedRating, onRate, onDark = false }) {
  const [stars,      setStars]      = useState(savedRating?.stars      || 0)
  const [tasteMatch, setTasteMatch] = useState(savedRating?.tasteMatch || null)

  const imageUrl = wine?.imageUrl || wine?.label_image || wine?.image || null
  const nameColor = onDark ? theme.colors.cream : theme.colors.brand
  const metaColor = onDark ? `${theme.colors.cream}66` : `${theme.colors.brand}66`
  const dividerColor = onDark ? `${theme.colors.cream}14` : `${theme.colors.brand}10`

  function handleStars(n) {
    setStars(n)
    onRate?.({ stars: n, tasteMatch, wine })
  }
  function handleTasteMatch(tm) {
    setTasteMatch(tm)
    onRate?.({ stars, tasteMatch: tm, wine })
  }

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '10px 0',
      borderBottom: `1px solid ${dividerColor}`,
    }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={wine?.name || 'Wine label'}
          style={{ width: 44, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
        />
      ) : (
        <WineLabelPlaceholder wine={wine} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: theme.typography.fontDisplay,
          fontSize: 14, lineHeight: 1.2,
          color: nameColor,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {wine?.name || 'Unnamed wine'}
        </div>
        <div style={{
          fontFamily: theme.typography.fontSans, fontSize: 11,
          color: metaColor, marginBottom: 4,
        }}>
          {[wine?.vintage, wine?.grape || wine?.varietal].filter(Boolean).join(' · ') || ' '}
        </div>
        <StarRating value={stars} onChange={handleStars} onDark={onDark} />
        {stars > 0 && (
          <TasteMatchPicker value={tasteMatch} onChange={handleTasteMatch} onDark={onDark} />
        )}
      </div>
    </div>
  )
}
