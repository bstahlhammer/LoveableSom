import { theme } from '../theme/theme.js'

export default function TopBar({ onBack, onHome, title, light }) {
  const fg = light ? theme.colors.cream : theme.colors.text
  const border = light ? 'transparent' : theme.colors.border
  const bg = light ? 'transparent' : theme.colors.surface

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      backgroundColor: bg,
      borderBottom: `0.5px solid ${border}`,
      flexShrink: 0,
      gap: theme.spacing.sm,
      minHeight: 44,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: fg, fontSize: 22, lineHeight: 1, padding: '4px 8px 4px 0',
          display: 'flex', alignItems: 'center',
        }}>
          ‹
        </button>
      )}

      <span style={{
        flex: 1,
        fontSize: theme.typography.sizes.md,
        fontFamily: theme.typography.fontSans,
        fontWeight: theme.typography.weights.medium,
        color: fg,
        textAlign: onBack ? 'center' : 'left',
        marginRight: onBack ? 30 : 0,
      }}>
        {title || ''}
      </span>

      {onHome && (
        <button onClick={onHome} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: fg, fontSize: 18, lineHeight: 1, padding: '4px 0 4px 8px',
          display: 'flex', alignItems: 'center',
        }}>
          ⌂
        </button>
      )}
    </div>
  )
}
