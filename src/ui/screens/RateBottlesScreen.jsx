import { useState } from 'react'
import T from '../theme/T.js'
import TopBar from '../components/TopBar.jsx'
import WineRatingStep from '../components/WineRatingStep.jsx'

export default function RateBottlesScreen({ navigate, goBack, initialRatings = {}, initialAiPalate = null, initialRatedWineData = {}, onComplete }) {
  const [ratings, setRatings] = useState(initialRatings)
  const [aiPalate, setAiPalate] = useState(initialAiPalate)
  const [ratedWineData, setRatedWineData] = useState(initialRatedWineData)
  const [qualRatings, setQualRatings] = useState({})
  const ratedCount = Object.keys(ratings).length
  const hasSignal = ratedCount > 0 || !!aiPalate

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.ink0 }}>
      <TopBar onBack={goBack} onHome={() => navigate('home')} />

      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ fontSize: 10, color: T.ochre500, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          Rate bottles you know
        </div>
        <h2 style={{ fontFamily: T.fontDisplay, fontSize: 26, color: T.ink900, fontWeight: 500, lineHeight: 1.2, margin: '0 0 8px' }}>
          Tell us what you've loved (or hated)
        </h2>
        <p style={{ fontSize: 14, color: T.ink400, fontFamily: T.fontBody, lineHeight: 1.5, margin: 0 }}>
          Search any bottle by maker, grape, or region. Your palate updates live as you rate.
        </p>
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 16px', background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)` }}>
        <WineRatingStep value={ratings} onChange={setRatings} aiPalate={aiPalate} onAiPalateChange={setAiPalate} ratedWineData={ratedWineData} onRatedWineDataChange={setRatedWineData} qualRatings={qualRatings} onQualRatingsChange={setQualRatings} />
      </div>

      <div style={{ flexShrink: 0, padding: 16, borderTop: `1px solid ${T.ink150}`, display: 'flex', flexDirection: 'column', gap: 8, background: T.ink0 }}>
        <button
          onClick={() => onComplete({ wineRatings: ratings, ratedWineData, qualRatings, aiPalate })}
          disabled={!hasSignal}
          style={{
            width: '100%', padding: '16px',
            background: hasSignal ? `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)` : T.ink150,
            color: hasSignal ? 'white' : T.ink400,
            border: 'none', borderRadius: 100,
            fontSize: 14, fontWeight: 600, fontFamily: T.fontBody,
            cursor: hasSignal ? 'pointer' : 'not-allowed', letterSpacing: '0.04em',
          }}
        >
          {!hasSignal
            ? 'Rate or describe at least one wine'
            : ratedCount > 0
              ? `See my taste profile (${ratedCount} rated${aiPalate ? ' + AI' : ''})`
              : 'See my taste profile (AI describe)'}
        </button>
        <button
          onClick={() => navigate('guidedQuiz')}
          style={{ background: 'none', border: 'none', color: T.ink400, fontSize: 13, fontFamily: T.fontBody, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', padding: 4 }}
        >
          I don't know any. Guide me with questions instead
        </button>
      </div>
    </div>
  )
}
