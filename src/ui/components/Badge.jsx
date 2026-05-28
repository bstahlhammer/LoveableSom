import { theme } from '../theme/theme.js'

const VARIANTS = {
  crowd:     { bg: theme.colors.crowdBg,    color: theme.colors.crowd },
  value:     { bg: theme.colors.valueBg,    color: '#7A4F00' },
  bestMatch: { bg: theme.colors.bestMatchBg, color: theme.colors.success },
  critic:    { bg: theme.colors.criticBg,   color: theme.colors.cream },
}

export default function Badge({ variant, label }) {
  const v = VARIANTS[variant] || VARIANTS.crowd
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: v.bg,
        color: v.color,
        fontSize: '10px',
        fontWeight: 600,
        fontFamily: theme.typography.fontSans,
        borderRadius: theme.radius.sm,
        padding: '3px 8px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        border: `1px solid ${v.color}25`,
      }}
    >
      {label}
    </span>
  )
}
