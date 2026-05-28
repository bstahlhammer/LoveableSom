import { theme } from '../theme/theme.js'

const ROLE_META = {
  topPick: {
    label: '✦ Top Pick ✦',
    accent: theme.colors.magenta,
    glow: theme.shadows.brass,
  },
  bestValue: {
    label: 'Best Value',
    accent: theme.colors.tide,
    glow: theme.shadows.card,
  },
  crowdPleaser: {
    label: 'Crowd Pleaser',
    accent: theme.colors.crimsonSoft,
    glow: theme.shadows.card,
  },
}

const LABEL_STRIPE = {
  topPick:      '#5C7A52',
  bestValue:    '#C4973A',
  crowdPleaser: '#D4726A',
}

function BlankLabelPanel({ accent, role }) {
  const stripe = LABEL_STRIPE[role] ?? accent
  return (
    <div style={{
      width: 56, height: 96,
      borderRadius: 4,
      background: '#FAFAF8',
      border: `1px solid #E0DDD6`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
    }}>
      <div style={{ height: 3, background: stripe, flexShrink: 0 }} />
    </div>
  )
}

export default function HeroPickCard({ role, wine, reasoning, ctaLabel, onCta, onTap, matchScore, mismatch }) {
  const meta = ROLE_META[role] || ROLE_META.topPick
  const priceStr = wine.price && wine.price !== ',' && String(wine.price).trim() !== ''
    ? (String(wine.price).startsWith('$') ? wine.price : `$${wine.price}`)
    : null
  const subline = [wine.vintage, wine.region, wine.grape, priceStr].filter(v => v && String(v).trim() !== '').join(' · ')

  const hasScore = typeof matchScore === 'number'
  const scoreColor =
    matchScore >= 80 ? theme.colors.matchHigh :
    matchScore >= 50 ? theme.colors.matchMid :
                       theme.colors.matchLow

  const topMismatch = mismatch?.reasons?.[0]
  const showHonestTake = topMismatch && mismatch.severity !== 'none'

  const imageUrl = wine.imageUrl || wine.label_image || wine.image || null

  return (
    <button
      onClick={() => onTap?.(wine)}
      style={{
        width: '100%',
        border: `1px solid ${meta.accent}55`,
        borderRadius: theme.radius.md,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: meta.glow,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = theme.shadows.elevated }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = meta.glow }}
    >
      {/* Header: role label (left) + match score (right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `7px ${theme.spacing.md}`,
        backgroundColor: `${meta.accent}18`,
        borderBottom: `1px solid ${meta.accent}30`,
      }}>
        <div style={{
          fontSize: '10px',
          color: meta.accent,
          fontFamily: theme.typography.fontSans,
          fontWeight: 700,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
        }}>
          {meta.label}
        </div>

        {hasScore && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{
              fontFamily: theme.typography.fontSans,
              fontSize: 26,
              fontWeight: 700,
              color: scoreColor,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}>
              {matchScore}
            </span>
            <span style={{
              fontFamily: theme.typography.fontSans,
              fontSize: 9,
              fontWeight: 700,
              color: scoreColor,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}>
              Match
            </span>
          </div>
        )}
      </div>

      {/* Body: left image + right content */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* Left: label image slot */}
        <div style={{
          flex: '0 0 34%',
          backgroundColor: theme.colors.brandDark,
          backgroundImage: `linear-gradient(160deg, ${theme.colors.brandDark} 50%, ${meta.accent}18 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 120,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={wine.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <BlankLabelPanel accent={meta.accent} role={role} />
          )}
        </div>

        {/* Right: identity + reasoning + honest take */}
        <div style={{
          flex: 1,
          padding: theme.spacing.md,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          backgroundColor: theme.colors.surface,
        }}>
          {/* Wine name */}
          <div style={{
            fontFamily: theme.typography.fontDisplay,
            fontSize: 16,
            fontWeight: 600,
            color: theme.colors.text,
            lineHeight: 1.2,
          }}>
            {wine.name}
          </div>

          {/* Subline */}
          {subline && (
            <div style={{
              fontFamily: theme.typography.fontSans,
              fontSize: 11,
              color: theme.colors.textMuted,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              lineHeight: 1.3,
            }}>
              {subline}
            </div>
          )}

          {/* Reasoning */}
          {reasoning && (
            <div style={{
              marginTop: 4,
              paddingTop: 6,
              borderTop: `1px solid ${theme.colors.border}`,
            }}>
              <div style={{
                fontSize: '10px',
                color: meta.accent,
                fontFamily: theme.typography.fontSans,
                fontWeight: 700,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                marginBottom: 3,
              }}>
                Why this wine
              </div>
              <div style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text,
                fontFamily: theme.typography.fontSans,
                lineHeight: 1.5,
              }}>
                {reasoning}
              </div>
            </div>
          )}

          {/* Honest take */}
          {showHonestTake && (
            <div style={{
              paddingTop: 6,
              borderTop: `1px solid ${theme.colors.border}`,
            }}>
              <div style={{
                fontSize: '10px',
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontSans,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 3,
              }}>
                Honest take
              </div>
              <div style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontSans,
                fontStyle: 'italic',
                lineHeight: 1.45,
              }}>
                {topMismatch.text}
              </div>
            </div>
          )}

          {typeof wine.confidence === 'number' && wine.confidence < 70 && (
            <div style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontSans,
              letterSpacing: '0.04em',
              marginTop: 'auto',
            }}>
              Read at {wine.confidence}% — verify the label
            </div>
          )}

          {ctaLabel && onCta && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onCta() }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onCta() } }}
              style={{
                marginTop: 4,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                background: `linear-gradient(135deg, ${theme.colors.gold} 0%, ${theme.colors.goldBright} 100%)`,
                color: theme.colors.cream,
                borderRadius: theme.radius.sm,
                fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizes.sm,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              {ctaLabel} →
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
