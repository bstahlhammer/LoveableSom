import { useEffect, useState } from 'react'
import T from '../theme/T.js'
import { useScanHistory } from '../hooks/useScanHistory.js'
import { useWineRatings } from '../hooks/useWineRatings.js'
import { useScanFeedback } from '../hooks/useScanFeedback.js'
import { formatScanLabel } from '../utils/formatScan.js'
import { WineRatingRow } from '../components/WineRatingRow.jsx'

export default function ScanReviewScreen({ scan, wines = [], goBack, onSaved, onToast }) {
  const [ratings, setRatings] = useState({})
  const [photoUrl, setPhotoUrl] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [rateMode, setRateMode] = useState(false)

  const { getPhotoUrl } = useScanHistory()
  const { saveRating } = useWineRatings()
  const { submitFeedback } = useScanFeedback()

  useEffect(() => {
    let cancelled = false
    if (scan?.photo_path) {
      ;(async () => {
        const url = await getPhotoUrl(scan.photo_path)
        if (!cancelled) setPhotoUrl(url)
      })()
    }
    return () => { cancelled = true }
  }, [scan?.photo_path, getPhotoUrl])

  async function handleSave() {
    setSaving(true)
    const wineById = Object.fromEntries(wines.map((w, idx) => [w.id ?? `${scan?.id}-${idx}`, w]))
    const entries = Object.entries(ratings)
    for (const [wineId, rating] of entries) {
      await saveRating({ wineId, stars: rating.stars, tasteMatch: rating.tasteMatch, wine: wineById[wineId] || null })
    }
    setSaving(false)
    onToast?.(entries.length ? `Saved ${entries.length} rating${entries.length === 1 ? '' : 's'}` : 'Scan saved')
    onSaved?.()
  }

  async function handleFeedbackSubmit() {
    await submitFeedback({ scanId: scan?.id, reason: 'none_match', note: feedbackNote.trim() || null })
    setFeedbackOpen(false)
    setFeedbackNote('')
    onToast?.('Thanks, your feedback helps us improve.')
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.ink0, fontFamily: T.fontBody, color: T.ink900,
    }}>
      {/* Status bar spacer */}
      <div style={{ height: 44 }}/>

      {/* Header */}
      <div style={{ padding: '10px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 18, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.fontBody }}>
          ← Retake
        </button>
        <span style={{ fontSize: 12, color: T.ink400 }}>
          {wines.length > 0 ? `Step 2 of 3 · Review` : 'Review scan'}
        </span>
      </div>

      <div style={{ padding: '8px 24px 14px', flexShrink: 0 }}>
        <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 26, lineHeight: 1.1, margin: '0 0 4px', letterSpacing: '-0.01em', color: T.ink900 }}>
          We read <em style={{ color: T.forest500 }}>{wines.length} wine{wines.length === 1 ? '' : 's'}</em>. Anything off?
        </h1>
        <p style={{ fontSize: 13, color: T.ink400, margin: 0, lineHeight: 1.45 }}>
          {formatScanLabel(scan) || 'Your scan'}{scan?.place_address ? ` · ${scan.place_address}` : ''}
        </p>
      </div>

      {/* Scan photo thumbnail */}
      {photoUrl && (
        <div style={{ padding: '0 24px 12px', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            width: 52, height: 66, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
            border: `1px solid ${T.ink150}`, background: T.ink100,
          }}>
            <img src={photoUrl} alt="Scan photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: T.ink600, fontWeight: 600 }}>{scan?.created_at ? new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent scan'}</div>
            <div style={{ fontSize: 12, color: T.forest500, marginTop: 2 }}>{wines.length} wine{wines.length === 1 ? '' : 's'} detected</div>
          </div>
        </div>
      )}

      {/* Wine list */}
      <div className="hide-scrollbar" style={{
        flex: '1 1 0', minHeight: 0, overflowY: 'auto', touchAction: 'pan-y',
        padding: '0 18px',
      }}>
        {wines.length === 0 ? (
          <div style={{
            padding: 24, textAlign: 'center', background: 'white',
            border: `1px solid ${T.ink150}`, borderRadius: 14,
            fontFamily: T.fontBody, fontSize: 13, color: T.ink400,
          }}>
            No wines found in this scan.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wines.map((w, idx) => {
              const wid = w.id ?? `${scan?.id}-${idx}`
              const confDot = typeof w.confidence === 'number'
                ? (w.confidence >= 85 ? T.lime400 : w.confidence >= 70 ? T.ochre400 : T.scarlet400)
                : T.lime400
              return (
                <div key={wid} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                  borderBottom: `1px solid ${T.ink100}`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                    background: confDot, color: confDot === T.lime400 ? T.ink900 : 'white',
                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {confDot === T.scarlet400 ? '!' : '✓'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: T.ink800, fontWeight: 500, lineHeight: 1.3 }}>{w.name}</div>
                    {w.vintage && <div style={{ fontSize: 11, color: T.ink400, marginTop: 1 }}>{w.vintage}</div>}
                    {typeof w.confidence === 'number' && w.confidence < 70 && (
                      <div style={{ fontSize: 10, color: T.scarlet600, marginTop: 2 }}>Low confidence, please verify</div>
                    )}
                  </div>
                  {rateMode && (
                    <WineRatingRow
                      wine={w}
                      savedRating={ratings[wid] || null}
                      onRate={(r) => setRatings(prev => ({ ...prev, [wid]: r }))}
                      onDark={false}
                      compact
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Rate toggle — opt-in, only shown when wines exist */}
        {wines.length > 0 && (
          <div style={{ padding: '4px 0 2px', textAlign: 'center' }}>
            <button
              onClick={() => setRateMode(r => !r)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: rateMode ? T.ink400 : T.forest500,
                fontFamily: T.fontBody, fontSize: 12,
                textDecoration: 'underline', textUnderlineOffset: '3px',
                padding: '6px 0',
              }}
            >
              {rateMode
                ? '← Hide ratings'
                : 'Already tried some of these? Rate them →'}
            </button>
          </div>
        )}

        {/* Feedback link */}
        <div style={{ padding: '12px 0 6px' }}>
          {!feedbackOpen ? (
            <button
              onClick={() => setFeedbackOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: T.ink400, fontFamily: T.fontBody, fontSize: 12,
                textDecoration: 'underline', textUnderlineOffset: '3px',
                padding: '4px 0', display: 'block', width: '100%', textAlign: 'center',
              }}
            >
              None of these match what I saw
            </button>
          ) : (
            <div style={{
              padding: 14, background: T.scarlet100, border: `1px solid ${T.scarlet300}`,
              borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink700, lineHeight: 1.4 }}>
                Sorry about that. Your feedback helps us read labels better.
              </div>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Optional: what did the wines actually say?"
                rows={3}
                style={{
                  width: '100%', padding: 10, fontFamily: T.fontBody, fontSize: 13,
                  borderRadius: 10, border: `1px solid ${T.ink150}`, resize: 'vertical', boxSizing: 'border-box',
                  color: T.ink800,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleFeedbackSubmit}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                    background: T.forest500, color: 'white', fontFamily: T.fontBody, fontSize: 13, fontWeight: 600,
                  }}
                >Send feedback</button>
                <button
                  onClick={() => { setFeedbackOpen(false); setFeedbackNote('') }}
                  style={{
                    padding: '10px 14px', borderRadius: 9999, border: `1px solid ${T.ink200}`, cursor: 'pointer',
                    background: 'white', color: T.ink700, fontFamily: T.fontBody, fontSize: 13,
                  }}
                >Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ height: 16 }}/>
      </div>

      {/* Footer CTA */}
      <div style={{
        flexShrink: 0, padding: '12px 22px 28px',
        borderTop: `1px solid ${T.ink100}`, background: T.ink0,
        display: 'flex', gap: 10,
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: '15px 0', borderRadius: 9999, border: 'none', cursor: saving ? 'wait' : 'pointer',
            background: T.forest500, color: 'white', fontSize: 15, fontWeight: 600, fontFamily: T.fontBody,
          }}
        >
          {saving ? 'Saving…' : `Looks good · Save${Object.keys(ratings).length > 0 ? ` & rate ${Object.keys(ratings).length}` : ''}`}
        </button>
      </div>
    </div>
  )
}
