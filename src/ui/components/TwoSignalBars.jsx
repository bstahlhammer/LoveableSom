import T from '../theme/T.js'

const TASTE_FIT_THRESHOLD = 82

function tasteFitDescriptor(score) {
  if (score >= TASTE_FIT_THRESHOLD)                        return 'Strong fit'
  if (score >= Math.round(TASTE_FIT_THRESHOLD * 0.80))     return 'Decent fit'
  if (score >= 50)                                         return 'Partial fit'
  return 'Poor fit'
}

function qualityDescriptor(wePoints) {
  if (wePoints == null) return null
  const label = wePoints >= 95 ? 'Well above average'
               : wePoints >= 90 ? 'Above average'
               : wePoints >= 85 ? 'Below average'
               : 'Well below average'
  return `${wePoints} pts · ${label}`
}

function tasteFitColor(score) {
  if (score >= TASTE_FIT_THRESHOLD)                    return T.forest500
  if (score >= Math.round(TASTE_FIT_THRESHOLD * 0.80)) return T.cobalt400
  if (score >= 50)                                     return T.ochre500
  return T.scarlet500
}

function qualityColor(wePoints) {
  if (wePoints == null) return T.ink300
  if (wePoints >= 95)   return T.forest500
  if (wePoints >= 90)   return T.cobalt400
  if (wePoints >= 85)   return T.ochre500
  return T.scarlet500
}

function qualityBarPct(wePoints) {
  if (wePoints == null) return 50
  return Math.max(0, Math.min(100, (wePoints - 80) * 5))
}

function SignalRow({ label, barPct, descriptor, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: T.ink400, fontFamily: T.fontBody, minWidth: 62, flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 4, background: T.ink100, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${barPct}%`,
          background: color, borderRadius: 2, transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{
        fontSize: 9, fontWeight: 600, color, fontFamily: T.fontBody,
        minWidth: 76, textAlign: 'right', flexShrink: 0,
      }}>
        {descriptor}
      </span>
    </div>
  )
}

export default function TwoSignalBars({ tasteFit, wePoints, confidenceLevel }) {
  const hasTasteFit = typeof tasteFit === 'number'
  const tfScore = hasTasteFit ? Math.max(0, Math.min(100, tasteFit)) : 50

  if (!hasTasteFit && wePoints == null) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {hasTasteFit && (
        <SignalRow
          label="Taste Fit"
          barPct={tfScore}
          descriptor={tasteFitDescriptor(tfScore)}
          color={tasteFitColor(tfScore)}
        />
      )}
      {wePoints != null && (
        <SignalRow
          label="Quality"
          barPct={qualityBarPct(wePoints)}
          descriptor={qualityDescriptor(wePoints)}
          color={qualityColor(wePoints)}
        />
      )}
      {hasTasteFit && confidenceLevel === 'closest' && (
        <div style={{ marginTop: 2 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
            background: T.cobalt100, color: T.cobalt600,
            letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.fontBody,
          }}>
            Closest Available
          </span>
        </div>
      )}
    </div>
  )
}
