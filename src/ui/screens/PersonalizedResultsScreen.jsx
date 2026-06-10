import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveScroll, getScroll } from '../utils/scrollStore.js'
import { useShortlist } from '../hooks/useShortlist.js'
import T from '../theme/T.js'
import { getWines, sortWines, computeMatch, computeMatchWithConfidence, applyFilters, getFilterFacets, EMPTY_FILTERS } from '@/core/api'
import SortToggle from '../components/SortToggle.jsx'
import BottomNav from '../components/BottomNav.jsx'
import FilterBar from '../components/FilterBar.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import { getMatchTag } from '../constants/matchThresholds.js'
import TwoSignalBars from '../components/TwoSignalBars.jsx'

const SORT_OPTIONS = [
  { value: 'match',     label: 'My Taste' },
  { value: 'crowd',     label: 'Crowd Pleaser' },
  { value: 'rating',    label: 'Critic Score' },
  { value: 'value',     label: 'Best Value' },
  { value: 'price_asc', label: 'Price: Low–High' },
]

const REASON_COPY = {
  too_blurry:       'The image was a little blurry, try holding steadier.',
  too_dark:         'It was too dark, move toward better light.',
  too_far:          'You were too far away, get closer so the labels fill the frame.',
  glare:            'There was glare on the labels, change angle or shade the page.',
  angle_skewed:     'The angle was skewed, square the camera to the list or bottle.',
  label_cut_off:    'Part of the label was cut off, re-frame to include the full label.',
  not_a_wine_image: 'I could not find any wine text in this image.',
  list_too_dense:   'The list was too dense to read at once, try one section.',
}

function normalizeScanResult(scannedWines) {
  if (!scannedWines) return null
  if (Array.isArray(scannedWines)) {
    return { wines: scannedWines, readability: 'good', retakeReasons: [], message: '' }
  }
  if (typeof scannedWines === 'object') {
    return {
      wines: Array.isArray(scannedWines.wines) ? scannedWines.wines : [],
      readability: scannedWines.readability || (scannedWines.wines?.length ? 'partial' : 'unreadable'),
      retakeReasons: Array.isArray(scannedWines.retakeReasons) ? scannedWines.retakeReasons : [],
      message: typeof scannedWines.message === 'string' ? scannedWines.message : '',
    }
  }
  return null
}

function getTag(score) {
  return getMatchTag(score, T)
}

// Same score priority as WineRowCard + TwoSignalBars (adjustedMatch first)
function wineScore(w) {
  return w.adjustedMatch ?? w.computedMatch ?? 0
}

function pillLabel(flags, hasFlavorData) {
  if (!hasFlavorData)                              return 'No flavor data'
  const q = flags.includes('quality')
  const p = flags.includes('price')
  const pr = flags.includes('profile')
  if (q && p)   return 'Budget, lower rated'
  if (q)        return 'Lower rated'
  if (p)        return 'Budget wine'
  if (pr)       return 'Rate more wines'
  return 'Limited data'
}

function pillTooltip(flags, hasFlavorData) {
  if (!hasFlavorData)
    return 'We don\'t have flavor data for this wine, so the match is based on name and region only.'
  if (flags.includes('profile') && !flags.includes('quality') && !flags.includes('price'))
    return 'Rate wines you\'ve tried to sharpen your match scores — the more we know your taste, the more accurate this gets.'
  return null
}

