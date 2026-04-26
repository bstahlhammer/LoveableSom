import { theme } from '../theme/theme.js'

export default function PillGroup({ options, value, onChange, multi }) {
  const selected = multi
    ? (Array.isArray(value) ? value : [])
    : value

  function handleTap(opt) {
    if (multi) {
      const arr = Array.isArray(value) ? value : []
      const next = arr.includes(opt)
        ? arr.filter(x => x !== opt)
        : [...arr, opt]
      onChange(next)
    } else {
      onChange(opt === value ? null : opt)
    }
  }

  const isSelected = (opt) =>
    multi ? (Array.isArray(value) && value.includes(opt)) : value === opt

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {options.map(opt => {
        const sel = isSelected(opt)
        return (
          <button
            key={opt}
            onClick={() => handleTap(opt)}
            style={{
              padding: '10px 16px',
              borderRadius: theme.radius.pill,
              border: `1.5px solid ${sel ? theme.colors.brand : theme.colors.border}`,
              backgroundColor: sel ? theme.colors.brand : theme.colors.surface,
              color: sel ? theme.colors.cream : theme.colors.text,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.weights.normal,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
            onFocus={e => { e.target.style.boxShadow = `0 0 0 3px ${theme.colors.brand}40` }}
            onBlur={e => { e.target.style.boxShadow = 'none' }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
