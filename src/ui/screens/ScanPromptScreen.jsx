import { useRef, useState } from 'react'
import T from '../theme/T.js'
import winebirdMark from '@/assets/winebird-mark.png'

const OCCASION_TILES = [
  { icon: '🍝', label: 'Pasta night',  intent: { tags: [],          label: 'Pasta night 🍝'  }, hint: null },
  { icon: '🥩', label: 'Steakhouse',   intent: { tags: [],          label: 'Steakhouse 🥩'   }, hint: null },
  { icon: '🐟', label: 'Light & fresh', intent: { tags: ['crowd'],  label: 'Light & fresh 🐟' }, hint: 'Easy-drinking crowd-pleasers ranked first' },
  { icon: '🧀', label: 'Cheese board', intent: { tags: ['crowd'],   label: 'Cheese board 🧀'  }, hint: 'Broadly-loved wines ranked first' },
  { icon: '🛋️', label: 'Solo unwind', intent: { tags: ['crowd'],   label: 'Solo unwind 🛋️'  }, hint: 'Easy-drinking picks ranked first' },
  { icon: '🎉', label: 'Celebrating',  intent: { tags: ['splurge'], label: 'Celebrating 🎉'   }, hint: 'Top-rated, best-value wines ranked first' },
]

export default function ScanPromptScreen({ navigate, goBack, onScan, tasteProfile }) {
  const fileRef = useRef(null)
  const [selectedOccasion, setSelectedOccasion] = useState(null)

  const pick = () => fileRef.current?.click()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onScan?.(file, selectedOccasion?.intent ?? null)
    navigate('scanning')
    e.target.value = ''
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.ink0, fontFamily: T.fontBody, overflow: 'hidden',
    }}>
      {/* Watercolor washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-12%', width: '60%', height: '50%', background: T.forest100, opacity: 0.6, filter: 'blur(70px)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '50%', height: '45%', background: T.cobalt100, opacity: 0.5, filter: 'blur(80px)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '-5%', right: '-8%', width: '55%', height: '45%', background: T.ochre100, opacity: 0.55, filter: 'blur(70px)', borderRadius: '50%' }}/>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }}/>

      {/* Nav */}
      <div style={{ position: 'relative', zIndex: 2, padding: '52px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 18, cursor: 'pointer', padding: 0 }}>
          ←
        </button>
        <img src={winebirdMark} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }}/>
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 2, padding: '20px 26px 14px' }}>
        <p style={{ fontSize: 11, color: T.forest500, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Scan</p>
        <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 30, lineHeight: 1.05, margin: '8px 0 8px', letterSpacing: '-0.015em', color: T.ink900 }}>
          Show me the <em style={{ color: T.forest500 }}>wine</em>.
        </h1>
        <p style={{ fontSize: 14, color: T.ink400, margin: 0, lineHeight: 1.5 }}>
          A wine list, store shelf, or single bottle. We'll match it to your taste.
        </p>
      </div>

      {/* Occasion picker */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 22px 14px' }}>
        <p style={{ fontSize: 11, color: T.ink400, margin: '0 0 8px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
          Tonight's vibe (optional)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {OCCASION_TILES.map((o, i) => {
            const isSelected = selectedOccasion?.label === o.label
            return (
              <button
                key={i}
                onClick={() => setSelectedOccasion(isSelected ? null : o)}
                style={{
                  padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  border: `1px solid ${isSelected ? T.cobalt400 : T.ink150}`,
                  background: isSelected ? T.cobalt50 : 'white',
                  borderRadius: 12, fontFamily: T.fontBody, cursor: 'pointer', textAlign: 'left',
                  position: 'relative',
                  transition: 'border-color 0.12s, background 0.12s',
                }}
              >
                <span style={{ fontSize: 17 }}>{o.icon}</span>
                <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? T.cobalt500 : T.ink800 }}>
                  {o.label}
                </span>
                {isSelected && (
                  <span style={{
                    position: 'absolute', top: 6, right: 8,
                    fontSize: 10, color: T.cobalt500, fontWeight: 700,
                  }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
        {selectedOccasion?.hint && (
          <div style={{
            marginTop: 8, padding: '7px 12px',
            background: T.cobalt50, border: `1px solid ${T.cobalt300}`,
            borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 11, color: T.cobalt500 }}>✦</span>
            <span style={{ fontSize: 12, color: T.cobalt500, fontFamily: T.fontBody }}>
              {selectedOccasion.hint}
            </span>
          </div>
        )}
      </div>

      {/* Tips */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 22px', flex: 1 }}>
        <div style={{ background: T.forest50, border: `1px solid ${T.forest300}`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.forest700, marginBottom: 8 }}>
            For best results
          </div>
          {[
            'Fill the frame so labels are large and readable',
            'Good light makes all the difference',
            'For long lists, shoot one section at a time',
            'Tilt the page away from reflections',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
              <span style={{ color: T.forest500, flexShrink: 0 }}>·</span>
              <span style={{ fontSize: 13, color: T.forest700, lineHeight: 1.4 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'relative', zIndex: 2, padding: '14px 22px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={pick}
          style={{
            width: '100%', padding: '18px 0', borderRadius: 9999, border: 'none', cursor: 'pointer',
            background: `linear-gradient(180deg, ${T.cobalt400} 0%, ${T.cobalt500} 100%)`,
            color: 'white', fontSize: 15, fontWeight: 600, fontFamily: T.fontBody,
            letterSpacing: '0.04em',
            boxShadow: `0 6px 20px ${T.cobalt500}44`,
          }}
        >
          Take or upload a photo
        </button>

        {!tasteProfile && (
          <button
            onClick={() => navigate('quizIntro')}
            style={{
              background: 'none', border: 'none', color: T.forest500,
              fontSize: 13, fontFamily: T.fontBody, cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: '3px',
              alignSelf: 'center', padding: '4px 0',
            }}
          >
            Build my taste profile first →
          </button>
        )}
      </div>
    </div>
  )
}