function ConfidencePill({ flags, wine }) {
  const [open, setOpen] = useState(false)
  if (!flags.length) return null

  const hasFlavorData = wine?.body != null || wine?.tannin != null
  const label   = pillLabel(flags, hasFlavorData)
  const tooltip = pillTooltip(flags, hasFlavorData)

  return (
    <div style={{ display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <span
        onClick={tooltip ? () => setOpen(o => !o) : undefined}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
          background: T.ochre100, color: T.ochre500,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          fontFamily: T.fontBody,
          cursor: tooltip ? 'pointer' : 'default',
        }}
      >
        {label}
        {tooltip && <span style={{ fontSize: 9, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>}
      </span>
      {open && tooltip && (
        <div style={{
          marginTop: 6, padding: '8px 10px',
          background: T.ink50, border: `1px solid ${T.ochre100}`,
          borderRadius: 8, fontSize: 11, color: T.ink700,
          fontFamily: T.fontBody, lineHeight: 1.5,
        }}>
          {tooltip}
        </div>
      )}
    </div>
  )
}

function SortRationale({ wine, sortKey }) {
  const base = { fontSize: 11, fontFamily: T.fontBody, marginTop: 2 }
  if (sortKey === 'rating') {
    return wine.rating != null
      ? <div style={{ ...base, color: T.cobalt600 }}>critic score: {wine.rating} pts</div>
      : <div style={{ ...base, color: T.ink300 }}>no critic score on file</div>
  }
  if (sortKey === 'crowd') {
    const a = wine.computedApproachability ?? 3
    const label = a >= 4 ? 'easy-drinking' : a >= 3 ? 'moderate' : 'bold / tannic'
    return <div style={{ ...base, color: T.ink400 }}>approachability {a}/5 · {label}</div>
  }
  if (sortKey === 'price_asc' || sortKey === 'value') {
    return wine.priceNum != null
      ? <div style={{ ...base, color: T.ink600 }}>${wine.priceNum}</div>
      : <div style={{ ...base, color: T.ink300 }}>price not on file</div>
  }
  return null
}

function WineRowCard({ wine, rank, onTap, onSave, saved, sortKey }) {
  const score = wine.adjustedMatch ?? wine.computedMatch ?? null
  const noData = score === null
  const tag = noData ? null : getTag(score)
  const cardBg = noData ? T.ink50 : score >= 70 ? 'white' : score >= 50 ? T.ink50 : 'oklch(98% 0.02 30)'
  const borderColor = (!noData && score < 50) ? T.scarlet300 : T.ink150

  return (
    <div
      onClick={() => onTap?.(wine)}
      style={{
        padding: '14px 14px', marginBottom: 8,
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 8,
        opacity: (!noData && score < 50) ? 0.85 : 1,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: T.ink400, fontWeight: 600, fontFamily: T.fontBody }}>#{rank + 1}</span>
            {tag && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
                background: tag.color, color: 'white', letterSpacing: '0.04em',
                textTransform: 'uppercase', fontFamily: T.fontBody,
              }}>{tag.label}</span>
            )}
            {wine.rating != null && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
                background: T.cobalt100, color: T.cobalt700, fontFamily: T.fontBody,
              }}>{wine.rating} pts</span>
            )}
          </div>
          <div style={{
            fontFamily: T.fontDisplay, fontSize: 16, color: T.ink900, lineHeight: 1.2,
            textDecoration: (!noData && score < 50) ? 'line-through' : 'none',
            textDecorationColor: T.scarlet400,
          }}>
            {wine.name}{wine.vintage ? ` ${wine.vintage}` : ''}
          </div>
          <div style={{ fontSize: 11, color: T.ink400, marginTop: 2, fontFamily: T.fontBody }}>
            {[wine.grape, wine.region].filter(Boolean).join(' · ')}
          </div>
          <SortRationale wine={wine} sortKey={sortKey} />
          <NaturalBadge wine={wine} />
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {wine.price != null && (
            <div style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 600, color: T.ink900 }}>{wine.price}</div>
          )}
          <button
            onClick={e => { e.stopPropagation(); onSave?.() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: saved ? T.scarlet500 : T.ink300, padding: 0, lineHeight: 1 }}
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>
      </div>
      {noData
        ? <div style={{ fontSize: 11, color: T.ink300, fontFamily: T.fontBody, fontStyle: 'italic' }}>No taste data available — we can't assess fit for your palate</div>
        : <TwoSignalBars tasteFit={score} wePoints={wine.rating ?? null} />
      }
      {!noData && wine.matchIsLow && <ConfidencePill flags={wine.matchFlags ?? []} wine={wine} />}
      {wine.tasting && (
        <p style={{ fontSize: 12, color: T.ink500, margin: 0, lineHeight: 1.5, fontFamily: T.fontBody, fontStyle: 'italic' }}>
          {wine.tasting}
        </p>
      )}
      {wine.tasteMatch?.summary && (
        <p style={{ fontSize: 12, color: T.forest700, margin: wine.tasting ? '4px 0 0' : 0, lineHeight: 1.45, fontFamily: T.fontBody }}>
          {wine.tasteMatch.summary}
        </p>
      )}
    </div>
  )
}

