import { theme } from '../theme/theme.js'

export default function SortToggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: theme.radius.pill,
              border: `1px solid ${active ? theme.colors.brand : theme.colors.border}`,
              backgroundColor: active ? theme.colors.brand : 'transparent',
              color: active ? theme.colors.cream : theme.colors.textMuted,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.weights.medium,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
