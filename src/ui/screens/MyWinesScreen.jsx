import { useMemo, useState } from 'react'
import T from '../theme/T.js'
import { useWineRatings } from '../hooks/useWineRatings.js'
import { getRatingBuckets, getWines, computeMatch, computeMatchWithConfidence, sortWines } from '@/core/api'

const BUCKET_ORDER = ['loved', 'liked', 'ok', 'disliked', 'hated']

const VIEWS = [
  { id: 'buckets',  label: 'Rating',   icon: '★' },
  { id: 'timeline', label: 'Timeline', icon: '◷' },
  { id: 'grape',    label: 'Grape',    icon: '◈' },
  { id: 'region',   label: 'Region',   icon: '◉' },
  { id: 'grid',     label: 'Grid',     icon: '⊞' },
]

function bottleHue(wine) {
  const text = ((wine?.grape ?? '') + ' ' + (wine?.name ?? '')).toLowerCase()
  if (/merlot|cabernet|syrah|pinot.noir|malbec|tempranillo|barolo|burgundy|bordeaux|rioja|beaujolais/.test(text)) return T.forest700
  if (/ros[eé]|provence/.test(text)) return T.scarlet300
  return T.ochre400
}

function bucketEmoji(bucketId) {
  const map = { loved: '❤️', liked: '👍', ok: '🤷', disliked: '👎', hated: '🚫' }
  return map[bucketId] ?? '·'
}

function MiniBottle({ wine, size = 44 }) {
  const hue = bottleHue(wine)
  return (
    <div style={{
      width: Math.round(size * 0.46),
      height: size,
      borderRadius: '3px 3px 2px 2px',
      background: `linear-gradient(180deg, ${hue} 0%, ${T.ochre500} 100%)`,
      flexShrink: 0,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: '28%', left: '18%', right: '18%', bottom: '14%', background: 'rgba(255,255,255,0.18)', borderRadius: 1 }}/>
    </div>
  )
}

function WineRow({ id, wine, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: 'white', border: `1px solid ${T.ink150}`,
      borderRadius: 12, boxShadow: T.shadowMd,
    }}>
      <MiniBottle wine={wine} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 15, color: T.ink900, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {wine?.name || 'Unknown wine'}
        </div>
        <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {[wine?.vintage, wine?.region, wine?.grape].filter(Boolean).join(' · ') || ' '}
        </div>
      </div>
      <button onClick={() => onRemove(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ink300, fontSize: 20, padding: 4, flexShrink: 0, lineHeight: 1 }} title="Remove">
        ×
      </button>
    </div>
  )
}

function SectionLabel({ children, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: T.ink400, marginBottom: 8,
    }}>
      <span>{children}</span>
      {count != null && <span style={{ opacity: 0.5 }}>· {count}</span>}
    </div>
  )
}

