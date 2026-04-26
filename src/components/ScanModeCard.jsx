import { theme } from '../theme/theme.js'

export default function ScanModeCard({ icon, title, description, onTap }) {
  return (
    <button
      onClick={onTap}
      style={{
        width: '100%',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        border: `0.5px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.md,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: theme.shadows.card,
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadows.elevated }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = theme.shadows.card }}
    >
      <div style={{ fontSize: 28, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
          {description}
        </div>
      </div>
      <div style={{ marginLeft: 'auto', color: theme.colors.textMuted, fontSize: 18 }}>›</div>
    </button>
  )
}
