import { theme } from '../theme/theme.js'
import ScoreBar from '../components/ScoreBar.jsx'
import TopBar from '../components/TopBar.jsx'

function palateDescriptor(axis, value) {
  if (axis === 'body') {
    if (value >= 75) return 'Full'
    if (value >= 50) return 'Medium'
    return 'Light'
  }
  if (axis === 'sweetness') {
    if (value >= 60) return 'Sweet'
    if (value >= 35) return 'Off-dry'
    if (value >= 15) return 'Dry'
    return 'Bone dry'
  }
  if (axis === 'tannin') {
    if (value >= 75) return 'High'
    if (value >= 45) return 'Medium'
    return 'Low'
  }
  if (axis === 'acidity') {
    if (value >= 65) return 'High'
    if (value >= 45) return 'Medium'
    return 'Low'
  }
  return ''
}

export default function ProfileRevealScreen({ navigate, goBack, tasteProfile }) {
  if (!tasteProfile) return null

  const { palate } = tasteProfile

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.surface }}>
      {/* Top zone — dark panel */}
      <div
        style={{
          backgroundColor: theme.colors.brandDark,
          textAlign: 'center',
        }}
      >
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl} ${theme.spacing.xxl}` }}>
        <div
          style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.gold,
            fontFamily: theme.typography.fontSans,
            fontWeight: theme.typography.weights.medium,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: theme.spacing.sm,
          }}
        >
          Your Taste Identity
        </div>
        <h1
          style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: theme.typography.sizes.xxxl,
            fontWeight: theme.typography.weights.normal,
            color: theme.colors.cream,
            lineHeight: 1.1,
            marginBottom: theme.spacing.md,
          }}
        >
          {tasteProfile.name}
        </h1>
        <p
          style={{
            fontSize: theme.typography.sizes.md,
            color: `${theme.colors.cream}90`,
            fontFamily: theme.typography.fontSans,
            lineHeight: 1.7,
            maxWidth: 300,
            margin: '0 auto',
          }}
        >
          {tasteProfile.description}
        </p>
        </div>
      </div>

      {/* Bottom zone — scrollable */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.xl }}>
        {/* Palate breakdown */}
        <h2
          style={{
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.weights.medium,
            color: theme.colors.text,
            fontFamily: theme.typography.fontSans,
            marginBottom: theme.spacing.md,
          }}
        >
          Your palate breakdown
        </h2>

        <ScoreBar label="Body"      value={palate.body}      descriptor={palateDescriptor('body',      palate.body)} />
        <ScoreBar label="Sweetness" value={palate.sweetness} descriptor={palateDescriptor('sweetness', palate.sweetness)} />
        <ScoreBar label="Tannin"    value={palate.tannin}    descriptor={palateDescriptor('tannin',    palate.tannin)} />
        <ScoreBar label="Acidity"   value={palate.acidity}   descriptor={palateDescriptor('acidity',   palate.acidity)} />

        {/* You'll usually love */}
        <h2
          style={{
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.weights.medium,
            color: theme.colors.text,
            fontFamily: theme.typography.fontSans,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.sm,
          }}
        >
          You'll usually love
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          {tasteProfile.loves.map(g => (
            <span
              key={g}
              style={{
                padding: '6px 14px',
                backgroundColor: `${theme.colors.brand}18`,
                border: `1px solid ${theme.colors.brand}30`,
                borderRadius: theme.radius.pill,
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.brand,
                fontFamily: theme.typography.fontSans,
              }}
            >
              {g}
            </span>
          ))}
        </div>

        {/* Probably skip */}
        <h2
          style={{
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.weights.medium,
            color: theme.colors.text,
            fontFamily: theme.typography.fontSans,
            marginTop: theme.spacing.lg,
            marginBottom: theme.spacing.sm,
          }}
        >
          Probably skip
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          {tasteProfile.skips.map(g => (
            <span
              key={g}
              style={{
                padding: '6px 14px',
                backgroundColor: theme.colors.border,
                borderRadius: theme.radius.pill,
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontSans,
                opacity: 0.7,
              }}
            >
              {g}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ marginTop: theme.spacing.xxl, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <button
            onClick={() => navigate('personalizedResults')}
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
            See my personalized wine matches
          </button>
          <button
            onClick={() => navigate('scanPrompt')}
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
              textAlign: 'center',
            }}
          >
            Scan a wine list first
          </button>
        </div>
      </div>
    </div>
  )
}
