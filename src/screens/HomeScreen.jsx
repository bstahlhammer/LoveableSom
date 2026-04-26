import { theme } from '../theme/theme.js'

function WineGlassIcon() {
  return (
    <svg width="48" height="64" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4 L40 4 L32 28 Q24 36 24 44 L24 56" stroke="#C9922A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M32 28 Q24 36 16 28 L8 4" stroke="#C9922A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4"/>
      <line x1="16" y1="56" x2="32" y2="56" stroke="#C9922A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function HomeScreen({ navigate }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.brandDark,
        padding: `${theme.spacing.xxl} ${theme.spacing.xl}`,
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.xl,
      }}
    >
      {/* Wordmark */}
      <div style={{ textAlign: 'center' }}>
        <WineGlassIcon />
        <h1
          style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: '52px',
            fontWeight: theme.typography.weights.normal,
            color: theme.colors.cream,
            letterSpacing: '0.06em',
            marginTop: theme.spacing.md,
            lineHeight: 1,
          }}
        >
          Uncork
        </h1>
        <p
          style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: theme.typography.sizes.lg,
            color: theme.colors.gold,
            fontStyle: 'italic',
            marginTop: theme.spacing.sm,
            letterSpacing: '0.02em',
          }}
        >
          Wine, understood.
        </p>
      </div>

      {/* Primary CTAs */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
        <button
          onClick={() => navigate('scanPrompt')}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: theme.colors.brand,
            color: theme.colors.cream,
            border: 'none',
            borderRadius: theme.radius.md,
            fontSize: theme.typography.sizes.lg,
            fontWeight: theme.typography.weights.medium,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            lineHeight: 1.3,
            textAlign: 'center',
          }}
        >
          I need to choose a wine right now
        </button>

        <button
          onClick={() => navigate('quizIntro')}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: 'transparent',
            color: theme.colors.cream,
            border: `1.5px solid ${theme.colors.cream}50`,
            borderRadius: theme.radius.md,
            fontSize: theme.typography.sizes.lg,
            fontWeight: theme.typography.weights.medium,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
          }}
        >
          Build my taste profile
        </button>
      </div>

      {/* Ghost link */}
      <button
        onClick={() => navigate('scanPrompt')}
        style={{
          background: 'none',
          border: 'none',
          color: `${theme.colors.cream}70`,
          fontSize: theme.typography.sizes.md,
          fontFamily: theme.typography.fontSans,
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        Just let me explore
      </button>
    </div>
  )
}
