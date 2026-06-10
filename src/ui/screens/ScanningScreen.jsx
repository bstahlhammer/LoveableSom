import { useEffect, useRef, useState, useMemo } from 'react'
import T from '../theme/T.js'
import { useScan } from '../hooks/useScan.js'
import { WINE_FACTS } from '../data/wineFacts.js'

const ANTICIPATION_STEPS = [
  'Cutting the foil…',
  'Easing out the cork…',
  'Letting the list breathe…',
  'Swirling the first clues…',
  'Catching the aroma…',
  'Tasting for vintages…',
  'Decanting the details…',
  'Pouring the shortlist…',
]

const BUYING_FOR = [
  { id: 'me',    label: 'Just me' },
  { id: 'group', label: 'A group' },
  { id: 'gift',  label: 'A gift' },
]

const INTENT_TAGS = [
  { id: 'crowd',   label: 'Crowd pleaser' },
  { id: 'unique',  label: 'Unique & interesting' },
  { id: 'splurge', label: 'A splurge' },
  { id: 'maker',   label: 'A specific maker' },
  { id: 'region',  label: 'A specific region' },
  { id: 'varietal',label: 'A specific varietal' },
]

export default function ScanningScreen({
  navigate,
  goBack,
  file,
  buyingFor,
  onBuyingForChange,
  scanIntent,
  onScanIntentChange,
  tasteProfile,
  onScanComplete,
}) {
  const [scannedWines, setScannedWines] = useState([])
  const totalBottles = scannedWines.length
  const uniqueWines = new Set(scannedWines.map(w => (w.name || '').toLowerCase().trim()).filter(Boolean)).size
  const [status, setStatus] = useState(file ? ANTICIPATION_STEPS[0] : 'Pouring the shortlist…')
  const [thumbUrl, setThumbUrl] = useState(null)
  const [factIdx, setFactIdx] = useState(() => Math.floor(Math.random() * WINE_FACTS.length))
  const [scanDone, setScanDone] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const pendingNavRef = useRef(null)
  const { scanImage } = useScan()
  const callbacksRef = useRef({ navigate, onScanComplete })
  callbacksRef.current = { navigate, onScanComplete }

  const hasProfile = !!tasteProfile
  const scanFailed = scanDone && !!file && totalBottles === 0

  useEffect(() => {
    if (!file) { setThumbUrl(null); return }
    const url = URL.createObjectURL(file)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (scanDone) return
    const t = setInterval(() => {
      setFactIdx(i => (i + 1) % WINE_FACTS.length)
    }, 5500)
    return () => clearInterval(t)
  }, [scanDone])

  useEffect(() => {
    if (!file) {
      const t1 = setTimeout(() => setStatus('Swirling the first clues…'), 700)
      const t2 = setTimeout(() => {
        setScannedWines([
          { name: 'Caymus Cabernet Sauvignon' }, { name: 'Jordan Cabernet Sauvignon' },
          { name: 'Opus One' }, { name: 'Caymus Cabernet Sauvignon' },
          { name: 'Silver Oak Cabernet' }, { name: 'Stag\'s Leap Wine Cellars' },
        ])
        setStatus('Pouring the shortlist…')
      }, 1500)
      const t3 = setTimeout(() => setStatus('Done ✓'), 2200)
      const t4 = setTimeout(() => setScanDone(true), 2400)
      return () => [t1, t2, t3, t4].forEach(clearTimeout)
    }

    let cancelled = false
    const wines = []

    let stepIndex = 0
    const progressTimer = setInterval(() => {
      if (cancelled || wines.length > 0) return
      stepIndex = (stepIndex + 1) % ANTICIPATION_STEPS.length
      setStatus(ANTICIPATION_STEPS[stepIndex])
    }, 1800)

    scanImage(
      file,
      (wine, count) => {
        if (cancelled) return
        wines.push(wine)
        setScannedWines(prev => [...prev, wine])
        setStatus('Pouring the shortlist…')
      },
      (progress) => {
        if (cancelled || !progress?.message) return
        setStatus(progress.message)
        if (progress.stage === 'enriching') setEnriching(true)
      },
    )
      .then((result) => {
        if (cancelled) return
        clearInterval(progressTimer)
        setStatus('Done ✓')
        const payload = result && typeof result === 'object' && Array.isArray(result.wines)
          ? result
          : { wines: wines, readability: wines.length ? 'good' : 'unreadable', retakeReasons: [], message: '' }
        callbacksRef.current.onScanComplete?.(payload)
        pendingNavRef.current = 'anonResults'
        setScanDone(true)
      })
      .catch((err) => {
        if (cancelled) return
        clearInterval(progressTimer)
        if (wines.length) {
          setStatus('Pouring what we found…')
          callbacksRef.current.onScanComplete?.({ wines, readability: 'partial', retakeReasons: err?.retakeReasons || [], message: err?.message || '' })
          pendingNavRef.current = 'anonResults'
          setScanDone(true)
          return
        }
        const message = err?.message || 'Could not identify a specific wine. Try a closer, sharper photo.'
        setStatus(message)
        callbacksRef.current.onScanComplete?.({ wines: [], readability: err?.readability || 'unreadable', retakeReasons: err?.retakeReasons || [], message })
        pendingNavRef.current = 'anonResults'
        setScanDone(true)
      })

    return () => {
      cancelled = true
      clearInterval(progressTimer)
    }
  }, [file, scanImage])

  useEffect(() => {
    if (!scanDone) return
    if (!buyingFor) return
    const t = setTimeout(() => {
      const dest = pendingNavRef.current || 'anonResults'
      callbacksRef.current.navigate(dest)
    }, 350)
    return () => clearTimeout(t)
  }, [scanDone, buyingFor])

  const fact = useMemo(() => WINE_FACTS[factIdx], [factIdx])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.ink0, fontFamily: T.fontBody,
      overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      {/* Painted Bunting washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '55%', height: '55%', background: T.forest100, opacity: 0.65, filter: 'blur(70px)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', top: '5%', right: '-12%', width: '50%', height: '50%', background: T.cobalt100, opacity: 0.5, filter: 'blur(80px)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '-5%', left: '-8%', width: '60%', height: '50%', background: T.scarlet100, opacity: 0.45, filter: 'blur(75px)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '5%', right: '-8%', width: '50%', height: '45%', background: T.ochre100, opacity: 0.55, filter: 'blur(70px)', borderRadius: '50%' }}/>
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '52px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={goBack}
          style={{ background: 'none', border: 'none', color: T.ink400, fontFamily: T.fontBody, fontSize: 13, cursor: 'pointer', padding: 0, letterSpacing: '0.06em' }}
        >
          {scanDone ? '← Back' : '× Cancel'}
        </button>
      </div>

      {/* Scan again */}
      {scanFailed && (
        <div style={{ position: 'relative', zIndex: 2, padding: '12px 22px 0', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={goBack}
            style={{
              padding: '10px 28px', borderRadius: 9999,
              border: `1.5px solid ${T.forest500}`,
              background: T.forest100, color: T.forest700,
              fontFamily: T.fontBody, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            Scan again
          </button>
        </div>
      )}

      {/* Scan image */}
      <div style={{ position: 'relative', zIndex: 2, padding: '20px 22px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 240, height: 180, borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadowLg,
          background: T.ink100, position: 'relative',
        }}>
          {thumbUrl ? (
            <img src={thumbUrl} alt="Your scan" style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: (scanDone || enriching) ? 'none' : 'blur(4px) saturate(0.85) brightness(0.9)',
              transition: 'filter 400ms ease',
            }}/>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, opacity: 0.4 }}>
              🍷
            </div>
          )}

          {!scanDone && !enriching && (
            <div style={{ position: 'absolute', inset: 0, background: `${T.forest500}11` }}/>
          )}

          {!scanDone && !enriching && (
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: T.lime400,
              boxShadow: `0 0 12px ${T.lime400}, 0 0 24px ${T.lime400}88`,
              animation: 'scanLine 1.6s ease-in-out infinite alternate',
              top: 8,
            }}/>
          )}

          {/* corner marks */}
          {!scanDone && !enriching && [
            { top: 8, left: 8, borderTop: `2px solid ${T.lime400}`, borderLeft: `2px solid ${T.lime400}` },
            { top: 8, right: 8, borderTop: `2px solid ${T.lime400}`, borderRight: `2px solid ${T.lime400}` },
            { bottom: 8, left: 8, borderBottom: `2px solid ${T.lime400}`, borderLeft: `2px solid ${T.lime400}` },
            { bottom: 8, right: 8, borderBottom: `2px solid ${T.lime400}`, borderRight: `2px solid ${T.lime400}` },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 12, height: 12, ...s }}/>
          ))}

          {scanDone && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22, background: T.forest500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 22,
                boxShadow: `0 0 0 6px ${T.forest500}44`,
              }}>✓</div>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={{ position: 'relative', zIndex: 2, padding: '20px 26px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 22, color: T.ink900, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
          {status}
        </div>
        {totalBottles > 0 && (
          <div style={{ fontSize: 11, color: T.forest500, fontFamily: T.fontBody, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: T.lime400, display: 'inline-block', marginRight: 5, verticalAlign: 'middle' }}/>
            {totalBottles} bottle{totalBottles === 1 ? '' : 's'} · {uniqueWines} unique wine{uniqueWines === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Enriching / matching state */}
      {enriching && !scanDone && (
        <div style={{
          position: 'relative', zIndex: 2, margin: '18px 22px 0',
          background: T.cobalt50, border: `1px solid ${T.cobalt100}`,
          borderRadius: 14, padding: '16px 18px',
          animation: 'fade-in 400ms ease-out',
          boxShadow: T.shadowMd,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.cobalt500, marginBottom: 8 }}>
            ✦ Fetching wine data
          </div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 17, color: T.ink900, lineHeight: 1.35, marginBottom: 12 }}>
            Fetching wine data for {uniqueWines} unique wine{uniqueWines === 1 ? '' : 's'}…
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: T.cobalt400,
                animation: `pulse 1.4s ease-in-out ${i * 0.25}s infinite`,
              }}/>
            ))}
          </div>
        </div>
      )}

      {/* Wine fact */}
      {<div key={factIdx} style={{
        position: 'relative', zIndex: 2, margin: '18px 22px 0',
        background: 'white', border: `1px solid ${T.ink150}`, borderRadius: 14,
        padding: '14px 16px', animation: 'fade-in 600ms ease-out',
        boxShadow: T.shadowMd,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.forest500, marginBottom: 6 }}>
          ✦ While we pour…
        </div>
        <p style={{ fontFamily: T.fontDisplay, fontSize: 15, color: T.ink800, lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
          {fact}
        </p>
      </div>}

      {/* Buying-for question */}
      <div style={{ position: 'relative', zIndex: 2, padding: '18px 22px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink400, marginBottom: 10, textAlign: 'center' }}>
          Who are you choosing for?
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {BUYING_FOR.map(opt => {
            const active = buyingFor === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => onBuyingForChange?.(opt.id)}
                style={{
                  flex: 1, padding: '11px 4px', borderRadius: 9999,
                  border: `1.5px solid ${active ? T.forest500 : T.ink200}`,
                  background: active ? T.forest100 : 'white',
                  color: active ? T.forest700 : T.ink600,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  fontFamily: T.fontBody, cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {scanDone && !buyingFor && (
          <>
            <p style={{ marginTop: 8, textAlign: 'center', fontFamily: T.fontBody, fontSize: 11, color: T.ink400 }}>
              Pick one to see your matches
            </p>
            <button
              onClick={() => { const dest = pendingNavRef.current || 'anonResults'; navigate(dest) }}
              style={{
                marginTop: 6, width: '100%', padding: '10px',
                background: 'transparent', border: `1px solid ${T.ink200}`, borderRadius: 9999,
                color: T.ink500, fontFamily: T.fontBody, fontSize: 12, cursor: 'pointer',
              }}
            >
              Skip, just show me results →
            </button>
          </>
        )}
      </div>

      {/* Intent picker */}
      {(buyingFor === 'group' || buyingFor === 'gift') && (
        <IntentPicker intent={scanIntent} onChange={onScanIntentChange}/>
      )}

      {/* No-profile invite */}
      {!hasProfile && (
        <div style={{ position: 'relative', zIndex: 2, margin: '18px 22px 28px' }}>
          <button
            onClick={() => navigate('quizIntro')}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
              background: T.forest50, border: `1px dashed ${T.forest300}`,
              color: T.forest700, fontFamily: T.fontBody, fontSize: 13, textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.forest500, marginBottom: 3 }}>New here?</div>
              <div>Build your taste profile for better matches →</div>
            </div>
            <span style={{ color: T.forest500, fontSize: 18 }}>→</span>
          </button>
        </div>
      )}

      <div style={{ height: 32 }}/>
    </div>
  )
}

function IntentPicker({ intent, onChange }) {
  const tags = intent?.tags || []
  const toggle = (id) => {
    const has = tags.includes(id)
    const nextTags = has ? tags.filter(t => t !== id) : [...tags, id].slice(-2)
    onChange?.({ ...(intent || {}), tags: nextTags })
  }
  const setField = (key, value) => onChange?.({ ...(intent || {}), tags, [key]: value })

  return (
    <div style={{ position: 'relative', zIndex: 2, padding: '14px 22px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink400, marginBottom: 8, textAlign: 'center' }}>
        What are you looking for? <span style={{ opacity: 0.6 }}>(pick up to 2)</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {INTENT_TAGS.map(opt => {
          const active = tags.includes(opt.id)
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              style={{
                padding: '7px 12px', borderRadius: 9999, fontFamily: T.fontBody,
                border: `1px solid ${active ? T.forest500 : T.ink200}`,
                background: active ? T.forest100 : 'white',
                color: active ? T.forest700 : T.ink500,
                fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
              }}
            >
              {active ? '✓ ' : '+ '}{opt.label}
            </button>
          )
        })}
      </div>
      {tags.includes('maker') && (
        <IntentInput placeholder="Which maker?" value={intent?.maker || ''} onChange={v => setField('maker', v)}/>
      )}
      {tags.includes('region') && (
        <IntentInput placeholder="Which region?" value={intent?.region || ''} onChange={v => setField('region', v)}/>
      )}
      {tags.includes('varietal') && (
        <IntentInput placeholder="Which varietal or blend?" value={intent?.varietal || ''} onChange={v => setField('varietal', v)}/>
      )}
    </div>
  )
}

function IntentInput({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        marginTop: 8, width: '100%', padding: '10px 12px', borderRadius: 10,
        border: `1.5px solid ${T.ink150}`, background: 'white',
        color: T.ink800, fontFamily: T.fontBody, fontSize: 13, outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  )
}
