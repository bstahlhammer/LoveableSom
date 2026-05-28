// Dev-only preview — not for production use
import * as Birds from './BirdIcons'

const names = [
  ['BuntingPerchRight',   'Perch Right'],
  ['BuntingPerchLeft',    'Perch Left'],
  ['BuntingFlight',       'Flight'],
  ['BuntingGlide',        'Glide'],
  ['BuntingSing',         'Sing'],
  ['BuntingLand',         'Land'],
  ['BuntingHop',          'Hop'],
  ['BuntingBranch',       'Branch'],
  ['BuntingNest',         'Nest'],
  ['BuntingDive',         'Dive'],
  ['BuntingPair',         'Pair'],
  ['BuntingSwallow',      'Swallow'],
  ['BuntingWren',         'Wren'],
  ['BuntingCardinal',     'Cardinal'],
  ['BuntingOwl',          'Owl'],
  ['BuntingDove',         'Dove'],
  ['BuntingHummingbird',  'Hummingbird'],
  ['BuntingGrape',        'Grape'],
  ['BuntingCork',         'Cork'],
  ['BuntingFeatured',     'Featured'],
]

export default function BirdIconsPreview() {
  return (
    <div style={{
      padding: 32,
      background: 'oklch(96% 0.018 148)',
      minHeight: '100vh',
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, marginBottom: 32 }}>
        Bird Icons — Painted Bunting Palette
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24 }}>
        {names.map(([key, label]) => {
          const Icon = Birds[key]
          return (
            <div key={key} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              background: 'oklch(98% 0.014 82)',
              borderRadius: 12,
              padding: '16px 8px',
              boxShadow: '0 2px 8px oklch(20% 0.05 90 / 0.08)',
            }}>
              <Icon size={64}/>
              <span style={{ fontSize: 11, color: 'oklch(42% 0.13 150)', textAlign: 'center' }}>{label}</span>
              <span style={{ fontSize: 9, color: 'oklch(50% 0.020 80)', opacity: 0.6 }}>{key}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
