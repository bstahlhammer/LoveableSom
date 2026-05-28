import T from '../theme/T.js'

export default function UpsellBanner({ onCta }) {
  return (
    <div style={{
      margin: '12px 16px',
      padding: '14px 16px',
      background: `linear-gradient(135deg, ${T.cobalt50}, ${T.forest50})`,
      border: `1px solid ${T.cobalt100}`,
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink900, fontFamily: T.fontBody, lineHeight: 1.35 }}>
          See which of these you'll actually love
        </div>
        <div style={{ fontSize: 10, color: T.ink400, fontFamily: T.fontBody, marginTop: 3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          60 seconds · personalized picks
        </div>
      </div>
      <button
        onClick={onCta}
        style={{
          padding: '10px 16px',
          background: `linear-gradient(180deg, ${T.cobalt400} 0%, ${T.cobalt500} 100%)`,
          color: 'white',
          border: 'none',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: T.fontBody,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Match me →
      </button>
    </div>
  )
}
