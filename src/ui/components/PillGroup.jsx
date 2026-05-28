import T from '../theme/T.js'

export default function PillGroup({ options, value, onChange, multi }) {
  function handleTap(opt) {
    if (multi) {
      const arr = Array.isArray(value) ? value : []
      const next = arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]
      onChange(next)
    } else {
      onChange(opt === value ? null : opt)
    }
  }

  const isSelected = (opt) =>
    multi ? (Array.isArray(value) && value.includes(opt)) : value === opt

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const sel = isSelected(opt)
        return (
          <button
            key={opt}
            onClick={() => handleTap(opt)}
            style={{
              padding: '10px 16px', borderRadius: 100,
              border: `1.5px solid ${sel ? T.forest500 : T.ink150}`,
              background: sel ? T.forest500 : 'white',
              color: sel ? 'white' : T.ink900,
              fontSize: 14, fontWeight: 400, fontFamily: T.fontBody,
              cursor: 'pointer', transition: 'all 0.15s ease', outline: 'none',
            }}
            onFocus={e => { e.target.style.boxShadow = `0 0 0 3px ${T.forest300}` }}
            onBlur={e => { e.target.style.boxShadow = 'none' }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
