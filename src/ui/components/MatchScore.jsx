import { useState } from 'react'
import { theme } from '../theme/theme.js'

/**
 * MatchScore — colored % chip with optional explanation tooltip.
 *
 * Props:
 *   score         — 0–100 number (required)
 *   explanation   — { headline, axes } object from explainMatch(); enables tooltip when present
 *   compact       — small variant used in tight spots like Hero card corners
 *   lowConfidence — when true, prefixes score with ~ and dims the color
 *   reason        — short string explaining why confidence is low (shown in tooltip)
 */
export default function MatchScore({ score, explanation, compact = false, lowConfidence = false, reason = null }) {
  const [open, setOpen] = useState(false)

  const baseColor =
    score >= 80 ? theme.colors.matchHigh :
    score >= 50 ? theme.colors.matchMid :
                  theme.colors.matchLow

  const color = lowConfidence ? `${baseColor}99` : baseColor

  const hasTooltip = !!(explanation?.headline || lowConfidence)

  const chip = (
    <span
      style={{
        fontSize: compact ? theme.typography.sizes.sm : theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.medium,
        fontFamily: theme.typography.fontSans,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        cursor: hasTooltip ? 'help' : 'default',
        borderBottom: hasTooltip ? `1px dotted ${color}80` : 'none',
        lineHeight: 1.2,
      }}
    >
      {lowConfidence ? `~${score}%` : `${score}%`}
      {hasTooltip && (
        <span
          style={{
            fontSize: '10px',
            opacity: 0.7,
            fontWeight: 600,
            border: `1px solid ${color}80`,
            borderRadius: '50%',
            width: 14,
            height: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          i
        </span>
      )}
    </span>
  )

  if (!hasTooltip) return chip

  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      role="button"
      aria-label={`Match score ${score}%. ${explanation.headline}`}
    >
      {chip}
      {open && (
        <span
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 10,
            width: 240,
            backgroundColor: theme.colors.brandDark,
            color: theme.colors.textOnDark,
            padding: theme.spacing.sm,
            borderRadius: theme.radius.sm,
            border: `1px solid ${theme.colors.gold}50`,
            boxShadow: theme.shadows.elevated,
            fontFamily: theme.typography.fontSans,
            fontSize: theme.typography.sizes.sm,
            lineHeight: 1.45,
            textAlign: 'left',
            textTransform: 'none',
            letterSpacing: 0,
            fontWeight: 400,
            pointerEvents: 'none',
          }}
        >
          <span style={{
            display: 'block',
            fontSize: '10px',
            color: theme.colors.gold,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Why ~{score}%
          </span>
          {lowConfidence && reason && (
            <span style={{ display: 'block', color: theme.colors.gold, opacity: 0.9, marginBottom: explanation?.headline ? 6 : 0, fontSize: theme.typography.sizes.xs }}>
              Low confidence · {reason}
            </span>
          )}
          {explanation?.headline && (
            <span style={{ display: 'block', marginBottom: explanation.axes?.length ? 4 : 0 }}>
              {explanation.headline}
            </span>
          )}
          {explanation?.axes?.length > 0 && (
            <span style={{ display: 'block', opacity: 0.85 }}>
              {explanation.axes.join(' ')}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
