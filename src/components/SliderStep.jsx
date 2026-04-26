import { theme } from '../theme/theme.js'

function getLabel(value, labels) {
  for (const l of labels) {
    if (value <= l.max) return l.text
  }
  return labels[labels.length - 1].text
}

export default function SliderStep({ value, onChange, labels }) {
  const label = getLabel(value, labels)

  return (
    <div style={{ padding: `${theme.spacing.lg} 0` }}>
      <input
        type="range"
        min={1}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: theme.colors.brand,
          height: 4,
          cursor: 'pointer',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
        <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>Delicate</span>
        <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>Bold</span>
      </div>
      <div
        style={{
          marginTop: theme.spacing.lg,
          textAlign: 'center',
          fontSize: theme.typography.sizes.xl,
          fontFamily: theme.typography.fontSerif,
          color: theme.colors.brand,
          fontWeight: theme.typography.weights.normal,
          fontStyle: 'italic',
        }}
      >
        {label}
      </div>
    </div>
  )
}
