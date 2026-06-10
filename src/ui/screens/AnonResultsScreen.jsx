import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import T from '../theme/T.js'
import { sortWines, applyFilters, getFilterFacets, EMPTY_FILTERS, getWines } from '@/core/api'
import { fitBarTone } from '../constants/matchThresholds.js'
import SortToggle from '../components/SortToggle.jsx'
import UpsellBanner from '../components/UpsellBanner.jsx'
import BottomNav from '../components/BottomNav.jsx'
import FilterBar from '../components/FilterBar.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import { useShortlist } from '../hooks/useShortlist.js'
import { saveScroll, getScroll } from '../utils/scrollStore.js'

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

function ScoreBar({ score }) {
  if (score == null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 5, background: T.ink100, borderRadius: 3 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: T.ink300, minWidth: 32, textAlign: 'right', fontFamily: T.fontBody }}>—</span>
      </div>
    )
  }
  const tone = fitBarTone(score, T)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: T.ink100, borderRadius: 3, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${score}%`, background: tone, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: tone, minWidth: 32, textAlign: 'right', fontFamily: T.fontBody }}>{score}</span>
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

function AnonWineRowCard({ wine, rank, onTap, onSave, saved, sortKey }) {
  const score = wine.rating ?? null
  const cardBg = (score ?? 0) >= 70 ? 'white' : T.ink50

  return (
    <div
      onClick={() => onTap?.(wine)}
      style={{
        padding: '14px 14px', marginBottom: 8,
        background: cardBg,
        border: `1px solid ${T.ink150}`,
        borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: T.ink400, fontWeight: 600, fontFamily: T.fontBody }}>#{rank + 1}</span>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 16, color: T.ink900, lineHeight: 1.2, marginTop: 3 }}>
            {wine.name}
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
      <ScoreBar score={score} />
      {wine.tasting && (
        <p style={{ fontSize: 12, color: T.ink500, margin: 0, lineHeight: 1.5, fontFamily: T.fontBody, fontStyle: 'italic' }}>
          {wine.tasting}
        </p>
      )}
    </div>
  )
}

function defaultSortKey(buyingFor, scanIntent) {
  const tags = scanIntent?.tags ?? []
  if (tags.includes('splurge'))  return 'value'
  if (buyingFor === 'gift')      return 'value'
  return 'crowd'  // default: crowd-pleaser works for group, 'me' without a profile, and everything else
}

const SORT_SUBTITLE = {
  match:     'taste fit',
  crowd:     'crowd & critic score',
  rating:    'critic score',
  value:     'best value',
  price_asc: 'price: low–high',
}

export default function AnonResultsScreen({ navigate, goBack, onWineSelect, tasteProfile, scannedWines, scanIntent, buyingFor, scanId, sortKey, onSortChange }) {
  const hasProfile = !!tasteProfile
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [showOnlySaved, setShowOnlySaved] = useState(false)
  const [showMatchPrompt, setShowMatchPrompt] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const shortlist = useShortlist()
  const scrollRef = useRef(null)
  const isMountRef = useRef(true)

  const setFiltersAndPersist = useCallback(f => { setFilters(f) }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = getScroll('anonResults')
    isMountRef.current = false
    const save = () => saveScroll('anonResults', el.scrollTop)
    el.addEventListener('scroll', save, { passive: true })
    return () => el.removeEventListener('scroll', save)
  }, [])

  // Scroll to top whenever sortKey changes (but not on initial mount)
  useEffect(() => {
    if (isMountRef.current) return
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [sortKey])

  const { allWines, scanAttempted, readability, retakeReasons, scanMessage } = useMemo(() => {
    const r = normalizeScanResult(scannedWines)
    if (!r) return {
      allWines: getWines(), scanAttempted: false,
      readability: 'good', retakeReasons: [],
      scanMessage: 'I could not identify a specific wine from that image. Try a closer, sharper photo where the full bottle label, shelf tag, or wine-list line is readable.',
    }
    const wines = r.wines?.length ? r.wines : []
    return {
      allWines:      wines.length ? wines : [],
      scanAttempted: true,
      readability:   r.readability,
      retakeReasons: r.retakeReasons,
      scanMessage:   r.message || 'I could not identify a specific wine from that image. Try a closer, sharper photo where the full bottle label, shelf tag, or wine-list line is readable.',
    }
  }, [scannedWines])

  const facets = useMemo(() => getFilterFacets(allWines), [allWines])
  const filteredWines = useMemo(() => applyFilters(allWines, filters), [allWines, filters])

  const sortOptions = useMemo(() => [
    { value: 'match',     label: 'My Taste', highlight: !hasProfile },
    { value: 'crowd',     label: 'Crowd Pleaser' },
    { value: 'rating',    label: 'Critic Score' },
    { value: 'value',     label: 'Best Value' },
    { value: 'price_asc', label: 'Price: Low–High' },
  ], [hasProfile])

  const handleSortChange = (next) => {
    if (next === 'match' && !hasProfile) {
      setShowMatchPrompt(true)
      setTimeout(() => setShowMatchPrompt(false), 5000)
      return
    }
    setShowMatchPrompt(false)
    onSortChange(next)
  }

  const sortedWines = useMemo(
    () => sortWines(filteredWines, sortKey, hasProfile ? tasteProfile : null),
    [filteredWines, sortKey, tasteProfile, hasProfile]
  )

  const lowConfidenceCount = useMemo(
    () => allWines.filter(w => typeof w.confidence === 'number' && w.confidence < 60).length,
    [allWines]
  )
  const showLowConfidenceWarning = scanAttempted && allWines.length > 0 &&
    lowConfidenceCount / allWines.length >= 0.3

  const showRetakePanel = scanAttempted && readability !== 'good'
  const noWines = scanAttempted && allWines.length === 0
  const filteredEmpty = scanAttempted && allWines.length > 0 && filteredWines.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.ink0, position: 'relative', overflow: 'hidden' }}>
      {/* Watercolor washes */}
      <div style={{ position: 'absolute', top: -80, left: -80, width: 280, height: 280, borderRadius: '50%', background: T.cobalt500, opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: -40, right: -60, width: 200, height: 200, borderRadius: '50%', background: T.scarlet500, opacity: 0.04, filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <div style={{ padding: '52px 22px 12px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
          <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.fontBody }}>
            {noWines ? 'No wine identified' : `${allWines.length} wine${allWines.length !== 1 ? 's' : ''} found`}
          </span>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(m => !m)}
              style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >⋯</button>
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setMenuOpen(false)} />
                <div style={{
                  position: 'absolute', top: 28, right: 0, zIndex: 20,
                  background: 'white', borderRadius: 12, border: `1px solid ${T.ink150}`,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
                  minWidth: 180, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('scanPrompt') }}
                    style={{
                      display: 'block', width: '100%', padding: '13px 16px', textAlign: 'left',
                      background: 'none', border: 'none', borderBottom: `1px solid ${T.ink100}`,
                      fontFamily: T.fontBody, fontSize: 13, color: T.ink800, cursor: 'pointer',
                    }}
                  >📷  Scan again</button>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('home') }}
                    style={{
                      display: 'block', width: '100%', padding: '13px 16px', textAlign: 'left',
                      background: 'none', border: 'none',
                      fontFamily: T.fontBody, fontSize: 13, color: T.ink800, cursor: 'pointer',
                    }}
                  >🏠  Go to home</button>
                </div>
              </>
            )}
          </div>
        </div>
        <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 28, lineHeight: 1.1, margin: '0 0 6px', letterSpacing: '-0.01em', color: T.ink900 }}>
          {noWines
            ? <><em style={{ color: T.scarlet500 }}>Nothing identified.</em> Try again.</>
            : !scanAttempted
              ? <>Explore wines.</>
              : <><em style={{ color: T.cobalt500 }}>{filteredWines.length} wine{filteredWines.length !== 1 ? 's' : ''}</em> from your scan.</>
          }
        </h1>
        <p style={{ fontSize: 12, color: T.ink400, margin: 0, lineHeight: 1.45, fontFamily: T.fontBody }}>
          {noWines
            ? 'Take another photo to get a reliable result'
            : !scanAttempted
              ? 'Scores based on crowd & critic ratings'
              : `Sorted by ${SORT_SUBTITLE[sortKey] ?? 'crowd & critic score'}${scanIntent?.label ? ` · ${scanIntent.label}` : ''} · tap any to explore`
          }
        </p>
      </div>

      {/* Filter bar */}
      {allWines.length > 0 && (
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <FilterBar
            filters={filters}
            onOpen={() => setFilterOpen(true)}
            onChange={setFiltersAndPersist}
            resultCount={filteredWines.length}
            totalCount={allWines.length}
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

        {/* Guest upsell — peak intent moment after a scan */}
        {scanAttempted && !hasProfile && allWines.length > 0 && (
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: `linear-gradient(135deg, ${T.cobalt50}, ${T.forest50})`,
              border: `1px solid ${T.cobalt100}`,
            }}>
              <div style={{ fontFamily: T.fontBody, fontSize: 13, fontWeight: 600, color: T.ink900, marginBottom: 4 }}>
                See which of these you'll actually love
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.ink500, marginBottom: 12, lineHeight: 1.5 }}>
                Build your taste profile to get a personal match score for each wine — takes about 60 seconds.
              </div>
              <button
                onClick={() => navigate('quizIntro')}
                style={{
                  width: '100%', padding: '11px 0',
                  background: `linear-gradient(180deg, ${T.cobalt400} 0%, ${T.cobalt500} 100%)`,
                  color: 'white', border: 'none', borderRadius: 9999,
                  fontFamily: T.fontBody, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Get personalized matches →
              </button>
            </div>
          </div>
        )}

        {/* Anon legend */}
        {allWines.length > 0 && !hasProfile && (
          <div style={{ padding: '10px 16px 0' }}>
            <div style={{ padding: '6px 10px', background: T.ink50, borderRadius: 8, fontFamily: T.fontBody, fontSize: 11, color: T.ink400 }}>
              Scores reflect crowd & critic ratings.{' '}
              <button
                onClick={() => navigate('quizIntro')}
                style={{ background: 'none', border: 'none', padding: 0, color: T.forest500, fontFamily: T.fontBody, fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >
                Build your taste profile
              </button>
              {' '}to see your personal match.
            </div>
          </div>
        )}

        {/* My Taste sort prompt when no profile */}
        {showMatchPrompt && (
          <div style={{ padding: '8px 16px 0' }}>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: T.cobalt50, border: `1px solid ${T.cobalt100}`, fontFamily: T.fontBody, fontSize: 13, color: T.ink800 }}>
              <button
                onClick={() => navigate('quizIntro')}
                style={{ background: 'none', border: 'none', padding: 0, color: T.cobalt500, fontFamily: T.fontBody, fontSize: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >
                Build your taste profile
              </button>
              {' '}to sort by your personal match score.
            </div>
          </div>
        )}

        {/* Retake guidance */}
        {showRetakePanel && (
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ border: `1px solid ${T.ochre500}50`, borderRadius: 14, background: T.ochre100, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: T.ochre500, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                {noWines ? 'No reliable read' : 'Partial read'}
              </div>
              <p style={{ fontFamily: T.fontDisplay, fontSize: 16, color: T.ink800, lineHeight: 1.4, margin: '0 0 10px' }}>
                {noWines ? scanMessage : 'I read part of the list. A second photo will give you better picks.'}
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

        {/* Low confidence warning */}
        {showLowConfidenceWarning && (
          <div style={{ padding: '8px 16px 0' }}>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: T.ochre100, border: `1px solid ${T.ochre500}55`, fontFamily: T.fontBody, fontSize: 12, color: T.ink700 }}>
              Some labels were hard to read. Try a sharper photo for a more complete list.
            </div>
          </div>
        )}

        {/* Empty filtered set */}
        {filteredEmpty && (
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

        {/* Upsell banner (bottom) */}
        {!hasProfile && sortedWines.length > 0 && <UpsellBanner onCta={() => navigate('quizIntro')} />}

        {/* Shortlist-only view */}
        {showOnlySaved && (
          <div style={{ padding: '14px 16px 80px' }}>
            <div style={{ marginBottom: 10, fontFamily: T.fontBody, fontSize: 10, color: T.ink400, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Your shortlist</div>
            {shortlist.list.length === 0
              ? <p style={{ fontFamily: T.fontBody, color: T.ink400 }}>Nothing saved yet.</p>
              : shortlist.list.map((wine, i) => (
                  <AnonWineRowCard key={wine._scanIdx ?? wine.id ?? wine.name} wine={wine} rank={i} onTap={onWineSelect} onSave={() => shortlist.toggle(wine)} saved />
                ))
            }
          </div>
        )}

        {/* Sort toggle + wine list */}
        {!showOnlySaved && sortedWines.length > 0 && (
          <div style={{ padding: '10px 16px 80px' }}>
            <ColorQuickFilter facets={facets} filters={filters} onChange={setFiltersAndPersist} />
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SortToggle options={sortOptions} value={sortKey} onChange={handleSortChange} />
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
              <AnonWineRowCard
                key={wine._scanIdx ?? wine.id ?? wine.name}
                wine={wine}
                rank={i}
                sortKey={sortKey}
                onTap={onWineSelect}
                onSave={() => shortlist.toggle(wine)}
                saved={shortlist.isSaved(wine)}
              />
            ))}
          </div>
        )}

        {/* Pure no-wines case */}
        {noWines && !showRetakePanel && (
          <div style={{ padding: 16 }}>
            <p style={{ fontFamily: T.fontBody, color: T.ink400 }}>{scanMessage}</p>
          </div>
        )}
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(next) => { setFiltersAndPersist(next); setFilterOpen(false) }}
        facets={facets}
        totalWines={allWines.length}
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
