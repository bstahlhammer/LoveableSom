import { theme } from '../theme/theme.js'

export default function UpsellBanner({ onCta }) {
  return (
    <div
      style={{
        margin: `${theme.spacing.md} ${theme.spacing.lg}`,
        padding: theme.spacing.md,
        backgroundColor: '#FFF8F0',
        border: `1px solid ${theme.colors.gold}40`,
        borderRadius: theme.radius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text, fontFamily: theme.typography.fontSans, lineHeight: 1.4 }}>
          See which of these matches your taste
        </div>
        <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginTop: 2 }}>
          90 seconds · no sign-up
        </div>
      </div>
      <button
        onClick={onCta}
        style={{
          padding: '8px 16px',
          backgroundColor: theme.colors.brand,
          color: theme.colors.cream,
          border: 'none',
          borderRadius: theme.radius.pill,
          fontSize: theme.typography.sizes.sm,
          fontWeight: theme.typography.weights.medium,
          fontFamily: theme.typography.fontSans,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Match me →
      </button>
    </div>
  )
}