// ─── View 1: By Rating Bucket ───────────────────────────────────────────────
function BucketsView({ entries, buckets, onRemove }) {
  const byBucket = Object.fromEntries(buckets.map(b => [b.id, []]))
  for (const entry of entries) {
    if (byBucket[entry.bucketId]) byBucket[entry.bucketId].push(entry)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {BUCKET_ORDER.map(bid => {
        const bucket = buckets.find(b => b.id === bid)
        const items = byBucket[bid] || []
        if (!items.length) return null
        return (
          <div key={bid}>
            <SectionLabel count={items.length}>{bucket.emoji} {bucket.label}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {items.map(({ id, wine }) => (
                <WineRow key={id} id={id} wine={wine} onRemove={onRemove} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── View 2: Timeline ────────────────────────────────────────────────────────
function groupByDate(entries) {
  const groups = []
  const labelMap = {}
  const now = Date.now()
  for (const entry of [...entries].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))) {
    const ts = entry.savedAt || 0
    const diffMs = now - ts
    let label
    if (diffMs < 86400000) {
      label = 'Today'
    } else if (diffMs < 7 * 86400000) {
      label = 'This week'
    } else {
      label = new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    if (!labelMap[label]) {
      labelMap[label] = []
      groups.push({ label, items: labelMap[label] })
    }
    labelMap[label].push(entry)
  }
  return groups
}

function TimelineView({ entries, onRemove }) {
  const groups = groupByDate(entries)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map(({ label, items }) => (
        <div key={label}>
          <SectionLabel count={items.length}>{label}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {items.map(({ id, wine, bucketId }) => (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'white', border: `1px solid ${T.ink150}`,
                borderRadius: 12, boxShadow: T.shadowMd,
              }}>
                <div style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{bucketEmoji(bucketId)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fontDisplay, fontSize: 15, color: T.ink900, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {wine?.name || 'Unknown wine'}
                  </div>
                  <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400, marginTop: 2 }}>
                    {[wine?.vintage, wine?.grape, wine?.region].filter(Boolean).join(' · ') || ' '}
                  </div>
                </div>
                <button onClick={() => onRemove(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ink300, fontSize: 20, padding: 4, flexShrink: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Views 3 & 4: Grouped by field (Grape / Region) ─────────────────────────
function groupByField(entries, field) {
  const map = new Map()
  for (const entry of entries) {
    const key = entry.wine?.[field] || 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([label, items]) => ({ label, items }))
}

function GroupedView({ entries, field, onRemove }) {
  const groups = groupByField(entries, field)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map(({ label, items }) => (
        <div key={label}>
          <SectionLabel count={items.length}>{label}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {items.map(({ id, wine }) => (
              <WineRow key={id} id={id} wine={wine} onRemove={onRemove} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── View 5: Compact Grid ────────────────────────────────────────────────────
function GridView({ entries, onRemove }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {entries.map(({ id, wine, bucketId }) => (
        <div key={id} style={{
          background: 'white', border: `1px solid ${T.ink150}`,
          borderRadius: 12, padding: '10px 8px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          boxShadow: T.shadowMd, position: 'relative',
        }}>
          <button onClick={() => onRemove(id)} style={{
            position: 'absolute', top: 4, right: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.ink300, fontSize: 15, padding: 2, lineHeight: 1,
          }}>×</button>
          <MiniBottle wine={wine} size={36} />
          <div style={{
            fontFamily: T.fontDisplay, fontSize: 11, color: T.ink900,
            textAlign: 'center', lineHeight: 1.3, width: '100%',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{wine?.name || '—'}</div>
          <div style={{ fontSize: 13, lineHeight: 1 }}>{bucketEmoji(bucketId)}</div>
        </div>
      ))}
    </div>
  )
}

function tryPillLabel(flags) {
  if (flags.length >= 2) return 'Low confidence'
  if (flags.includes('profile')) return 'Profile incomplete'
  if (flags.includes('quality')) return 'Mixed critics'
  if (flags.includes('price')) return 'Budget tier'
  return 'Low confidence'
}

// ─── TryCard ─────────────────────────────────────────────────────────────────
function TryCard({ wine, score, isLow, flags = [], onTap }) {
  return (
    <button onClick={onTap} style={{
      width: '100%', textAlign: 'left', padding: '12px 14px',
      background: 'white', border: `1px solid ${T.ink150}`,
      borderRadius: 14, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 5,
      boxShadow: T.shadowMd,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 16, color: T.ink900, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {wine.name}
          </div>
          <div style={{ fontSize: 11, color: T.ink400, fontFamily: T.fontBody, marginTop: 2 }}>
            {[wine.grape, wine.region, wine.price].filter(Boolean).join(' · ')}
          </div>
        </div>
        {score !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
            <div style={{
              padding: '3px 9px',
              background: score >= 70 ? T.forest100 : score >= 50 ? `${T.ochre400}22` : T.ink100,
              color: score >= 70 ? T.forest700 : score >= 50 ? T.ochre500 : T.ink500,
              border: `1px solid ${score >= 70 ? T.forest300 : T.ink150}`,
              borderRadius: 100, fontSize: 11, fontWeight: 700, fontFamily: T.fontBody,
              opacity: isLow ? 0.8 : 1,
            }}>
              {isLow ? `~${score}%` : `${score}%`} match
            </div>
            {isLow && flags.length > 0 && (
              <span style={{
                display: 'inline-block', alignSelf: 'flex-end',
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                background: T.ochre100, color: T.ochre500,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: T.fontBody,
              }}>
                {tryPillLabel(flags)}
              </span>
            )}
          </div>
        )}
      </div>
      {wine.tasting && (
        <p style={{
          margin: 0, fontSize: 12, color: T.ink500, fontFamily: T.fontBody,
          fontStyle: 'italic', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {wine.tasting}
        </p>
      )}
    </button>
  )
}

// ─── View Switcher Bar ───────────────────────────────────────────────────────
function ViewBar({ active, onChange }) {
  return (
    <div
      className="hide-scrollbar"
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${T.ink150}`,
        backgroundColor: 'white',
        padding: '10px 12px',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
      }}
    >
      {VIEWS.map(v => {
        const on = v.id === active
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            style={{
              flex: '1 0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 10px',
              background: on ? T.cobalt50 : 'transparent',
              border: `1px solid ${on ? T.cobalt300 : 'transparent'}`,
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1, color: on ? T.cobalt500 : T.ink400, fontFamily: 'system-ui' }}>
              {v.icon}
            </span>
            <span style={{
              fontSize: 9.5,
              fontFamily: T.fontBody,
              fontWeight: on ? 700 : 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: on ? T.cobalt500 : T.ink400,
              lineHeight: 1,
            }}>
              {v.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function MyWinesScreen({ navigate, tasteProfile, onWineSelect }) {
  const { ratings, removeRating } = useWineRatings()
  const buckets = getRatingBuckets()
  const [view, setView] = useState('buckets')

  const entries = Object.entries(ratings)
    .map(([id, data]) => ({
      id,
      bucketId: data?.bucketId ?? data,
      wine: data?.wine ?? null,
      savedAt: data?.savedAt ?? 0,
    }))
    .sort((a, b) => b.savedAt - a.savedAt)

  const hasAny = entries.length > 0
  const ratedIds = new Set(entries.map(e => String(e.id)))

  const toTry = useMemo(() => {
    const all = getWines().filter(w => !ratedIds.has(String(w.id)))
    if (tasteProfile) {
      return all
        .map(w => {
          const raw = computeMatch(w, tasteProfile)
          const { score, isLow, reason, flags } = computeMatchWithConfidence({ ...w, computedMatch: raw }, tasteProfile)
          return { ...w, _score: raw, _adjScore: score, _isLow: isLow, _reason: reason, _flags: flags }
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, 6)
    }
    return sortWines(all, 'match', null).slice(0, 6)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasteProfile, ratedIds.size])

  function renderView() {
    if (!hasAny) return null
    switch (view) {
      case 'buckets':  return <BucketsView entries={entries} buckets={buckets} onRemove={removeRating} />
      case 'timeline': return <TimelineView entries={entries} onRemove={removeRating} />
      case 'grape':    return <GroupedView entries={entries} field="grape" onRemove={removeRating} />
      case 'region':   return <GroupedView entries={entries} field="region" onRemove={removeRating} />
      case 'grid':     return <GridView entries={entries} onRemove={removeRating} />
      default:         return null
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      background: T.ink0, fontFamily: T.fontBody, position: 'relative', overflow: 'hidden',
    }}>
      {/* watercolor washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -50, right: -30, width: 200, height: 200, borderRadius: '50%', background: T.cobalt300, opacity: 0.07, filter: 'blur(50px)' }}/>
        <div style={{ position: 'absolute', top: 120, left: -40, width: 180, height: 180, borderRadius: '50%', background: T.ochre400, opacity: 0.06, filter: 'blur(44px)' }}/>
      </div>

      {/* Header */}
      <div style={{ padding: '24px 22px 16px', flexShrink: 0, zIndex: 1, position: 'relative' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.ochre500, marginBottom: 6 }}>
          Your cellar
        </div>
        <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 28, lineHeight: 1.1, margin: '0 0 4px', letterSpacing: '-0.01em', color: T.ink900 }}>
          {hasAny
            ? <><em style={{ color: T.forest500 }}>{entries.length} wine{entries.length !== 1 ? 's' : ''}</em> rated</>
            : <>My <em style={{ color: T.forest500 }}>Wines</em></>
          }
        </h1>
        {hasAny && (
          <div style={{ fontSize: 12, color: T.ink400 }}>Rate wines to sharpen your taste profile</div>
        )}
      </div>

      {/* Body */}
      <div
        className="hide-scrollbar"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '4px 18px 24px', position: 'relative', zIndex: 1,
          background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)`,
        }}
      >
        {!hasAny && (
          <div style={{ textAlign: 'center', padding: '32px 0 8px' }}>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 22, color: T.ink700, marginBottom: 8 }}>Nothing rated yet</div>
            <div style={{ fontSize: 13, color: T.ink400, marginBottom: 28, lineHeight: 1.6 }}>
              Scan a wine list, then rate the bottles<br/>you tried to build your personal cellar.
            </div>
            <button
              onClick={() => navigate('scanPrompt')}
              style={{
                padding: '12px 28px',
                background: `linear-gradient(135deg, ${T.ochre400} 0%, ${T.ochre500} 100%)`,
                color: T.ink900, border: 'none', borderRadius: 100,
                fontFamily: T.fontBody, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Scan a wine list
            </button>
          </div>
        )}

        {renderView()}

        {/* Wines to try */}
        {toTry.length > 0 && (
          <div style={{ marginTop: hasAny ? 24 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.forest500, marginBottom: 10 }}>
              {tasteProfile ? 'Wines to try — matched to your taste' : 'Wines worth trying'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {toTry.map(w => (
                <TryCard
                  key={w.id}
                  wine={w}
                  score={tasteProfile ? (w._adjScore ?? w._score ?? null) : null}
                  isLow={w._isLow ?? false}
                  flags={w._flags ?? []}
                  onTap={() => onWineSelect?.(w)}
                />
              ))}
            </div>
            {!tasteProfile && (
              <p style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody, marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
                <button onClick={() => navigate('quizIntro')} style={{ background: 'none', border: 'none', color: T.forest500, fontFamily: T.fontBody, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0 }}>
                  Build your taste profile
                </button>{' '}for personalized match scores
              </p>
            )}
          </div>
        )}
      </div>

      {/* View switcher — only shown when there are wines */}
      {hasAny && <ViewBar active={view} onChange={setView} />}
    </div>
  )
}
