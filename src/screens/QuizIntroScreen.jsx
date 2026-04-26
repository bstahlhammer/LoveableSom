import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'

function GlassIllustration() {
  return (
    <svg width="80" height="110" viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 8 L65 8 L52 42 Q40 56 40 72 L40 94" stroke={theme.colors.brand} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M52 42 Q40 56 28 42 L15 8" stroke={theme.colors.brand} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3"/>
      <ellipse cx="40" cy="22" rx="14" ry="4" fill={theme.colors.brand} opacity="0.15"/>
      <line x1="28" y1="94" x2="52" y2="94" stroke={theme.colors.brand} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export default function QuizIntroScreen({ navigate, goBack }) {
  const bullets = [
    { icon: '⏱', text: '90 seconds — seriously, that\'s it' },
    { icon: '🚫', text: 'No wine jargon. Plain English only' },
    { icon: '❤️', text: 'Tell us what you love and what you hate' },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.surface }}>
      <TopBar onBack={goBack} onHome={() => navigate('home')} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: `${theme.spacing.xl} ${theme.spacing.xl}`,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.xl,
        }}
      >
      <GlassIllustration />

      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: theme.typography.sizes.xxl,
            fontWeight: theme.typography.weights.normal,
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Build your taste profile
        </h1>
        <p style={{ fontSize: theme.typography.sizes.md, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, lineHeight: 1.6 }}>
          Answer 7 quick questions and we'll match every wine list to your exact palate.
        </p>
      </div>

      {/* Trust bullets */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
        {bullets.map(b => (
          <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <span style={{ fontSize: 20 }}>{b.icon}</span>
            <span style={{ fontSize: theme.typography.sizes.md, color: theme.colors.text, fontFamily: theme.typography.fontSans }}>
              {b.text}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <button
          onClick={() => navigate('quiz')}
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
          }}
        >
          Start the quiz →
        </button>

        <button
          onClick={() => navigate('anonResults')}
          style={{
            background: 'none',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: theme.typography.sizes.md,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            padding: theme.spacing.sm,
          }}
        >
          Skip for now
        </button>
      </div>
      </div>
    </div>
  )
}
