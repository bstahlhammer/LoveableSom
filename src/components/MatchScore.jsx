import { theme } from '../theme/theme.js'

export default function MatchScore({ score }) {
  const color =
    score >= 80 ? theme.colors.matchHigh :
    score >= 50 ? theme.colors.matchMid :
                  theme.colors.matchLow

  return (
    <span
      style={{
        fontSize: theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.medium,
        fontFamily: theme.typography.fontSans,
        color,
      }}
    >
      {score}%
    </span>
  )
}
