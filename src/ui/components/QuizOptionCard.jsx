import T from '../theme/T.js'

export default function QuizOptionCard({ label, hint, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '16px',
        background: selected ? T.forest50 : 'white',
        border: `1px solid ${selected ? T.forest300 : T.ink150}`,
        borderRadius: 8,
        boxShadow: selected ? T.shadowMd : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
        transition: 'all 0.15s ease', outline: 'none', position: 'relative',
      }}
      onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 3px ${T.forest300}` }}
      onBlur={e => { e.currentTarget.style.boxShadow = selected ? T.shadowMd : '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 17, color: T.ink900, lineHeight: 1.25, fontWeight: 400 }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.ink400, marginTop: 4, lineHeight: 1.4 }}>
            {hint}
          </div>
        )}
      </div>
      <div
        aria-hidden
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${selected ? T.forest500 : T.ink200}`,
          background: selected ? T.forest500 : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 14, fontWeight: 700,
          transition: 'all 0.15s ease',
        }}
      >
        {selected ? '✓' : ''}
      </div>
    </button>
  )
}
