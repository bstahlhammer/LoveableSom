import { useEffect, useMemo, useState } from 'react'
import T from '../theme/T.js'
import {
  getWineSearchIndex,
  getRatingBuckets,
  inferPalateFromRatings,
  nearestTasteProfile,
  describePalateFromText,
  searchWineCatalog,
  findWineOnWeb,
} from '@/core/api'

export default function WineRatingStep({
  value = {},
  onChange,
  aiPalate = null,
  onAiPalateChange,
  ratedWineData = {},
  onRatedWineDataChange,
  qualRatings = {},
  onQualRatingsChange,
}) {
  const [query, setQuery] = useState('')
  const [catalogResults, setCatalogResults] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [webResult, setWebResult] = useState(null)
  const [webLoading, setWebLoading] = useState(false)

  const buckets = getRatingBuckets()
  const searchIndex = getWineSearchIndex()

  const wineById = useMemo(
    () => Object.fromEntries(searchIndex.map(w => [w.id, w])),
    [searchIndex]
  )

  // Local instant results
  const localResults = query.length >= 1
    ? searchIndex.filter(w => {
        if (value[w.id]) return false
        const q = query.toLowerCase()
        return (
          w.name.toLowerCase().includes(q) ||
          w.grape.toLowerCase().includes(q) ||
          w.region.toLowerCase().includes(q)
        )
      }).slice(0, 5)
    : []

  // Debounced catalog search
  useEffect(() => {
    if (query.length < 2) {
      setCatalogResults([])
      setCatalogLoading(false)
      return
    }
    setCatalogLoading(true)
    const localNameSet = new Set(
      searchIndex.map(w => w.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    )
    const timer = setTimeout(async () => {
      try {
        const hits = await searchWineCatalog(query, { limit: 6 })
        const deduped = hits.filter(w => {
          if (value[w.id]) return false
          const norm = String(w.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          return !localNameSet.has(norm)
        })
        setCatalogResults(deduped.slice(0, 5))
      } catch {
        setCatalogResults([])
      } finally {
        setCatalogLoading(false)
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      setCatalogLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Clear web result when query changes
  useEffect(() => { setWebResult(null) }, [query])

  const allResults = [...localResults, ...catalogResults]
  const showWebSearch =
    query.length >= 3 && !catalogLoading && allResults.length < 2 && !webResult && !webLoading

  async function handleWebSearch() {
    setWebLoading(true)
    try {
      const { wine } = await findWineOnWeb(query)
      setWebResult(wine || null)
    } catch {
      setWebResult(null)
    } finally {
      setWebLoading(false)
    }
  }

  // ratedEntries resolves from both local search index and external wine data
  const ratedEntries = Object.entries(value)
    .map(([id, bucketId]) => {
      const numId = Number(id)
      const localWine = !Number.isNaN(numId) ? wineById[numId] : null
      const wine = localWine || ratedWineData[id] || null
      return { wine, wineId: id, bucketId }
    })
    .filter(e => e.wine)

  const ratingsInference = useMemo(
    () => inferPalateFromRatings(value, ratedWineData),
    [value, ratedWineData]
  )
  const inference = useMemo(
    () => blendWithAi(ratingsInference, aiPalate),
    [ratingsInference, aiPalate]
  )
  const archetype = useMemo(
    () => (inference.ratedCount > 0 || aiPalate ? nearestTasteProfile(inference.palate) : null),
    [inference, aiPalate]
  )

  function setRating(wineId, bucketId, wineRecord = null) {
    onChange({ ...value, [String(wineId)]: bucketId })
    setQuery('')
    setCatalogResults([])
    setWebResult(null)
    if (wineRecord && onRatedWineDataChange) {
      onRatedWineDataChange({
        ...ratedWineData,
        [String(wineId)]: {
          body:      wineRecord.body      ?? 50,
          tannin:    wineRecord.tannin    ?? 40,
          sweetness: wineRecord.sweetness ?? 30,
          acidity:   wineRecord.acidity   ?? 55,
          name:      wineRecord.name,
          grape:     wineRecord.grape     || null,
          region:    wineRecord.region    || null,
          vintage:   wineRecord.vintage   || null,
        },
      })
    }
  }

  function changeRating(wineId, bucketId) {
    onChange({ ...value, [String(wineId)]: bucketId })
  }

  function removeRating(wineId) {
    const next = { ...value }
    delete next[String(wineId)]
    onChange(next)
    if (ratedWineData[String(wineId)] && onRatedWineDataChange) {
      const nextData = { ...ratedWineData }
      delete nextData[String(wineId)]
      onRatedWineDataChange(nextData)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
      <DescribeStep aiPalate={aiPalate} onAiPalateChange={onAiPalateChange} />

      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.ink400, fontSize: 16 }}>🔍</span>
        <input
          type="text"
          placeholder="Search by maker, grape, vintage, or region…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '12px 12px 12px 36px',
            border: `1px solid ${T.ink150}`, borderRadius: 8,
            fontSize: 14, fontFamily: T.fontBody, color: T.ink900,
            outline: 'none', background: 'white', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Results dropdown */}
      {(allResults.length > 0 || webResult || catalogLoading || showWebSearch || webLoading) && (
        <div style={{ border: `1px solid ${T.ink150}`, borderRadius: 8, overflow: 'hidden', boxShadow: T.shadowLg, background: 'white' }}>
          {localResults.map((wine, i) => (
            <SearchResultRow key={wine.id} wine={wine} first={i === 0} source="local"
              buckets={buckets} onPick={b => setRating(wine.id, b)} />
          ))}
          {catalogResults.map((wine, i) => (
            <SearchResultRow key={wine.id} wine={wine} first={i === 0 && localResults.length === 0} source="catalog"
              buckets={buckets} onPick={b => setRating(wine.id, b, wine)} />
          ))}
          {webResult && (
            <SearchResultRow wine={webResult} first={allResults.length === 0} source="web"
              buckets={buckets} onPick={b => setRating(webResult.id, b, webResult)} />
          )}
          {catalogLoading && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>
              Searching catalog…
            </div>
          )}
          {webLoading && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>
              Looking up "{query}"…
            </div>
          )}
          {showWebSearch && (
            <button
              onClick={handleWebSearch}
              style={{
                width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                borderTop: allResults.length > 0 ? `0.5px solid ${T.ink150}` : 'none',
                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>🌐</span>
              <span style={{ fontSize: 13, color: T.cobalt500, fontFamily: T.fontBody }}>
                Can't find "{query}"? Let us look it up
              </span>
            </button>
          )}
        </div>
      )}

      {ratedEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionLabel>Your ratings</SectionLabel>
          {ratedEntries.map(({ wine, wineId, bucketId }) => (
            <RatedWineRow key={wineId} wine={wine} bucketId={bucketId} buckets={buckets}
              onChange={b => changeRating(wineId, b)} onRemove={() => removeRating(wineId)}
              qual={qualRatings[wineId] || {}}
              onQualChange={update => onQualRatingsChange?.({ ...qualRatings, [wineId]: { ...(qualRatings[wineId] || {}), ...update } })}
            />
          ))}
        </div>
      )}

      <PalatePreview inference={inference} archetype={archetype} hasAiSignal={!!aiPalate} />

      {ratedEntries.length === 0 && query.length === 0 && (
        <p style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody, textAlign: 'center', margin: 0 }}>
          Search any wine you've tried — even just one helps shape your palate.
        </p>
      )}
    </div>
  )
}

function SearchResultRow({ wine, first, source, buckets, onPick }) {
  const [expanded, setExpanded] = useState(false)
  const sourceBadge = source === 'catalog'
    ? { label: 'catalog', color: T.cobalt500 }
    : source === 'web'
    ? { label: 'AI found', color: T.ochre500 }
    : null
  return (
    <div style={{ borderTop: first ? 'none' : `0.5px solid ${T.ink150}` }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 14, color: T.ink900, fontFamily: T.fontBody }}>
            {wine.name} <span style={{ color: T.ink400 }}>{wine.vintage}</span>
          </span>
          {sourceBadge && (
            <span style={{ fontSize: 10, color: sourceBadge.color, fontFamily: T.fontBody, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
              {sourceBadge.label}
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>
          {[wine.grape, wine.region].filter(Boolean).join(' · ')}
        </span>
      </button>
      {expanded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px 12px' }}>
          {buckets.map(b => (
            <button key={b.id} onClick={() => onPick(b.id)} style={bucketButtonStyle(b, false)}>
              <span>{b.emoji}</span><span>{b.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RatedWineRow({ wine, bucketId, buckets, onChange, onRemove, qual = {}, onQualChange }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${T.ink150}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: T.ink900, fontFamily: T.fontBody, fontWeight: 500 }}>
            {wine.name} <span style={{ color: T.ink400, fontWeight: 400 }}>{wine.vintage}</span>
          </div>
          <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>
            {[wine.grape, wine.region].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', color: T.ink300, fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 4 }} aria-label="Remove rating">×</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {buckets.map(b => (
          <button key={b.id} onClick={() => onChange(b.id)} style={bucketButtonStyle(b, b.id === bucketId)}>
            <span>{b.emoji}</span><span>{b.label}</span>
          </button>
        ))}
      </div>
      {bucketId && <QualDetail qual={qual} onChange={onQualChange} />}
    </div>
  )
}

const RECOMMEND_OPTS = [
  { id: 'yes',      label: 'Yes' },
  { id: 'for_some', label: 'For the right crowd' },
  { id: 'no',       label: 'No' },
]
const DRINK_AGAIN_OPTS = [
  { id: 'definitely',  label: 'Definitely' },
  { id: 'if_free',     label: 'Sure, if someone else is buying' },
  { id: 'probably_not',label: 'Probably not' },
  { id: 'hard_pass',   label: 'Hard pass' },
]

function QualDetail({ qual = {}, onChange }) {
  const [tagInput, setTagInput] = useState('')
  const goodFor = qual.goodFor || []

  function addTag(raw) {
    const tag = raw.trim().replace(/,$/, '')
    if (!tag || goodFor.includes(tag)) return
    onChange({ goodFor: [...goodFor, tag] })
  }

  function removeTag(tag) {
    onChange({ goodFor: goodFor.filter(t => t !== tag) })
  }

  function handleTagKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
    }
  }

  function toggle(field, opts, id) {
    onChange({ [field]: qual[field] === id ? null : id })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: `1px solid ${T.ink100}` }}>

      {/* Recommend */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.ink400, marginBottom: 6, fontFamily: T.fontBody }}>
          Would you recommend it?
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {RECOMMEND_OPTS.map(opt => {
            const active = qual.recommend === opt.id
            return (
              <button key={opt.id} onClick={() => toggle('recommend', RECOMMEND_OPTS, opt.id)} style={{
                padding: '6px 12px', borderRadius: 9999, fontFamily: T.fontBody, fontSize: 12,
                border: `1px solid ${active ? T.forest500 : T.ink200}`,
                background: active ? T.forest100 : 'white',
                color: active ? T.forest700 : T.ink600,
                fontWeight: active ? 600 : 400, cursor: 'pointer',
              }}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Drink again */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.ink400, marginBottom: 6, fontFamily: T.fontBody }}>
          Would you drink it again?
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DRINK_AGAIN_OPTS.map(opt => {
            const active = qual.drinkAgain === opt.id
            return (
              <button key={opt.id} onClick={() => toggle('drinkAgain', DRINK_AGAIN_OPTS, opt.id)} style={{
                padding: '6px 12px', borderRadius: 9999, fontFamily: T.fontBody, fontSize: 12,
                border: `1px solid ${active ? T.cobalt400 : T.ink200}`,
                background: active ? T.cobalt50 : 'white',
                color: active ? T.cobalt600 : T.ink600,
                fontWeight: active ? 600 : 400, cursor: 'pointer',
              }}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Good for */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.ink400, marginBottom: 6, fontFamily: T.fontBody }}>
          Good for… <span style={{ opacity: 0.55, fontWeight: 500 }}>optional</span>
        </div>
        {goodFor.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {goodFor.map(tag => (
              <span key={tag} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 9999,
                background: T.ochre100, border: `1px solid ${T.ochre400}`,
                color: T.ochre500, fontSize: 12, fontFamily: T.fontBody,
              }}>
                {tag}
                <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ochre500, fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          placeholder="e.g. Cab lovers, steak night — press Enter to add"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={handleTagKey}
          onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput('') } }}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: `1px solid ${T.ink150}`, background: T.ink0,
            fontFamily: T.fontBody, fontSize: 13, color: T.ink800,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Notes */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.ink400, marginBottom: 6, fontFamily: T.fontBody }}>
          Notes <span style={{ opacity: 0.55, fontWeight: 500 }}>optional</span>
        </div>
        <textarea
          placeholder="Anything else worth remembering…"
          value={qual.notes || ''}
          onChange={e => onChange({ notes: e.target.value.slice(0, 400) })}
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: `1px solid ${T.ink150}`, background: T.ink0,
            fontFamily: T.fontBody, fontSize: 13, color: T.ink800,
            outline: 'none', resize: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

function PalatePreview({ inference, archetype, hasAiSignal }) {
  const { palate, character, ratedCount, confidence } = inference
  const hasSignal = ratedCount > 0 || hasAiSignal
  const charAxes = character
    ? Object.entries(character).filter(([, v]) => v != null)
    : []
  return (
    <div style={{ background: T.dark, borderRadius: 12, padding: 16, color: T.ink100, boxShadow: T.shadowMd, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: T.forest500, opacity: 0.10, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, position: 'relative' }}>
        <span style={{ fontSize: 10, color: T.ochre400, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Live palate
        </span>
        <span style={{ fontSize: 11, color: T.ink300, fontFamily: T.fontBody }}>
          {hasSignal ? `${Math.round(confidence * 100)}% confidence` : 'no signal yet'}
        </span>
      </div>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 20, marginBottom: 12, color: T.ink100, position: 'relative' }}>
        {hasSignal ? archetype.name : 'Awaiting your first signal'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
        <AxisBar label="Body"      value={palate.body} />
        <AxisBar label="Tannin"    value={palate.tannin} />
        <AxisBar label="Sweetness" value={palate.sweetness} />
        <AxisBar label="Acidity"   value={palate.acidity} />
        {charAxes.length > 0 && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '4px 0' }} />
            {charAxes.map(([axis, val]) => (
              <AxisBar
                key={axis}
                label={CHAR_AXIS_META[axis]?.label || axis}
                value={val}
                color={CHAR_AXIS_META[axis]?.color}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function AxisBar({ label, value, color }) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  const barGradient = color
    ? `linear-gradient(90deg, ${color}cc, ${color})`
    : `linear-gradient(90deg, ${T.forest500}, ${T.ochre400})`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 70, fontSize: 10, fontFamily: T.fontBody, letterSpacing: '0.08em', textTransform: 'uppercase', color: color || T.ochre400 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ width: `${safe}%`, height: '100%', background: barGradient, transition: 'width 0.4s cubic-bezier(.2,.8,.2,1)' }} />
      </div>
      <span style={{ width: 28, textAlign: 'right', fontSize: 11, fontFamily: T.fontBody, color: T.ink300 }}>{safe}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, color: T.ochre500, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function bucketButtonStyle(bucket, selected) {
  const isPositive = bucket.weight > 0
  const isNegative = bucket.weight < 0
  const accent = isPositive ? T.forest500 : isNegative ? T.scarlet600 : T.ink400
  return {
    padding: '6px 10px', borderRadius: 100,
    border: `1px solid ${selected ? accent : T.ink150}`,
    background: selected ? T.forest100 : 'white',
    color: selected ? accent : T.ink900,
    fontSize: 12, fontFamily: T.fontBody, fontWeight: selected ? 600 : 400,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
    transition: 'all 0.15s ease',
  }
}

// ─── AI describe step ─────────────────────────────────────────────────────

const CHAR_AXIS_META = {
  earthiness: { label: 'Earthy',   color: '#8B6914' },
  funk:       { label: 'Funky',    color: '#9B1E1E' },
  mineral:    { label: 'Mineral',  color: '#1B4F8A' },
  oak:        { label: 'Oaky',     color: '#7B4E1A' },
  floral:     { label: 'Floral',   color: '#6B2D8B' },
}

function intensityLabel(v) {
  if (v >= 78) return 'defining'
  if (v >= 55) return 'prominent'
  if (v >= 35) return 'subtle'
  return 'hint'
}

function CharacterChips({ character, dismissed, onDismiss, onIntensityChange }) {
  if (!character) return null
  const axes = Object.entries(character).filter(([axis, val]) => val != null && !dismissed.includes(axis))
  if (axes.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {axes.map(([axis, val]) => {
        const meta = CHAR_AXIS_META[axis]
        return (
          <div key={axis} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, padding: '4px 8px 4px 10px', borderRadius: 100,
            background: `${meta.color}18`, border: `1px solid ${meta.color}55`,
            color: meta.color, fontFamily: T.fontBody, fontWeight: 600,
          }}>
            <span>{meta.label} — {intensityLabel(val)}</span>
            <button
              onClick={() => onDismiss(axis)}
              aria-label={`Dismiss ${axis}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: meta.color, fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2, opacity: 0.7 }}
            >×</button>
          </div>
        )
      })}
    </div>
  )
}

function FollowUpQuestions({ questions, answers, onAnswer }) {
  if (!questions || questions.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
      {questions.map(q => (
        <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: T.ink700, fontFamily: T.fontBody, lineHeight: 1.4 }}>
            {q.question}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === i
              return (
                <button
                  key={i}
                  onClick={() => onAnswer(q.id, i, opt.delta)}
                  style={{
                    padding: '6px 12px', borderRadius: 100,
                    border: `1px solid ${selected ? T.forest500 : T.ink150}`,
                    background: selected ? T.forest100 : 'white',
                    color: selected ? T.forest700 : T.ink700,
                    fontSize: 12, fontFamily: T.fontBody, fontWeight: selected ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function DescribeStep({ aiPalate, onAiPalateChange }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [staged, setStaged] = useState(null)
  const [confirmed, setConfirmed] = useState(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const [dismissed, setDismissed] = useState([])
  const [followUpAnswers, setFollowUpAnswers] = useState({})
  const [followUpDeltas, setFollowUpDeltas] = useState({})

  async function submit() {
    if (text.trim().length < 3 || loading) return
    setLoading(true); setError(null)
    try {
      const res = await describePalateFromText(text.trim())
      if (res.error) { setError(res.coachingNote || 'Something went wrong.'); setStaged(null) }
      else {
        setStaged({
          palate: res.palate,
          character: res.character || null,
          coachingNote: res.coachingNote,
          vocabulary: res.vocabulary,
          confidence: res.confidence,
          followUpQuestions: res.followUpQuestions || [],
        })
        setDismissed([])
        setFollowUpAnswers({})
        setFollowUpDeltas({})
      }
    } catch {
      setError('Could not reach the AI. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  function confirm() {
    if (!staged) return
    let finalChar = staged.character ? { ...staged.character } : null
    if (finalChar) {
      for (const delta of Object.values(followUpDeltas)) {
        for (const [axis, val] of Object.entries(delta)) {
          if (finalChar[axis] !== undefined) finalChar[axis] = val
          else finalChar[axis] = val
        }
      }
      for (const axis of dismissed) finalChar[axis] = null
    }
    const payload = finalChar
      ? { ...staged.palate, character: finalChar }
      : staged.palate
    setConfirmed({ ...staged, character: finalChar })
    onAiPalateChange?.(payload)
    setEditing(false)
    setStaged(null)
  }

  function refine() { setStaged(null) }
  function reopen() { setEditing(true); setText(''); setStaged(null) }
  function clearAll() {
    setText(''); setStaged(null); setConfirmed(null); setEditing(false)
    setError(null); setDismissed([]); setFollowUpAnswers({}); setFollowUpDeltas({})
    onAiPalateChange?.(null)
  }

  function handleFollowUpAnswer(qId, optIdx, delta) {
    setFollowUpAnswers(prev => ({ ...prev, [qId]: optIdx }))
    setFollowUpDeltas(prev => ({ ...prev, [qId]: delta }))
  }

  const canSubmit = text.trim().length >= 3 && !loading

  if (confirmed && !editing) {
    return (
      <div style={{ border: `1px solid ${T.forest300}`, borderRadius: 8, padding: 12, background: T.forest50, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: T.forest500, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ✨ Your description · locked in
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reopen} style={textLinkStyle()}>Refine</button>
            <button onClick={clearAll} style={textLinkStyle()}>Clear</button>
          </div>
        </div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 14, color: T.ink900, lineHeight: 1.4 }}>
          "{confirmed.coachingNote}"
        </div>
        {confirmed.vocabulary?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {confirmed.vocabulary.map((v, i) => <span key={i} style={vocabChipStyle()}>{v}</span>)}
          </div>
        )}
        {confirmed.character && (
          <CharacterChips
            character={confirmed.character}
            dismissed={[]}
            onDismiss={() => {}}
            onIntensityChange={() => {}}
          />
        )}
        <p style={{ margin: '4px 0 0', fontSize: 11, color: T.ink400, fontFamily: T.fontBody }}>
          Rate any specific bottles below to sharpen your profile further.
        </p>
      </div>
    )
  }

  return (
    <div style={{ border: `1px solid ${T.ink150}`, borderRadius: 8, padding: 12, background: 'white', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: T.ochre500, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        ✨ {editing ? 'Refine your description' : 'Describe wines you love'}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: T.ink400, fontFamily: T.fontBody, lineHeight: 1.4 }}>
        Don't know the names? Describe what you like in your own words, "smooth reds, nothing too dry", and we'll translate it into your taste profile.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value.slice(0, 500))}
        placeholder="e.g. I love jammy reds that aren't too tannic, and crisp dry whites with citrus…"
        rows={3}
        disabled={loading}
        style={{
          width: '100%', padding: '10px 12px',
          border: `1px solid ${T.ink150}`, borderRadius: 4,
          fontSize: 14, fontFamily: T.fontBody, color: T.ink900,
          outline: 'none', resize: 'vertical', background: T.ink0,
          opacity: loading ? 0.6 : 1, boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            padding: '8px 14px', border: 'none', borderRadius: 4,
            background: canSubmit ? `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)` : T.ink150,
            color: canSubmit ? 'white' : T.ink400,
            fontSize: 12, fontFamily: T.fontBody, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Reading…' : staged ? 'Re-analyze' : 'Translate to palate'}
        </button>
        {editing && <button onClick={() => { setEditing(false); setStaged(null); setError(null) }} style={textLinkStyle()}>Cancel</button>}
        {(staged || aiPalate) && !editing && <button onClick={clearAll} style={textLinkStyle()}>Clear</button>}
      </div>

      {error && <div style={{ fontSize: 12, color: T.scarlet600, fontFamily: T.fontBody }}>{error}</div>}

      {staged && !error && (
        <div style={{ marginTop: 4, padding: 8, background: T.forest50, border: `1px solid ${T.forest300}`, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, color: T.forest500, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Here's what we heard
          </div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 14, color: T.ink900, lineHeight: 1.4 }}>
            "{staged.coachingNote}"
          </div>
          {staged.vocabulary?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {staged.vocabulary.map((v, i) => <span key={i} style={vocabChipStyle()}>{v}</span>)}
            </div>
          )}
          {staged.character && (
            <CharacterChips
              character={staged.character}
              dismissed={dismissed}
              onDismiss={axis => setDismissed(prev => [...prev, axis])}
              onIntensityChange={() => {}}
            />
          )}
          {staged.followUpQuestions?.length > 0 && (
            <FollowUpQuestions
              questions={staged.followUpQuestions}
              answers={followUpAnswers}
              onAnswer={handleFollowUpAnswer}
            />
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <button
              onClick={confirm}
              style={{
                padding: '8px 14px', border: 'none', borderRadius: 4,
                background: `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
                color: 'white', fontSize: 12, fontFamily: T.fontBody, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              ✓ That's me
            </button>
            <button onClick={refine} style={refineButtonStyle()}>Not quite — let me rephrase</button>
          </div>
        </div>
      )}
    </div>
  )
}

function textLinkStyle() {
  return {
    background: 'none', border: 'none', color: T.ink400,
    fontSize: 12, fontFamily: T.fontBody, cursor: 'pointer',
    textDecoration: 'underline', textUnderlineOffset: '3px', padding: 0,
  }
}

function refineButtonStyle() {
  return {
    padding: '8px 14px', border: `1px solid ${T.ink150}`, borderRadius: 4,
    background: 'transparent', color: T.ink900, fontSize: 12,
    fontFamily: T.fontBody, fontWeight: 500, cursor: 'pointer',
  }
}

function vocabChipStyle() {
  return {
    fontSize: 10, padding: '3px 8px', borderRadius: 100,
    background: T.forest100, color: T.forest700,
    fontFamily: T.fontBody, letterSpacing: '0.04em',
  }
}

function blendWithAi(ratingsInference, aiPalate) {
  if (!aiPalate) return ratingsInference
  const ratingsWeight = ratingsInference.ratedCount
  const aiWeight = 1.5
  const total = ratingsWeight + aiWeight || 1
  const safeAi = (k) => Number.isFinite(aiPalate?.[k]) ? aiPalate[k] : ratingsInference.palate[k]
  const blend = (k) => Math.round((ratingsInference.palate[k] * ratingsWeight + safeAi(k) * aiWeight) / total)
  const palate = { body: blend('body'), tannin: blend('tannin'), sweetness: blend('sweetness'), acidity: blend('acidity') }
  const confidence = Math.min(1, ratingsInference.confidence + 0.25)
  const aiChar = aiPalate?.character || null
  const ratingsChar = ratingsInference.character || null
  let character = null
  if (aiChar || ratingsChar) {
    character = {}
    const axes = ['earthiness', 'funk', 'mineral', 'oak', 'floral']
    for (const axis of axes) {
      character[axis] = aiChar?.[axis] != null ? aiChar[axis] : (ratingsChar?.[axis] ?? null)
    }
  }
  return { palate, character, confidence, ratedCount: ratingsInference.ratedCount, bucketCounts: ratingsInference.bucketCounts }
}
