import { theme } from '../theme/theme.js'
import { countActiveFilters, CERTIFICATION_LABELS, COLOR_LABELS } from '@/core/api'

/**
 * Compact filter bar shown above the wine list. Tapping "Filter" opens
 * the FilterSheet; active facets show as removable chips.
 */
export default function FilterBar({ filters, onOpen, onChange, resultCount, totalCount }) {
  const activeCount = countActiveFilters(filters)
  const hasActive = activeCount > 0
  const chips = activeChips(filters)

  return (
    <div style={{
      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
      display: 'flex', flexDirection: 'column', gap: theme.spacing.sm,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        <button
          onClick={onOpen}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px',
            borderRadius: theme.radius.pill,
            border: `1px solid ${hasActive ? theme.colors.gold : theme.colors.border}`,
            background: hasActive ? `${theme.colors.gold}18` : 'transparent',
            color: theme.colors.text,
            fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <span aria-hidden>⚙︎</span>
          <span>Filter</span>
          {hasActive && (
            <span style={{
              minWidth: 18, height: 18, padding: '0 5px',
              borderRadius: 9, background: theme.colors.gold, color: theme.colors.cream,
              fontSize: 11, lineHeight: '18px', textAlign: 'center', fontWeight: 700,
            }}>{activeCount}</span>
          )}
        </button>

        {hasActive && typeof resultCount === 'number' && typeof totalCount === 'number' && (
          <span style={{ fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted }}>
            {resultCount} of {totalCount}
          </span>
        )}

        {hasActive && (
          <button
            onClick={() => onChange({
              priceMin: undefined, priceMax: undefined,
              colors: [], varietalsInclude: [], varietalsExclude: [],
              makers: [], regions: [], certifications: [], natural: false,
            })}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              color: theme.colors.textMuted, fontFamily: theme.typography.fontSans,
              fontSize: theme.typography.sizes.sm, cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => onChange(chip.remove(filters))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: theme.radius.pill,
                background: theme.colors.surfaceAlt,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text, fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizes.xs, cursor: 'pointer',
              }}
            >
              {chip.label} <span aria-hidden style={{ color: theme.colors.textMuted }}>×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function activeChips(f) {
  if (!f) return []
  const chips = []
  if (f.natural) {
    chips.push({
      key: 'natural', label: '🌿 Natural',
      remove: (cur) => ({ ...cur, natural: false }),
    })
  }
  if (typeof f.priceMin === 'number' || typeof f.priceMax === 'number') {
    const lo = f.priceMin ?? 0
    const hi = f.priceMax ?? '∞'
    chips.push({
      key: 'price', label: `$${lo}–${hi}`,
      remove: (cur) => ({ ...cur, priceMin: undefined, priceMax: undefined }),
    })
  }
  for (const c of f.colors || []) {
    chips.push({
      key: `color:${c}`, label: COLOR_LABELS[c] || c,
      remove: (cur) => ({ ...cur, colors: cur.colors.filter(x => x !== c) }),
    })
  }
  for (const v of f.varietalsInclude || []) {
    chips.push({
      key: `vinc:${v}`, label: v,
      remove: (cur) => ({ ...cur, varietalsInclude: cur.varietalsInclude.filter(x => x !== v) }),
    })
  }
  for (const v of f.varietalsExclude || []) {
    chips.push({
      key: `vexc:${v}`, label: `⊘ ${v}`,
      remove: (cur) => ({ ...cur, varietalsExclude: cur.varietalsExclude.filter(x => x !== v) }),
    })
  }
  for (const m of f.makers || []) {
    chips.push({
      key: `m:${m}`, label: m,
      remove: (cur) => ({ ...cur, makers: cur.makers.filter(x => x !== m) }),
    })
  }
  for (const r of f.regions || []) {
    chips.push({
      key: `r:${r}`, label: r,
      remove: (cur) => ({ ...cur, regions: cur.regions.filter(x => x !== r) }),
    })
  }
  for (const c of f.certifications || []) {
    chips.push({
      key: `cert:${c}`, label: CERTIFICATION_LABELS[c] || c,
      remove: (cur) => ({ ...cur, certifications: cur.certifications.filter(x => x !== c) }),
    })
  }
  return chips
}
