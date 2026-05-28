import T from '../theme/T.js'

export default function SortToggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = opt.value === value
        const highlight = opt.highlight && !active
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              border: highlight
                ? 'none'
                : `1px solid ${active ? T.cobalt500 : T.ink200}`,
              background: highlight
                ? `linear-gradient(180deg, ${T.ochre400} 0%, ${T.ochre500} 100%)`
                : (active ? T.cobalt500 : 'transparent'),
              color: highlight
                ? T.forest700
                : (active ? T.ink0 : T.ink400),
              fontSize: 13,
              fontWeight: highlight ? 700 : 500,
              fontFamily: T.fontBody,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              letterSpacing: highlight ? '0.04em' : 'normal',
              boxShadow: highlight ? T.shadowMd : 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
