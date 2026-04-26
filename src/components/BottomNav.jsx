import { theme } from '../theme/theme.js'

const TABS = [
  { id: 'scan',    label: 'Scan',    icon: '⊙' },
  { id: 'profile', label: 'Profile', icon: '◎' },
  { id: 'history', label: 'History', icon: '◷' },
]

export default function BottomNav({ activeTab, navigate, tasteProfile }) {
  function handleTab(id) {
    if (id === 'scan')    navigate('scanPrompt')
    if (id === 'profile') navigate(tasteProfile ? 'profileReveal' : 'quizIntro')
    // history: no-op for prototype
  }

  return (
    <div
      style={{
        display: 'flex',
        borderTop: `0.5px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
        flexShrink: 0,
      }}
    >
      {TABS.map(tab => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => handleTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0 10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 20, color: active ? theme.colors.brand : theme.colors.textMuted }}>
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: theme.typography.sizes.xs,
                fontFamily: theme.typography.fontSans,
                color: active ? theme.colors.brand : theme.colors.textMuted,
                fontWeight: active ? theme.typography.weights.medium : theme.typography.weights.normal,
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
