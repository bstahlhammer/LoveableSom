import { theme } from '../theme/theme.js'
import Badge from './Badge.jsx'
import ApproachabilityDots from './ApproachabilityDots.jsx'
import MatchScore from './MatchScore.jsx'

export default function WineCard({ wine, personalized, isBestMatch, onTap }) {
  const approachability = wine.computedApproachability ?? wine.approachability ?? 3
  const matchScore      = wine.computedMatch ?? wine.match ?? 50
  const isImperfect     = personalized && matchScore < 60

  return (
    <button
      onClick={() => onTap?.(wine)}
      style={{
        width: '100%',
        backgroundColor: theme.colors.surface,
        border: isBestMatch
          ? `1.5px solid ${theme.colors.brand}`
          : `0.5px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: theme.shadows.card,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xs,
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadows.elevated }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = theme.shadows.card }}
    >
      {/* Best match overline */}
      {isBestMatch && (
        <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.brand, fontFamily: theme.typography.fontSans, fontWeight: theme.typography.weights.medium, letterSpacing: '0.08em', marginBottom: 2 }}>
          ★ YOUR BEST MATCH
        </div>
      )}

      {/* Row 1: Name + match score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, lineHeight: 1.3 }}>
            {wine.name}
          </div>
          <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginTop: 2 }}>
            {wine.vintage} · {wine.region} · {wine.price}
          </div>
        </div>
        {personalized && <MatchScore score={matchScore} />}
      </div>

      {/* Row 2: Approachability + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        <ApproachabilityDots score={approachability} />
        <Badge variant="critic" label={`${wine.rating} · ${wine.ratingLabel}`} />
        {wine.isCrowd && <Badge variant="crowd" label="Crowd Pleaser" />}
        {wine.isValue && <Badge variant="value" label="Best Value" />}
      </div>

      {/* Why it's a match (personalized only) */}
      {personalized && wine.why && (
        <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, fontStyle: 'italic', lineHeight: 1.5 }}>
          {wine.why}
        </div>
      )}

      {/* Tasting note preview (anon only) */}
      {!personalized && (
        <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, fontStyle: 'italic', lineHeight: 1.5 }}>
          {wine.tasting?.slice(0, 80)}{wine.tasting?.length > 80 ? '…' : ''}
        </div>
      )}

      {/* Imperfect match callout */}
      {isImperfect && (
        <div style={{
          marginTop: theme.spacing.xs,
          padding: '8px 10px',
          backgroundColor: '#FFF8EC',
          border: `1px solid ${theme.colors.gold}50`,
          borderRadius: theme.radius.sm,
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.warning,
          fontFamily: theme.typography.fontSans,
          lineHeight: 1.4,
        }}>
          Not a perfect match — {
            matchScore < 30
              ? 'quite different from your usual style'
              : 'outside your typical preference zone'
          }
        </div>
      )}
    </button>
  )
}
