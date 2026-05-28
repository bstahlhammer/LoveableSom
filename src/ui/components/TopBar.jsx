import T from '../theme/T.js'

export default function TopBar({ onBack, onHome, title, light }) {
  const fg = light ? T.ink100 : T.ink900
  const border = light ? 'transparent' : T.ink150
  const bg = light ? 'transparent' : T.ink0

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '8px 12px',
      background: bg,
      borderBottom: `0.5px solid ${border}`,
      flexShrink: 0, gap: 8, minHeight: 44,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: fg, padding: '4px 8px 4px 0',
          display: 'flex', alignItems: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      <span style={{
        flex: 1, fontSize: 14, fontFamily: T.fontBody, fontWeight: 500, color: fg,
        textAlign: onBack ? 'center' : 'left',
        marginRight: onBack ? 30 : 0,
      }}>
        {title || ''}
      </span>

      {onHome && (
        <button onClick={onHome} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: fg, padding: '4px 0 4px 8px',
          display: 'flex', alignItems: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
      )}
    </div>
  )
}
