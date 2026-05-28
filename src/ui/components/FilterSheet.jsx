import { useEffect, useMemo, useState } from 'react'
import { theme } from '../theme/theme.js'
import { applyFilters, CERTIFICATION_LABELS, COLOR_LABELS } from '@/core/api'

/**
 * Bottom-sheet filter UI. Stateful copy of `filters` so users can edit
 * freely and either Apply or Cancel without flicker on the underlying list.
 */
export default function FilterSheet({ open, onClose, filters, onApply, facets, totalWines }) {
  const [draft, setDraft] = useState(filters)

  useEffect(() => { if (open) setDraft(filters) }, [open, filters])

  // Live-preview count of how many wines pass the current draft filters.
  // We don't have the raw list here, so the parent passes facets only and we
  // approximate via parent-injected total + matched count handled by onApply.
  // Instead, compute matched via re-apply if parent passes wines too.
  // For simplicity, parent passes a `previewCount` callback alternative —
  // but we keep the sheet self-contained: parent supplies the full wines list.

  if (!open) return null

  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const toggleArr = (k, val) => {
    const cur = draft[k] || []
    const next = cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]
    setDraft(d => ({ ...d, [k]: next }))
  }
  const toggleVarietalInclude = (val) => {
    const inc = draft.varietalsInclude || []
    const exc = draft.varietalsExclude || []
    if (inc.includes(val)) {
      setDraft(d => ({ ...d, varietalsInclude: inc.filter(x => x !== val) }))
    } else {
      setDraft(d => ({
        ...d,
        varietalsInclude: [...inc, val],
        varietalsExclude: exc.filter(x => x !== val),
      }))
    }
  }
  const toggleVarietalExclude = (val) => {
    const inc = draft.varietalsInclude || []
    const exc = draft.varietalsExclude || []
    if (exc.includes(val)) {
      setDraft(d => ({ ...d, varietalsExclude: exc.filter(x => x !== val) }))
    } else {
      setDraft(d => ({
        ...d,
        varietalsExclude: [...exc, val],
        varietalsInclude: inc.filter(x => x !== val),
      }))
    }
  }

  const reset = () => setDraft({
    priceMin: undefined, priceMax: undefined,
    colors: [], varietalsInclude: [], varietalsExclude: [],
    makers: [], regions: [], certifications: [],
  })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(26, 11, 38, 0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '85vh',
          background: theme.colors.surface,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          display: 'flex', flexDirection: 'column',
          boxShadow: theme.shadows.elevated,
        }}
      >
        {/* Header */}
        <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.sm}`, borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: theme.typography.fontDisplay, fontSize: theme.typography.sizes.xl, color: theme.colors.text, margin: 0 }}>Filter wines</h2>
            <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: theme.colors.textMuted }}>×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.lg, display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>

          {/* Price */}
          {facets.priceRange.max > 0 && (
            <Section title="Price">
              <PriceRange
                min={facets.priceRange.min}
                max={facets.priceRange.max}
                value={[draft.priceMin ?? facets.priceRange.min, draft.priceMax ?? facets.priceRange.max]}
                onChange={([lo, hi]) => setDraft(d => ({
                  ...d,
                  priceMin: lo === facets.priceRange.min ? undefined : lo,
                  priceMax: hi === facets.priceRange.max ? undefined : hi,
                }))}
              />
            </Section>
          )}

          {/* Color */}
          {facets.colors.length > 1 && (
            <Section title="Color">
              <PillRow
                options={facets.colors.map(c => ({ value: c, label: COLOR_LABELS[c] || c }))}
                selected={draft.colors}
                onToggle={(v) => toggleArr('colors', v)}
              />
            </Section>
          )}

          {/* Varietals — include / exclude */}
          {facets.varietals.length > 1 && (
            <Section title="Varietals" subtitle="Tap once to include, twice (or use ⊘) to exclude">
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                {facets.varietals.map((v) => {
                  const included = draft.varietalsInclude?.includes(v)
                  const excluded = draft.varietalsExclude?.includes(v)
                  return (
                    <div key={v} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                      <button
                        onClick={() => toggleVarietalInclude(v)}
                        style={chipStyle(included, theme.colors.tide)}
                      >
                        {included ? '✓ ' : ''}{v}
                      </button>
                      <button
                        onClick={() => toggleVarietalExclude(v)}
                        title="Exclude"
                        style={{
                          padding: '4px 10px',
                          borderRadius: theme.radius.pill,
                          border: `1px solid ${excluded ? theme.colors.crimson : theme.colors.border}`,
                          background: excluded ? theme.colors.crimson : 'transparent',
                          color: excluded ? theme.colors.cream : theme.colors.textMuted,
                          fontSize: theme.typography.sizes.xs,
                          fontFamily: theme.typography.fontSans,
                          cursor: 'pointer',
                        }}
                      >
                        {excluded ? '⊘ excluded' : 'exclude'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Makers */}
          {facets.makers.length > 1 && (
            <Section title="Makers">
              <ChipMulti
                options={facets.makers}
                selected={draft.makers}
                onToggle={(v) => toggleArr('makers', v)}
                searchable
              />
            </Section>
          )}

          {/* Regions */}
          {facets.regions.length > 1 && (
            <Section title="Regions">
              <ChipMulti
                options={facets.regions}
                selected={draft.regions}
                onToggle={(v) => toggleArr('regions', v)}
                searchable
              />
            </Section>
          )}

          {/* Certifications */}
          <Section title="Certifications" subtitle="Natural, biodynamic, organic, or low-sulfite wines">
            <PillRow
              options={Object.entries(CERTIFICATION_LABELS).map(([k, label]) => ({ value: k, label }))}
              selected={draft.certifications}
              onToggle={(v) => toggleArr('certifications', v)}
            />
          </Section>
        </div>

        {/* Footer */}
        <div style={{ padding: theme.spacing.lg, borderTop: `1px solid ${theme.colors.border}`, display: 'flex', gap: theme.spacing.sm }}>
          <button
            onClick={reset}
            style={{
              flex: '0 0 auto', padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              border: `1px solid ${theme.colors.border}`, background: 'transparent',
              borderRadius: theme.radius.sm, color: theme.colors.text,
              fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            onClick={() => onApply(draft)}
            style={{
              flex: 1, padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              border: 'none',
              background: `linear-gradient(135deg, ${theme.colors.gold} 0%, ${theme.colors.goldBright} 100%)`,
              color: theme.colors.cream,
              borderRadius: theme.radius.sm,
              fontFamily: theme.typography.fontSans, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div>
      <div style={{ fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm, fontWeight: 600, color: theme.colors.text, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.sm }}>
          {subtitle}
        </div>
      )}
      <div style={{ marginTop: theme.spacing.sm }}>{children}</div>
    </div>
  )
}

function chipStyle(active, accentColor) {
  return {
    flex: 1,
    padding: '8px 12px',
    borderRadius: theme.radius.pill,
    border: `1px solid ${active ? accentColor : theme.colors.border}`,
    background: active ? accentColor : theme.colors.surface,
    color: active ? theme.colors.cream : theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontSans,
    cursor: 'pointer',
    textAlign: 'left',
  }
}

function PillRow({ options, selected, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
      {options.map((opt) => {
        const active = (selected || []).includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: theme.radius.pill,
              border: `1px solid ${active ? theme.colors.gold : theme.colors.border}`,
              background: active ? theme.colors.gold : 'transparent',
              color: active ? theme.colors.cream : theme.colors.text,
              fontSize: theme.typography.sizes.sm,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ChipMulti({ options, selected, onToggle, searchable }) {
  const [q, setQ] = useState('')
  const [showAll, setShowAll] = useState(false)
  const COLLAPSED = 8
  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase()
    return norm ? options.filter(o => o.toLowerCase().includes(norm)) : options
  }, [options, q])
  const visible = showAll || q ? filtered : filtered.slice(0, COLLAPSED)
  return (
    <div>
      {searchable && (
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          style={{
            width: '100%', padding: '6px 10px', marginBottom: theme.spacing.sm,
            border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm,
            background: theme.colors.surfaceAlt, color: theme.colors.text,
            fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm,
            outline: 'none',
          }}
        />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
        {visible.map((opt) => {
          const active = (selected || []).includes(opt)
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              style={{
                padding: '6px 12px',
                borderRadius: theme.radius.pill,
                border: `1px solid ${active ? theme.colors.gold : theme.colors.border}`,
                background: active ? theme.colors.gold : 'transparent',
                color: active ? theme.colors.cream : theme.colors.text,
                fontSize: theme.typography.sizes.sm,
                fontFamily: theme.typography.fontSans,
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          )
        })}
        {!showAll && !q && filtered.length > COLLAPSED && (
          <button
            onClick={() => setShowAll(true)}
            style={{
              padding: '6px 12px', borderRadius: theme.radius.pill,
              border: `1px dashed ${theme.colors.border}`, background: 'transparent',
              color: theme.colors.textMuted, fontFamily: theme.typography.fontSans,
              fontSize: theme.typography.sizes.sm, cursor: 'pointer',
            }}
          >
            +{filtered.length - COLLAPSED} more
          </button>
        )}
      </div>
    </div>
  )
}

function PriceRange({ min, max, value, onChange }) {
  const [lo, hi] = value
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.xs }}>
        <span>${lo}</span>
        <span>${hi}{hi === max ? '+' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
        <input
          type="range" min={min} max={max} value={lo}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi)
            onChange([v, hi])
          }}
          style={{ flex: 1, accentColor: theme.colors.gold }}
        />
        <input
          type="range" min={min} max={max} value={hi}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo)
            onChange([lo, v])
          }}
          style={{ flex: 1, accentColor: theme.colors.gold }}
        />
      </div>
    </div>
  )
}
