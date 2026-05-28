import { theme } from '../theme/theme.js'

export default function ScanModeCard({ icon, title, description, onTap }) {
  return (
    <button
      onClick={onTap}
      style={{
        width: '100%',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.lg,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: theme.shadows.card,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = theme.shadows.elevated
        e.currentTarget.style.borderColor = theme.colors.gold
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = theme.shadows.card
        e.currentTarget.style.borderColor = theme.colors.border
      }}
    >
      <div style={{
        fontSize: 24,
        flexShrink: 0,
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `1px solid ${theme.colors.gold}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.brandDark,
        color: theme.colors.goldBright,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '17px', fontWeight: 500, color: theme.colors.text, fontFamily: theme.typography.fontDisplay, marginBottom: 2, letterSpacing: '0.01em' }}>
          {title}
        </div>
        <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
      <div style={{ marginLeft: 'auto', color: theme.colors.gold, fontSize: 20, fontFamily: theme.typography.fontDisplay }}>›</div>
    </button>
  )
}
