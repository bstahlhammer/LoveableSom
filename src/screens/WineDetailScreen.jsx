import { useState } from 'react'
import { theme } from '../theme/theme.js'
import Badge from '../components/Badge.jsx'
import ApproachabilityDots from '../components/ApproachabilityDots.jsx'
import MatchScore from '../components/MatchScore.jsx'
import ScoreBar from '../components/ScoreBar.jsx'
import FoodPairingChip from '../components/FoodPairingChip.jsx'
import TopBar from '../components/TopBar.jsx'
import { computeApproachability } from '../engine/approachabilityEngine.js'

const RATINGS = [
  { emoji: '❤️', label: 'Love it' },
  { emoji: '👍', label: 'Pretty good' },
  { emoji: '🤷', label: 'Not sure' },
  { emoji: '👎', label: 'Not for me' },
]

const RETAILER_LABELS = {
  costco:      'Costco',
  trader_joes: "Trader Joe's",
  whole_foods: 'Whole Foods',
  grocery:     'Grocery stores',
  restaurant:  'Restaurants',
  wine_shop:   'Wine shops',
}

function palateDescriptor(axis, value) {
  if (axis === 'body')      return value >= 75 ? 'Full' : value >= 50 ? 'Medium' : 'Light'
  if (axis === 'sweetness') return value >= 60 ? 'Sweet' : value >= 35 ? 'Off-dry' : value >= 15 ? 'Dry' : 'Bone dry'
  if (axis === 'tannin')    return value >= 75 ? 'High' : value >= 45 ? 'Medium' : 'Low'
  if (axis === 'acidity')   return value >= 65 ? 'High' : value >= 45 ? 'Medium' : 'Low'
  return ''
}

export default function WineDetailScreen({ goBack, navigate, wine, tasteProfile, onRate }) {
  const [orderedNotif, setOrderedNotif] = useState(false)

  if (!wine) return null

  const approachability = computeApproachability(wine)
  const matchScore = wine.computedMatch ?? wine.match ?? null
  const isHighlyRated = wine.rating >= 90

  function handleOrdered() {
    setOrderedNotif(true)
    setTimeout(() => setOrderedNotif(false), 3000)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.surface }}>
      {/* Top panel */}
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />

        <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg} ${theme.spacing.xl}` }}>
          <h1
            style={{
              fontFamily: theme.typography.fontSerif,
              fontSize: theme.typography.sizes.xxl,
              fontWeight: theme.typography.weights.normal,
              color: theme.colors.cream,
              lineHeight: 1.2,
              marginBottom: theme.spacing.xs,
            }}
          >
            {wine.name}
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}80`, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.md }}>
            {wine.vintage} · {wine.region} · {wine.grape} · {wine.price}
          </p>

          <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge variant="critic" label={`${wine.rating} · ${wine.ratingLabel}`} />
            {matchScore !== null && tasteProfile && <MatchScore score={matchScore} />}
            {wine.isCrowd && <Badge variant="crowd" label="Crowd Pleaser" />}
            {wine.isValue && <Badge variant="value" label="Best Value" />}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.lg }}>
        {/* Tasting notes */}
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.sm }}>
            Tasting notes
          </h2>
          <p style={{ fontSize: theme.typography.sizes.md, color: theme.colors.text, fontFamily: theme.typography.fontSans, lineHeight: 1.7, fontStyle: 'italic' }}>
            {wine.tasting}
          </p>
        </section>

        {/* Approachability */}
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.sm }}>
            Approachability
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <ApproachabilityDots score={approachability} />
            <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
              {approachability >= 5 ? 'Anyone will love it' :
               approachability >= 4 ? 'Broadly approachable' :
               approachability >= 3 ? 'Wine-curious crowd' :
               approachability >= 2 ? 'For wine lovers' :
               'For bold palates only'}
            </span>
          </div>
        </section>

        {/* Why it's a match */}
        {tasteProfile && wine.why && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <h2 style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.sm }}>
              Why it's a match for you
            </h2>
            <p style={{ fontSize: theme.typography.sizes.md, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, lineHeight: 1.7, fontStyle: 'italic' }}>
              {wine.why}
            </p>
          </section>
        )}

        {/* Style profile */}
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.md }}>
            Style profile
          </h2>
          <ScoreBar label="Body"      value={wine.body}      descriptor={palateDescriptor('body',      wine.body)} />
          <ScoreBar label="Sweetness" value={wine.sweetness} descriptor={palateDescriptor('sweetness', wine.sweetness)} />
          <ScoreBar label="Tannin"    value={wine.tannin}    descriptor={palateDescriptor('tannin',    wine.tannin)} />
          <ScoreBar label="Acidity"   value={wine.acidity}   descriptor={palateDescriptor('acidity',   wine.acidity)} />
        </section>

        {/* Food pairings */}
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.sm }}>
            Food pairings
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {wine.pairings.map(p => (
              <FoodPairingChip key={p} pairing={p} />
            ))}
          </div>
        </section>

        {/* Where to find it */}
        {wine.retailers && wine.retailers.length > 0 && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <h2 style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.medium, color: theme.colors.text, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.sm }}>
              Where to find it
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
              {wine.retailers.map(r => (
                <span
                  key={r}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: theme.colors.barTrack,
                    borderRadius: theme.radius.pill,
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text,
                    fontFamily: theme.typography.fontSans,
                  }}
                >
                  {RETAILER_LABELS[r] ?? r}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Order online CTA */}
        {isHighlyRated && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <button
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: theme.colors.brand,
                color: theme.colors.cream,
                border: 'none',
                borderRadius: theme.radius.md,
                fontSize: theme.typography.sizes.md,
                fontFamily: theme.typography.fontSans,
                fontWeight: theme.typography.weights.medium,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>🛒</span>
              <span>Order online</span>
            </button>
          </section>
        )}
      </div>

      {/* Sticky footer */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `0.5px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.surface,
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
        }}
      >
        {/* "I ordered this" button + notification */}
        <button
          onClick={handleOrdered}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: theme.spacing.sm,
            backgroundColor: orderedNotif ? `${theme.colors.gold}20` : 'transparent',
            border: `0.5px solid ${orderedNotif ? theme.colors.gold : theme.colors.border}`,
            borderRadius: theme.radius.sm,
            fontSize: theme.typography.sizes.sm,
            fontFamily: theme.typography.fontSans,
            color: orderedNotif ? theme.colors.gold : theme.colors.textMuted,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {orderedNotif ? (
            <>
              <span>🔔</span>
              <span>Got it! We'll remind you to rate this wine.</span>
            </>
          ) : (
            <>
              <span>🍾</span>
              <span>I ordered this wine</span>
            </>
          )}
        </button>

        <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, textAlign: 'center', marginBottom: theme.spacing.sm }}>
          What did you think of this wine?
        </p>
        <div style={{ display: 'flex', gap: theme.spacing.xs }}>
          {RATINGS.map(r => (
            <button
              key={r.label}
              onClick={() => onRate(r.label)}
              style={{
                flex: 1,
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                backgroundColor: 'transparent',
                border: `0.5px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              <span>{r.emoji}</span>
              <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
