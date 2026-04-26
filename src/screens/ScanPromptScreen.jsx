import { theme } from '../theme/theme.js'
import ScanModeCard from '../components/ScanModeCard.jsx'
import TopBar from '../components/TopBar.jsx'

const SCAN_MODES = [
  { icon: '📋', title: 'Restaurant wine list', description: 'Scan a printed or digital menu' },
  { icon: '🏪', title: 'Liquor store shelf', description: 'Point at a shelf of bottles' },
  { icon: '🍷', title: 'Single bottle', description: 'Get the full story on one wine' },
]

const BUYING_FOR = [
  { id: 'me',    label: 'Just me' },
  { id: 'group', label: 'A group' },
  { id: 'gift',  label: 'A gift' },
]

export default function ScanPromptScreen({ navigate, goBack, buyingFor, onBuyingForChange }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.surface }}>
      {/* Header */}
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg} ${theme.spacing.lg}` }}>
          <h1 style={{ fontFamily: theme.typography.fontSerif, fontSize: theme.typography.sizes.xxl, color: theme.colors.cream, fontWeight: theme.typography.weights.normal }}>
            What are you scanning?
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}80`, fontFamily: theme.typography.fontSans, marginTop: theme.spacing.xs }}>
            Choose a scan mode to get started
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.lg, display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
        {/* Scan mode cards */}
        {SCAN_MODES.map(mode => (
          <ScanModeCard
            key={mode.title}
            icon={mode.icon}
            title={mode.title}
            description={mode.description}
            onTap={() => navigate('scanning')}
          />
        ))}

        {/* Who are you buying for? */}
        <div style={{ marginTop: theme.spacing.sm }}>
          <p style={{ fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.sm }}>
            Who are you buying for?
          </p>
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            {BUYING_FOR.map(opt => {
              const active = buyingFor === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => onBuyingForChange(opt.id)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: theme.radius.pill,
                    border: `1.5px solid ${active ? theme.colors.brand : theme.colors.border}`,
                    backgroundColor: active ? `${theme.colors.brand}12` : 'transparent',
                    color: active ? theme.colors.brand : theme.colors.textMuted,
                    fontSize: theme.typography.sizes.sm,
                    fontWeight: active ? theme.typography.weights.medium : theme.typography.weights.normal,
                    fontFamily: theme.typography.fontSans,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Ghost link */}
        <div style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
          <button
            onClick={() => navigate('quizIntro')}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.brand,
              fontSize: theme.typography.sizes.sm,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Build my taste profile first →
          </button>
        </div>
      </div>
    </div>
  )
}
