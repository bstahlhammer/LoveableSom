import { useState } from 'react'
import { theme } from '../theme/theme.js'
import { wineSearchDb } from '../data/mockData.js'

export default function WineSearchStep({ mode, value = [], onChange }) {
  const [query, setQuery] = useState('')

  const isHate = mode === 'hate'
  const accentColor = isHate ? '#A32D2D' : theme.colors.brand

  const results = query.length >= 1
    ? wineSearchDb.filter(w => {
        const q = query.toLowerCase()
        return (
          w.name.toLowerCase().includes(q) ||
          w.grape.toLowerCase().includes(q) ||
          w.region.toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : []

  function addWine(wine) {
    if (!value.includes(wine.id)) {
      onChange([...value, wine.id])
    }
    setQuery('')
  }

  function removeWine(id) {
    onChange(value.filter(v => v !== id))
  }

  const addedWines = wineSearchDb.filter(w => value.includes(w.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.colors.textMuted, fontSize: 16 }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Search by wine, grape, or region…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            fontSize: theme.typography.sizes.md,
            fontFamily: theme.typography.fontSans,
            color: theme.colors.text,
            outline: 'none',
            backgroundColor: theme.colors.surface,
          }}
        />
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
            boxShadow: theme.shadows.elevated,
          }}
        >
          {results.map((wine, i) => (
            <button
              key={wine.id}
              onClick={() => addWine(wine)}
              style={{
                width: '100%',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                backgroundColor: theme.colors.surface,
                border: 'none',
                borderTop: i > 0 ? `0.5px solid ${theme.colors.border}` : 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FAF3E8' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = theme.colors.surface }}
            >
              <span style={{ fontSize: theme.typography.sizes.md, color: theme.colors.text, fontFamily: theme.typography.fontSans }}>
                {wine.name} <span style={{ color: theme.colors.textMuted }}>{wine.vintage}</span>
              </span>
              <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
                {wine.grape} · {wine.region}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Added wine pills */}
      {addedWines.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
          {addedWines.map(wine => (
            <button
              key={wine.id}
              onClick={() => removeWine(wine.id)}
              style={{
                padding: '6px 12px',
                backgroundColor: `${accentColor}18`,
                border: `1px solid ${accentColor}40`,
                borderRadius: theme.radius.pill,
                fontSize: theme.typography.sizes.sm,
                color: accentColor,
                fontFamily: theme.typography.fontSans,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {wine.name}
              <span style={{ fontSize: 12, opacity: 0.7 }}>×</span>
            </button>
          ))}
        </div>
      )}

      {addedWines.length === 0 && query.length === 0 && (
        <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, fontStyle: 'italic' }}>
          {isHate ? 'No wines added yet — this step is optional.' : 'No wines added yet — this step is optional.'}
        </p>
      )}
    </div>
  )
}
