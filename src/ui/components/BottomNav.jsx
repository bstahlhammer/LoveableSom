import T from '../theme/T.js'

const TABS = [
  { id: 'home',       label: 'Home',     Icon: HomeIcon },
  { id: 'myWines',    label: 'My Wines', Icon: WineIcon },
  { id: 'scanPrompt', label: 'Scan',     Icon: ScanIcon, primary: true },
  { id: 'history',    label: 'History',  Icon: HistoryIcon },
  { id: 'profile',    label: 'Profile',  Icon: ProfileIcon },
]

export default function BottomNav({ activeTab, navigate }) {
  return (
    <div style={{
      display: 'flex',
      borderTop: `0.5px solid ${T.ink150}`,
      backgroundColor: T.ink0,
      flexShrink: 0,
    }}>
      {TABS.map(({ id, label, Icon, primary }) => {
        const active = id === activeTab

        if (primary) {
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 0 10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                gap: 4,
              }}
            >
              <div style={{
                width: 48,
                height: 30,
                borderRadius: 15,
                background: `linear-gradient(180deg, ${T.cobalt400} 0%, ${T.cobalt500} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 2px 8px oklch(42% 0.18 262 / 0.30)`,
              }}>
                <Icon size={16} color="white" strokeWidth={2.2} />
              </div>
              <span style={{
                fontSize: 9.5,
                fontFamily: T.fontBody,
                color: T.cobalt500,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}>
                {label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={id}
            onClick={() => navigate(id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0 10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: 3,
            }}
          >
            <Icon
              size={22}
              color={active ? T.forest500 : T.ink300}
              strokeWidth={active ? 2.2 : 1.6}
            />
            <span style={{
              fontSize: 9.5,
              fontFamily: T.fontBody,
              color: active ? T.forest500 : T.ink300,
              fontWeight: active ? 700 : 400,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ScanIcon({ size, color, strokeWidth }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function HomeIcon({ size, color, strokeWidth }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function WineIcon({ size, color, strokeWidth }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8l1 9a5 5 0 0 1-10 0L8 3z" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
  )
}

function HistoryIcon({ size, color, strokeWidth }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  )
}

function ProfileIcon({ size, color, strokeWidth }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
