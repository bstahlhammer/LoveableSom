import T from '../theme/T.js'

function getLabel(value, labels) {
  for (const l of labels) {
    if (value <= l.max) return l.text
  }
  return labels[labels.length - 1].text
}

export default function SliderStep({ value, onChange, labels }) {
  const label = getLabel(value, labels)

  return (
    <div style={{ padding: '16px 0' }}>
      <input
        type="range" min={1} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: T.forest500, height: 4, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>Delicate</span>
        <span style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>Bold</span>
      </div>
      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 20, fontFamily: T.fontDisplay, color: T.forest500, fontWeight: 400 }}>
        {label}
      </div>
    </div>
  )
}