function defaultSortKey(buyingFor, scanIntent) {
  const tags = scanIntent?.tags ?? []
  if (tags.includes('splurge'))    return 'value'
  if (tags.includes('crowd'))      return 'crowd'
  if (buyingFor === 'group')       return 'crowd'
  if (buyingFor === 'gift')        return 'value'
  return 'match'
}

const SORT_SUBTITLE = {
  match:     'taste fit',
  crowd:     'crowd score',
  rating:    'critic score',
  value:     'best value',
  price_asc: 'price: low–high',
}

export default function PersonalizedResultsScreen({ navigate, goBack, tasteProfile, buyingFor, scanIntent, scannedWines, onWineSelect, scanId, mealAppeal, sortKey, onSortChange }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [showOnlySaved, setShowOnlySaved] = useState(false)
  const shortlist = useShortlist()
  const scrollRef = useRef(null)

  const setFiltersAndPersist = useCallback(f => { setFilters(f) }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = getScroll('personalizedResults')
    const save = () => saveScroll('personalizedResults', el.scrollTop)
    el.addEventListener('scroll', save, { passive: true })
    return () => el.removeEventListener('scroll', save)
  }, [])

  const { baseWines, fromScan, readability, retakeReasons } = useMemo(() => {
    const r = normalizeScanResult(scannedWines)
    if (r && r.wines.length > 0)
      return { baseWines: r.wines, fromScan: true, readability: r.readability, retakeReasons: r.retakeReasons }
    return { baseWines: getWines(), fromScan: false, readability: 'good', retakeReasons: [] }
  }, [scannedWines])

  const scoredWines = useMemo(() => {
    if (!tasteProfile) return baseWines
    return baseWines.map(w => {
      const rawRaw = computeMatch(w, tasteProfile)
      const raw = Number.isFinite(rawRaw) ? rawRaw : null
      const { score: adjusted, isLow, reason, flags } = computeMatchWithConfidence({ ...w, computedMatch: raw }, tasteProfile)
      return {
        ...w,
        computedMatch: raw,
        adjustedMatch: Number.isFinite(adjusted) ? adjusted : null,
        matchIsLow: isLow,
        matchReason: reason,
        matchFlags: flags,
      }
    })
  }, [baseWines, tasteProfile])

  const facets = useMemo(() => getFilterFacets(scoredWines), [scoredWines])
  const filteredWines = useMemo(() => applyFilters(scoredWines, filters), [scoredWines, filters])

  const sortedWines = useMemo(() => {
    const result = sortWines(filteredWines, sortKey, tasteProfile)
    console.log('[PersonalizedResults] sortedWines recomputed. sortKey:', sortKey, '| first 3:', result.slice(0, 3).map(w => w.name))
    return result
  }, [filteredWines, sortKey, tasteProfile])


  const topMatch = useMemo(() => {
    if (!tasteProfile || filteredWines.length === 0) return 0
    return Math.max(...filteredWines.map(wineScore))
  }, [filteredWines, tasteProfile])
  const noStrongMatches = tasteProfile && filteredWines.length > 0 && topMatch < 80

  const lowConfidenceCount = useMemo(
    () => filteredWines.filter(w => typeof w.confidence === 'number' && w.confidence < 60).length,
    [filteredWines]
  )
  const showLowConfidenceWarning = fromScan && filteredWines.length > 0 &&
    lowConfidenceCount / filteredWines.length >= 0.3

  const showRetakePanel = fromScan && readability !== 'good'

  // Thresholds mirror TwoSignalBars: Strong ≥ 82, Decent ≥ 66 (= round(82 * 0.80))
  const strongFits = sortedWines.filter(w => wineScore(w) >= 82).length
  const decentFits = sortedWines.filter(w => wineScore(w) >= 66 && wineScore(w) < 82).length
  const toSkip = sortedWines.filter(w => wineScore(w) < 50).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.ink0, position: 'relative', overflow: 'hidden' }}>
      {/* Watercolor washes */}
      <div style={{ position: 'absolute', top: -80, left: -80, width: 280, height: 280, borderRadius: '50%', background: T.forest500, opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: T.cobalt500, opacity: 0.06, filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <div style={{ padding: '52px 22px 12px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
          <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.fontBody }}>{scoredWines.length} wine{scoredWines.length !== 1 ? 's' : ''} on this list</span>
          <button onClick={() => setFilterOpen(true)} style={{ background: 'transparent', border: 'none', color: T.forest500, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.fontBody }}>Filters</button>
        </div>
        <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 28, lineHeight: 1.1, margin: '0 0 6px', letterSpacing: '-0.01em', color: T.ink900 }}>
          {strongFits > 0
            ? <><em style={{ color: T.forest500 }}>{strongFits} strong fit{strongFits !== 1 ? 's' : ''}</em>{toSkip > 0 ? `, ${toSkip} to skip.` : '.'}</>
            : decentFits > 0
              ? <><em style={{ color: T.cobalt500 }}>{decentFits} decent fit{decentFits !== 1 ? 's' : ''}.</em> Nothing we'd call a sure thing.</>
              : noStrongMatches
                ? <><em style={{ color: T.scarlet500 }}>Nothing here</em> is truly in your lane.</>
                : <>Your matches.</>
          }
        </h1>
        <p style={{ fontSize: 12, color: T.ink400, margin: 0, lineHeight: 1.45, fontFamily: T.fontBody }}>
          {sortKey === 'match' ? 'Ranked by' : 'Sorted by'} {SORT_SUBTITLE[sortKey] ?? 'taste fit'}
          {mealAppeal ? ` · matched to "${mealAppeal}"` : ''}
          {scanIntent?.label ? ` · ${scanIntent.label}` : ''}
          {tasteProfile?.name ? ` · ${tasteProfile.name.replace(/^The\s+/i, '')}` : ''}
        </p>
      </div>

      {/* Filter bar */}
      {scoredWines.length > 0 && (
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <FilterBar
            filters={filters}
            onOpen={() => setFilterOpen(true)}
            onChange={setFiltersAndPersist}
            resultCount={filteredWines.length}
            totalCount={scoredWines.length}
          />
        </div>
      )}

      {/* Scrollable content */}
      <div ref={scrollRef} className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowAnchor: 'none', position: 'relative', zIndex: 1, background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)` }}>
        {/* Shortlist banner */}
        {shortlist.list.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 22px',
            background: T.forest100,
            borderBottom: `1px solid ${T.forest300}`,
            fontFamily: T.fontBody, fontSize: 12,
          }}>
            <span style={{ color: T.forest700 }}>♥ {shortlist.list.length} wine{shortlist.list.length > 1 ? 's' : ''} saved</span>
            <button
              onClick={() => setShowOnlySaved(v => !v)}
              style={{ background: 'none', border: 'none', color: T.forest500, fontFamily: T.fontBody, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {showOnlySaved ? 'Show all wines' : 'View shortlist →'}
            </button>
          </div>
        )}

        {/* Partial read warning */}
        {showRetakePanel && (
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ border: `1px solid ${T.ochre500}50`, borderRadius: 14, background: T.ochre100, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: T.ochre500, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Partial read</div>
              <p style={{ fontFamily: T.fontDisplay, fontSize: 16, color: T.ink800, lineHeight: 1.4, margin: '0 0 10px' }}>
                I read part of the list. A second photo will give you better matches.
              </p>
              {retakeReasons.length > 0 && (
                <ul style={{ fontFamily: T.fontBody, color: T.ink500, fontSize: 12, lineHeight: 1.6, paddingLeft: 18, marginBottom: 12 }}>
                  {retakeReasons.slice(0, 3).map(r => <li key={r}>{REASON_COPY[r] || r}</li>)}
                </ul>
              )}
              <button
                onClick={() => navigate('scanPrompt')}
                style={{ width: '100%', border: 'none', borderRadius: 9999, background: T.forest500, color: 'white', padding: '10px 0', fontFamily: T.fontBody, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Try another photo
              </button>
            </div>
          </div>
        )}

        {/* No strong matches — honest banner */}
        {noStrongMatches && !showRetakePanel && (
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${T.scarlet300}`, background: T.scarlet100, fontFamily: T.fontBody, fontSize: 13, color: T.ink700, lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <strong style={{ fontWeight: 700, color: T.scarlet500 }}>Unfortunately, none of these wines will delight you.</strong>
              {sortedWines.length > 0 && (
                <button
                  onClick={() => onWineSelect?.(sortedWines[0])}
                  style={{
                    background: T.scarlet500, color: 'white', border: 'none',
                    borderRadius: 9999, padding: '10px 16px',
                    fontFamily: T.fontBody, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  Of these, we think this is the best.
                </button>
              )}
            </div>
          </div>
        )}

        {/* Low confidence warning */}
        {showLowConfidenceWarning && (
          <div style={{ padding: '8px 16px 0' }}>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: T.ochre100, border: `1px solid ${T.ochre500}55`, fontFamily: T.fontBody, fontSize: 12, color: T.ink700 }}>
              Some labels were hard to read. Try a sharper photo for a more complete list.
            </div>
          </div>
        )}

        {/* Shortlist-only view */}
        {showOnlySaved && (
          <div style={{ padding: '14px 16px 80px' }}>
            <div style={{ marginBottom: 10, fontFamily: T.fontBody, fontSize: 10, color: T.ink400, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Your shortlist</div>
            {shortlist.list.length === 0
              ? <p style={{ fontFamily: T.fontBody, color: T.ink400 }}>Nothing saved yet.</p>
              : shortlist.list.map((wine, i) => (
                  <WineRowCard key={wine.id ?? wine.name} wine={wine} rank={i} onTap={onWineSelect} onSave={() => shortlist.toggle(wine)} saved />
                ))
            }
          </div>
        )}

        {/* Sort toggle + wine list */}
        {!showOnlySaved && sortedWines.length > 0 && (
          <div style={{ padding: '10px 16px 80px' }}>
            <ColorQuickFilter facets={facets} filters={filters} onChange={setFiltersAndPersist} />
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SortToggle options={SORT_OPTIONS} value={sortKey} onChange={k => { console.log('[PersonalizedResults] sort button pressed:', k, '| current sortKey:', sortKey); onSortChange(k); requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }) }} />
              <button
                onClick={() => setFiltersAndPersist({ ...filters, natural: !filters.natural })}
                style={{
                  padding: '5px 12px', borderRadius: 9999, cursor: 'pointer',
                  background: filters.natural ? T.forest100 : 'transparent',
                  border: `1px solid ${filters.natural ? T.forest400 : T.ink200}`,
                  color: filters.natural ? T.forest700 : T.ink500,
                  fontFamily: T.fontBody, fontSize: 11, fontWeight: 600,
                }}
              >
                🌿 Natural
              </button>
            </div>
            {sortedWines.map((wine, i) => (
              <WineRowCard
                key={wine.id ?? wine.name}
                wine={wine}
                rank={i}
                sortKey={sortKey}
                onTap={onWineSelect}
                onSave={() => shortlist.toggle(wine)}
                saved={shortlist.isSaved(wine)}
              />
            ))}
            {/* Hidden wines hint */}
            <button style={{ width: '100%', padding: '12px 0', background: 'transparent', border: 'none', color: T.ink400, fontSize: 12, fontFamily: T.fontBody, cursor: 'pointer' }}>
              Showing all {sortedWines.length} wines →
            </button>
          </div>
        )}

        {/* Empty filtered set */}
        {scoredWines.length > 0 && filteredWines.length === 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${T.ink150}`, background: T.ink50, fontFamily: T.fontBody, fontSize: 13, color: T.ink700 }}>
              No wines match these filters.{' '}
              <button onClick={() => setFiltersAndPersist(EMPTY_FILTERS)} style={{ background: 'transparent', border: 'none', color: T.forest500, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: T.fontBody }}>
                Clear filters
              </button>{' '}
              to see your full list.
            </div>
          </div>
        )}

        {/* Empty scan state */}
        {fromScan && baseWines.length === 0 && (
          <div style={{ padding: 16 }}>
            <p style={{ fontFamily: T.fontBody, color: T.ink400 }}>
              I couldn't pick a match from that scan. Try another photo with the labels in clearer view.
            </p>
          </div>
        )}
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(next) => { setFiltersAndPersist(next); setFilterOpen(false) }}
        facets={facets}
        totalWines={scoredWines.length}
      />

      <BottomNav activeTab="scan" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}

function NaturalBadge({ wine }) {
  const styles = Array.isArray(wine.wineStyle) ? wine.wineStyle : []
  if (!styles.some(s => ['natural','skin-contact','orange-wine','pét-nat','biodynamic','amphora'].includes(s))) return null

  let label = 'Natural'
  let bg = T.forest100, color = T.forest700
  if (styles.includes('pét-nat'))   { label = 'Pét-Nat';      bg = T.cobalt100; color = T.cobalt700 }
  else if (styles.includes('skin-contact') || styles.includes('orange-wine'))
                                     { label = 'Skin Contact'; bg = T.ochre100;  color = T.ochre700  }
  else if (styles.includes('amphora'))  { label = 'Amphora';   bg = T.ochre100;  color = T.ochre700  }
  else if (styles.includes('biodynamic')){ label = 'Biodynamic'; }

  return (
    <span style={{
      display: 'inline-block', marginTop: 4,
      fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
      background: bg, color, fontFamily: T.fontBody, letterSpacing: '0.04em',
    }}>
      {label}
    </span>
  )
}

const COLOR_PILLS = [
  { key: 'red',    label: 'Red',    activeBg: T.scarlet500, activeColor: 'white'       },
  { key: 'white',  label: 'White',  activeBg: T.ink200,     activeColor: T.ink800      },
  { key: 'rose',   label: 'Rosé',   activeBg: T.scarlet300, activeColor: T.scarlet700  },
  { key: 'orange', label: 'Orange', activeBg: T.ochre400,   activeColor: T.forest700   },
]

function ColorQuickFilter({ facets, filters, onChange }) {
  const available = facets?.colors ?? []
  const visible = COLOR_PILLS.filter(p => available.includes(p.key))
  if (visible.length === 0) return null
  const active = filters?.colors ?? []
  const toggle = (key) => {
    const next = active.includes(key) ? active.filter(c => c !== key) : [...active, key]
    onChange({ ...filters, colors: next })
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
      {visible.map(p => {
        const on = active.includes(p.key)
        return (
          <button
            key={p.key}
            onClick={() => toggle(p.key)}
            style={{
              padding: '5px 14px', borderRadius: 9999, cursor: 'pointer',
              background: on ? p.activeBg : 'transparent',
              border: `1px solid ${on ? p.activeBg : T.ink200}`,
              color: on ? p.activeColor : T.ink500,
              fontFamily: T.fontBody, fontSize: 12, fontWeight: on ? 700 : 500,
              transition: 'all 0.12s ease',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
