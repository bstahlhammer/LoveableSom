import { theme } from '../theme/theme.js'

export default function ScoreBar({ label, value, descriptor }) {
  return (
    <div style={{ marginBottom: theme.spacing.sm }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
          {label}
        </span>
        <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text, fontFamily: theme.typography.fontSans, fontWeight: theme.typography.weights.medium }}>
          {descriptor}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, backgroundColor: theme.colors.barTrack, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            backgroundColor: theme.colors.brand,
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  )
}
