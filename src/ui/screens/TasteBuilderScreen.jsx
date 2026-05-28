import { useMemo, useState } from 'react'
import T from '../theme/T.js'
import {
  getTasteProfiles,
  inferPalateFromRatings,
  nearestTasteProfile,
} from '@/core/api'
import WineRatingStep from '../components/WineRatingStep.jsx'
import ArchetypePicker from '../components/ArchetypePicker.jsx'
import TopBar from '../components/TopBar.jsx'

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[...Array(total)].map((_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 6, height: 6, borderRadius: 3,
          background: i <= current ? T.ochre500 : T.ink300,
          transition: 'all 240ms',
        }} />
      ))}
    </div>
  )
}

export default function TasteBuilderScreen({
  navigate, goBack,
  initialRatings = {}, initialAiPalate = null, initialArchetypeSeed = null,
  initialRatedWineData = {},
  onComplete,
}) {
  const [ratings, setRatings]             = useState(initialRatings)
  const [aiPalate, setAiPalate]           = useState(initialAiPalate)
  const [archetypeSeed, setArchetypeSeed] = useState(initialArchetypeSeed)
  const [ratedWineData, setRatedWineData] = useState(initialRatedWineData)
  const [openSection, setOpenSection]     = useState('rate')

  const ratedCount = Object.keys(ratings).length

  const preview = useMemo(() => {
    const inferredR = inferPalateFromRatings(ratings, ratedWineData)
    const sources = []
    if (inferredR.palate) sources.push({ palate: inferredR.palate, weight: inferredR.confidence })
    if (aiPalate) sources.push({ palate: aiPalate, weight: 1.5 })
    if (archetypeSeed) {
      const seed = getTasteProfiles().find(p => p.id === archetypeSeed)
      if (seed) sources.push({ palate: seed.palate, weight: 0.8 })
    }
    if (sources.length === 0) return null
    const total = sources.reduce((s, x) => s + x.weight, 0)
    const palate = { body: 0, sweetness: 0, tannin: 0, acidity: 0 }
    for (const { palate: p, weight: w } of sources) {
      palate.body      += p.body      * w
      palate.sweetness += p.sweetness * w
      palate.tannin    += p.tannin    * w
      palate.acidity   += p.acidity   * w
    }
    palate.body      = Math.round(palate.body      / total)
    palate.sweetness = Math.round(palate.sweetness / total)
    palate.tannin    = Math.round(palate.tannin    / total)
    palate.acidity   = Math.round(palate.acidity   / total)
    return { palate, archetype: nearestTasteProfile(palate) }
  }, [ratings, aiPalate, archetypeSeed])

  const hasSignal = !!preview

  const rateStatus = ratedCount > 0 || aiPalate
    ? `${aiPalate ? 'Description ✓' : ''}${aiPalate && ratedCount ? ' · ' : ''}${ratedCount ? `${ratedCount} rated` : ''}`
    : null
  const archetypeStatus = archetypeSeed
    ? getTasteProfiles().find(p => p.id === archetypeSeed)?.name
    : null

  const doneCount = [rateStatus, archetypeStatus].filter(Boolean).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.ink0, fontFamily: T.fontBody }}>
      {/* Dark branded header */}
      <div style={{ background: T.dark, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: -40, left: -30, width: 180, height: 180, borderRadius: '50%', background: T.forest500, opacity: 0.10, filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', bottom: -20, right: -20, width: 150, height: 150, borderRadius: '50%', background: T.cobalt500, opacity: 0.08, filter: 'blur(40px)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <TopBar onBack={goBack} onHome={() => navigate('home')} light />
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: T.ochre500, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Build your taste profile
              </div>
              <ProgressDots total={2} current={doneCount > 0 ? Math.min(doneCount, 1) : 0} />
            </div>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: 26, fontWeight: 500, color: T.ink100, margin: '0 0 6px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              Two ways in. Use any, or <em style={{ color: T.ochre400 }}>both</em>.
            </h1>
            <p style={{ fontSize: 13, color: T.ink300, fontFamily: T.fontBody, margin: 0, lineHeight: 1.5 }}>
              Each signal sharpens your profile. You can always come back and refine.
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable sections */}
      <div className="hide-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 0', background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)` }}>
        <Section
          number="1" title="Describe & taste"
          subtitle="Words you'd use, or specific bottles you've loved."
          status={rateStatus} open={openSection === 'rate'}
          onToggle={() => setOpenSection(openSection === 'rate' ? null : 'rate')}
        >
          <WineRatingStep value={ratings} onChange={setRatings} aiPalate={aiPalate} onAiPalateChange={setAiPalate} ratedWineData={ratedWineData} onRatedWineDataChange={setRatedWineData} />
        </Section>

        <div style={{ height: 8 }} />

        <Section
          number="2" title="Pick an archetype"
          subtitle="Tap the one that sounds most like you. A starting point, not a label."
          status={archetypeStatus} open={openSection === 'archetype'}
          onToggle={() => setOpenSection(openSection === 'archetype' ? null : 'archetype')}
        >
          <ArchetypePicker value={archetypeSeed} onChange={setArchetypeSeed} />
        </Section>

        <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
          <button
            onClick={() => navigate('guidedQuiz')}
            style={{ background: 'none', border: 'none', color: T.ink400, fontSize: 13, fontFamily: T.fontBody, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 6 }}
          >
            Want more questions? Refine with a guided Q&A
          </button>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ flexShrink: 0, padding: '12px 16px 24px', borderTop: `1px solid ${T.ink100}`, background: T.ink0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => onComplete({ wineRatings: ratings, ratedWineData, aiPalate, archetypeSeed })}
          disabled={!hasSignal}
          style={{
            width: '100%', padding: '15px',
            background: hasSignal ? `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)` : T.ink150,
            color: hasSignal ? 'white' : T.ink400,
            border: 'none', borderRadius: 100,
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
            cursor: hasSignal ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease', letterSpacing: '0.04em',
          }}
        >
          {hasSignal ? 'See my taste profile →' : 'Add at least one signal above'}
        </button>
        {!hasSignal && (
          <button
            onClick={() => navigate('home')}
            style={{ background: 'none', border: 'none', color: T.ink400, fontSize: 13, fontFamily: T.fontBody, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 4, textAlign: 'center' }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ number, title, subtitle, status, open, onToggle, children }) {
  return (
    <div style={{ border: `1px solid ${status ? T.forest300 : T.ink150}`, borderRadius: 14, background: 'white', overflow: 'hidden', boxShadow: T.shadowMd }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: status ? `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)` : T.ink100,
          color: status ? 'white' : T.ink400,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.fontBody, fontSize: 13, fontWeight: 700,
        }}>
          {status ? '✓' : number}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 17, color: T.ink900, lineHeight: 1.2, fontWeight: 500 }}>
            {title}
          </div>
          <div style={{ fontFamily: T.fontBody, fontSize: 12, color: status ? T.forest500 : T.ink400, lineHeight: 1.4, marginTop: 2 }}>
            {status || subtitle}
          </div>
        </div>
        <div style={{ color: T.ink400, fontSize: 13, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▾</div>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${T.ink100}` }}>
          <div style={{ paddingTop: 12 }}>{children}</div>
        </div>
      )}
    </div>
  )
}
