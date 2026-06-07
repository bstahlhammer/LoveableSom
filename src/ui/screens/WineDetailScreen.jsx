import { useEffect, useState } from 'react'
import T from '../theme/T.js'
import {
  computeApproachability,
  computeMatch,
  computeMatchWithConfidence,
  explainMatch,
  explainMismatch,
  fetchCatalogImage,
  locateBottleInScan,
} from '@/core/api'
import ShelfSpotlight from '../components/ShelfSpotlight.jsx'
import { StarRating, TasteMatchPicker } from '../components/WineRatingRow.jsx'
import { useShortlist } from '../hooks/useShortlist.js'
import { useWineRatings } from '../hooks/useWineRatings.js'
import { useWineScoreFeedback } from '../hooks/useWineScoreFeedback.js'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../../integrations/supabase/client.ts'

const RETAILER_LABELS = {
  costco:      'Costco',
  trader_joes: "Trader Joe's",
  whole_foods: 'Whole Foods',
  grocery:     'Grocery stores',
  restaurant:  'Restaurants',
  wine_shop:   'Wine shops',
}

const RADAR_AXES = [
  { key: 'body',      label: 'Body'      },
  { key: 'tannin',    label: 'Tannin'    },
  { key: 'acidity',   label: 'Acidity'   },
  { key: 'sweetness', label: 'Sweetness' },
]

function WineRadar({ wine, tasteProfile, size = 180 }) {
  const dims = RADAR_AXES.map(a => ({ label: a.label, value: clamp(wine[a.key] ?? 50) / 100 }))
  const secondary = tasteProfile
    ? RADAR_AXES.map(a => clamp(tasteProfile.palate?.[a.key] ?? 50) / 100)
    : null
  const pad = 32
  const vbSize = size + pad * 2
  const cx = vbSize / 2, cy = vbSize / 2, r = size * 0.36
  const n = dims.length
  const angle = i => (-Math.PI / 2) + (i * 2 * Math.PI / n)
  const point = (i, v) => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v]
  const path = vals => vals.map((v, i) => {
    const [x, y] = point(i, v)
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
  }).join(' ') + ' Z'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${vbSize} ${vbSize}`}>
      {[0.25, 0.5, 0.75, 1].map((rv, i) => (
        <polygon key={i} points={dims.map((_, j) => point(j, rv).join(',')).join(' ')}
          fill="none" stroke={T.ink150} strokeWidth={1} />
      ))}
      {dims.map((_, i) => {
        const [x, y] = point(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={T.ink150} strokeWidth={1} />
      })}
      {secondary && (
        <path d={path(secondary)} fill="rgba(180,60,60,0.12)" stroke={T.scarlet500} strokeWidth={1.5} strokeDasharray="3 3" />
      )}
      <path d={path(dims.map(d => d.value))} fill="rgba(72,130,90,0.22)" stroke={T.forest500} strokeWidth={2} />
      {dims.map((d, i) => {
        const [x, y] = point(i, 1.28)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontFamily="'Outfit',sans-serif" fontSize={10.5} fontWeight={600} fill={T.ink500}>
            {d.label}
          </text>
        )
      })}
      {dims.map((d, i) => {
        const [x, y] = point(i, d.value)
        return <circle key={i} cx={x} cy={y} r={3.5} fill={T.forest500} stroke="white" strokeWidth={1.5} />
      })}
    </svg>
  )
}

function clamp(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

function bottleHue(wine) {
  const text = ((wine?.grape ?? '') + ' ' + (wine?.name ?? '')).toLowerCase()
  if (/merlot|cabernet|syrah|pinot.noir|malbec|tempranillo|barolo|burgundy|bordeaux|rioja|beaujolais/.test(text)) return T.forest700
  if (/ros[eé]|provence/.test(text)) return T.scarlet300
  return T.ochre400
}

function BlankLabel({ hue, width = 114, height = 204 }) {
  const h = hue || T.ochre400
  return (
    <div style={{
      width, height,
      borderRadius: 8,
      background: T.ink0,
      border: `1px solid ${T.ink150}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
      flexShrink: 0,
    }}>
      <div style={{ height: 3, background: h, flexShrink: 0 }} />
    </div>
  )
}

export default function WineDetailScreen({ goBack, navigate, wine, tasteProfile, activeScan, onRate }) {
  const [showHonest, setShowHonest] = useState(false)
  const [showAboutScore, setShowAboutScore] = useState(false)
  const [stars, setStars] = useState(0)
  const [tasteMatch, setTasteMatch] = useState(null)
  const [comment, setComment] = useState('')
  const [headerImgFailed, setHeaderImgFailed] = useState(false)
  const [lazyImageUrl, setLazyImageUrl] = useState(null)
  const [labelRequested, setLabelRequested] = useState(false)
  const [spotlight, setSpotlight] = useState(null)
  const [spotlightLoading, setSpotlightLoading] = useState(true)

  const { user } = useAuth()

  useEffect(() => {
    setHeaderImgFailed(false)
    setLazyImageUrl(null)
    setLabelRequested(false)
    if (!wine?.imageUrl && wine?.name) {
      fetchCatalogImage(wine._catalogId ?? wine.id, wine.name).then(url => {
        if (url) setLazyImageUrl(url)
      })
    }
  }, [wine?._catalogId, wine?.id, wine?.name])

  function retrySpotlight() {
    const hasPhoto = activeScan?.photoBase64 || activeScan?.photoUrl
    if (!hasPhoto || !wine?.name) return
    setSpotlight(null)
    setSpotlightLoading(true)
    locateBottleInScan({ photoUrl: activeScan.photoUrl, photoBase64: activeScan.photoBase64, wineName: wine.name, vintage: wine.vintage, region: wine.region, grape: wine.grape, tileRect: wine._tileRect ?? null })
      .then(result => setSpotlight(result))
      .finally(() => setSpotlightLoading(false))
  }

  useEffect(() => {
    const hasPhoto = activeScan?.photoBase64 || activeScan?.photoUrl
    if (!hasPhoto || !wine?.name) { setSpotlight(null); setSpotlightLoading(false); return }
    let cancelled = false
    setSpotlight(null)
    setSpotlightLoading(true)
    locateBottleInScan({ photoUrl: activeScan.photoUrl, photoBase64: activeScan.photoBase64, wineName: wine.name, vintage: wine.vintage, region: wine.region, grape: wine.grape, tileRect: wine._tileRect ?? null })
      .then(result => { if (!cancelled) setSpotlight(result) })
      .finally(() => { if (!cancelled) setSpotlightLoading(false) })
    return () => { cancelled = true }
  }, [activeScan?.photoUrl, activeScan?.photoBase64, wine?.name, wine?.vintage])

  async function requestLabel() {
    if (!wine?.id || !wine?.name || !user) return
    setLabelRequested(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/label-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ catalog_id: wine.id, wine_name: wine.name }),
      })
    } catch {
      // Fire-and-forget — UI already shows confirmation
    }
  }

  const { saveRating } = useWineRatings()

  if (!wine) return null

  const shortlist = useShortlist()
  const isSaved = shortlist.isSaved(wine)

  const approachability = computeApproachability(wine)
  const rawMatchScore = tasteProfile
    ? (wine.computedMatch ?? computeMatch(wine, tasteProfile))
    : (wine.match ?? null)
  const { score: matchScore, isLow: matchIsLow, reason: matchReason, flags: matchFlags = [], profileConf: matchProfileConf = 0, criticRating: matchCriticRating = null, priceNum: matchPriceNum = null } = tasteProfile
    ? computeMatchWithConfidence({ ...wine, computedMatch: rawMatchScore }, tasteProfile)
    : { score: rawMatchScore, isLow: false, reason: null, flags: [], profileConf: 0, criticRating: null, priceNum: null }
  const matchExplain = tasteProfile ? explainMatch(wine, tasteProfile) : null
  const mismatch = tasteProfile ? explainMismatch(wine, tasteProfile) : null
  const hue = bottleHue(wine)

  const approachLabel = approachability >= 5 ? 'Anyone will love it'
    : approachability >= 4 ? 'Broadly approachable'
    : approachability >= 3 ? 'Wine-curious crowd'
    : approachability >= 2 ? 'For wine lovers'
    : 'For bold palates only'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.ink0 }}>
      {/* Hero — dark zone */}
      <div style={{ background: T.dark, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: -40, right: -30, width: 220, height: 220, borderRadius: '50%', background: hue, opacity: 0.18, filter: 'blur(55px)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 160, height: 160, borderRadius: '50%', background: T.cobalt500, opacity: 0.10, filter: 'blur(44px)' }} />
        </div>

        {/* top bar */}
        <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.forest300, fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}>←</button>
          <button
            onClick={() => shortlist.toggle(wine)}
            style={{ background: 'transparent', border: 'none', color: isSaved ? T.scarlet400 : T.ink500, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >
            {isSaved ? '♥' : '♡'}
          </button>
        </div>

        {/* hero content — two column */}
        <div style={{ padding: '4px 16px 14px', display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>

          {/* left: all wine info stacked */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

            {/* name */}
            <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 19, lineHeight: 1.2, margin: '0 0 5px', letterSpacing: '-0.01em', color: T.ink100, minWidth: 0 }}>
              {wine.name}
            </h1>

            {/* vintage · region · varietal */}
            <div style={{ fontSize: 13, color: T.ink300, fontStyle: 'italic', fontFamily: T.fontDisplay, marginBottom: 6, lineHeight: 1.3 }}>
              {[wine.vintage, wine.region, wine.grape].filter(Boolean).join(' · ')}
            </div>

            <StyleBadges wine={wine} />
            <div style={{ flex: 1 }} />

            {/* stats: critic first, then price(s) */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              {wine.rating > 0 && (
                <div>
                  <div style={{ fontFamily: T.fontBody, fontSize: 9, color: T.ink200, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2, fontWeight: 600 }}>Critic</div>
                  <div style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink100, lineHeight: 1 }}>
                    {wine.rating}{wine.ratingLabel ? <span style={{ fontSize: 11, color: T.ink400, fontWeight: 400, marginLeft: 4 }}>{wine.ratingLabel}</span> : null}
                  </div>
                </div>
              )}
              {(() => {
                const scanLabel = activeScan?.scanType === 'shelf' ? 'Shelf' : activeScan?.scanType === 'list' ? 'Menu' : null
                const sp = wine.scannedPrice
                const cp = wine.catalogPrice
                const statLabel = { fontFamily: T.fontBody, fontSize: 9, color: T.ink200, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2, fontWeight: 600 }
                const statVal = { fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, lineHeight: 1 }
                // Both scanned + catalog prices available and different — show both
                if (sp && cp && sp !== cp && scanLabel) {
                  return (
                    <>
                      <div>
                        <div style={statLabel}>{scanLabel}</div>
                        <div style={{ ...statVal, color: T.ochre400 }}>{sp}</div>
                      </div>
                      <div>
                        <div style={statLabel}>Retail</div>
                        <div style={{ ...statVal, color: T.ink400 }}>{cp}</div>
                      </div>
                    </>
                  )
                }
                // Single price — use best available label
                const price = sp ?? cp ?? wine.price
                if (!price) return null
                const label = sp && scanLabel ? scanLabel : cp ? 'Retail' : 'Price'
                return (
                  <div>
                    <div style={statLabel}>{label}</div>
                    <div style={{ ...statVal, color: T.ochre400 }}>{price}</div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* right: bottle image with match score overlaid top-left */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ position: 'relative' }}>
              {(wine.imageUrl || lazyImageUrl) && !headerImgFailed ? (
                <div style={{ width: 90, height: 160, borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.35)' }}>
                  <img src={wine.imageUrl || lazyImageUrl} alt={wine.name} onError={() => setHeaderImgFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <BlankLabel hue={hue} width={90} height={160} />
              )}
              {matchScore !== null && (() => {
                const circleColor = matchScore >= 70 ? T.forest400 : matchScore >= 50 ? T.ochre400 : T.scarlet400
                const textColor   = '#ffffff'
                return (
                  <div style={{ position: 'absolute', top: -18, left: -18, zIndex: 2 }}>
                    <div style={{
                      position: 'relative',
                      width: 36, height: 36, borderRadius: '50%',
                      border: `2px solid ${circleColor}`,
                      background: '#000000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, color: textColor, lineHeight: 1 }}>
                        {matchScore}
                      </span>
                      <span style={{
                        position: 'absolute', bottom: '100%', left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: 3, whiteSpace: 'nowrap',
                        fontFamily: T.fontBody, fontSize: 7, color: '#ffffff',
                        letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1,
                      }}>match score</span>
                    </div>
                  </div>
                )
              })()}
            </div>
            {!((wine.imageUrl || lazyImageUrl) && !headerImgFailed) && user && wine.id && (
              labelRequested ? (
                <span style={{ fontSize: 10, color: T.forest300, fontFamily: T.fontBody, textAlign: 'center', lineHeight: 1.3 }}>
                  Thanks, we'll track it down
                </span>
              ) : (
                <button
                  onClick={requestLabel}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 10, color: T.ink500, fontFamily: T.fontBody, textAlign: 'center',
                    textDecoration: 'underline', lineHeight: 1.3,
                  }}
                >
                  Missing label?
                </button>
              )
            )}
          </div>
        </div>

      </div>

      {/* Scrollable body */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 16px', position: 'relative', zIndex: 1, background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)` }}>

        {/* Pairing card — hero content block */}
        {wine.pairings?.length > 0 && (
          <div style={{ background: T.forest100, borderRadius: 16, padding: '16px 18px', marginBottom: 14, border: `1px solid ${T.forest300}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.forest700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, fontFamily: T.fontBody }}>
              Pair it with
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {wine.pairings.map(p => (
                <span key={p} style={{
                  fontSize: 13, fontWeight: 500, padding: '6px 12px', borderRadius: 9999,
                  background: 'white', color: T.forest700, border: `1px solid ${T.forest300}`,
                  fontFamily: T.fontBody,
                }}>{p}</span>
              ))}
            </div>
            {matchExplain?.headline && (
              <div style={{ fontSize: 13, color: T.forest700, lineHeight: 1.5, fontFamily: T.fontBody }}>
                {matchExplain.headline}
              </div>
            )}
          </div>
        )}

        {/* Match summary — why this matches your taste */}
        {tasteProfile && matchExplain && matchExplain.axes.length > 0 && (
          <div style={{ background: T.forest50, borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: `1px solid ${T.forest100}` }}>
            <SectionLabel>Why this match</SectionLabel>
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {matchExplain.axes.map((line, i) => (
                <li key={i} style={{ fontSize: 12, color: T.ink600, fontFamily: T.fontBody, lineHeight: 1.5, display: 'flex', gap: 6 }}>
                  <span style={{ color: T.forest500, flexShrink: 0 }}>·</span>{line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tasting notes — italic serif */}
        {wine.tasting && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Tastes like</SectionLabel>
            <p style={{ fontFamily: T.fontDisplay, fontStyle: 'italic', fontSize: 16, color: T.ink800, lineHeight: 1.55, marginTop: 8, marginBottom: 0 }}>
              {wine.tasting}
            </p>
          </div>
        )}

        {/* Flavor tags */}
        {(wine.flavorTags?.length > 0 || wine.tags?.length > 0) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {(wine.flavorTags?.length > 0 ? wine.flavorTags : wine.tags).map(t => (
              <span key={t} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 9999, background: T.ink100, color: T.ink600, fontFamily: T.fontBody, textTransform: 'capitalize' }}>{t.replace(/-/g, ' ')}</span>
            ))}
          </div>
        )}

        {/* About this score — low confidence callout */}
        {matchIsLow && (
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => setShowAboutScore(s => !s)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                background: T.ochre100,
                border: `1px solid ${T.ochre500}`,
                borderRadius: showAboutScore ? '12px 12px 0 0' : 12,
                cursor: 'pointer', textAlign: 'left', fontFamily: T.fontBody,
              }}
            >
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ochre500, fontWeight: 700, fontFamily: T.fontBody }}>
                  Why this score is approximate
                </div>
                <div style={{ fontSize: 13, color: T.ink800, marginTop: 3, lineHeight: 1.4, fontFamily: T.fontBody }}>
                  {matchFlags.includes('quality') || matchFlags.includes('price')
                    ? 'A few things about this wine affect how confident we are.'
                    : 'We need a bit more info about your taste to be fully confident.'}
                </div>
              </div>
              <span style={{ fontSize: 18, color: T.ochre500, marginLeft: 12 }}>{showAboutScore ? '−' : '+'}</span>
            </button>
            {showAboutScore && (
              <div style={{ padding: '12px 14px', background: T.ochre100, border: `1px solid ${T.ochre500}`, borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {matchFlags.includes('profile') && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.3 }}>◎</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink800, fontFamily: T.fontBody, marginBottom: 3 }}>Your profile is still building</div>
                        <div style={{ fontSize: 12, color: T.ink600, fontFamily: T.fontBody, lineHeight: 1.5 }}>
                          We don't have enough wine ratings from you yet to be confident in this score. The more you rate, the sharper this gets.
                        </div>
                        <button
                          onClick={() => navigate?.('myWines')}
                          style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, fontFamily: T.fontBody, fontSize: 12, fontWeight: 700, color: T.ochre700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                        >
                          Rate wines you've tried →
                        </button>
                      </div>
                    </div>
                  )}
                  {matchFlags.includes('quality') && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.3 }}>⚠</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink800, fontFamily: T.fontBody, marginBottom: 3 }}>Lower-rated wine</div>
                        <div style={{ fontSize: 12, color: T.ink600, fontFamily: T.fontBody, lineHeight: 1.5 }}>
                          Critics score this wine {matchCriticRating ?? wine.rating}/100. We dial back the match confidence for wines that aren't broadly acclaimed — that doesn't mean you won't enjoy it.
                        </div>
                      </div>
                    </div>
                  )}
                  {matchFlags.includes('price') && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.3 }}>⚠</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink800, fontFamily: T.fontBody, marginBottom: 3 }}>Budget-tier wine</div>
                        <div style={{ fontSize: 12, color: T.ink600, fontFamily: T.fontBody, lineHeight: 1.5 }}>
                          At {wine.price ?? (matchPriceNum != null ? `$${matchPriceNum}` : 'this price point')}, there's less flavor data available for wines in this range, so the match is approximate.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Style profile */}
        {(wine.body != null || wine.tannin != null || wine.acidity != null || wine.sweetness != null) && (
          <div style={{ marginBottom: 18 }}>
            <SectionLabel>Style profile{tasteProfile ? ' · vs your palate' : ''}</SectionLabel>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              <WineRadar wine={wine} tasteProfile={tasteProfile} />
            </div>
            {tasteProfile && (
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={16} height={3}><line x1={0} y1={1.5} x2={16} y2={1.5} stroke={T.forest500} strokeWidth={2} /></svg>
                  <span style={{ fontSize: 10, fontFamily: T.fontBody, color: T.ink400 }}>This wine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={16} height={3}><line x1={0} y1={1.5} x2={16} y2={1.5} stroke={T.scarlet500} strokeWidth={1.5} strokeDasharray="3 3" /></svg>
                  <span style={{ fontSize: 10, fontFamily: T.fontBody, color: T.ink400 }}>Your palate</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Honest take / mismatch */}
        {tasteProfile && mismatch && mismatch.reasons.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowHonest(s => !s)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                background: mismatch.severity === 'high' ? T.scarlet100 : T.ink50,
                border: `1px solid ${mismatch.severity === 'high' ? T.scarlet300 : T.ink150}`,
                borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: T.fontBody,
              }}
            >
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: mismatch.severity === 'high' ? T.scarlet500 : T.ink400, fontWeight: 700, fontFamily: T.fontBody }}>
                  Honest take
                </div>
                <div style={{ fontSize: 13, color: T.ink800, marginTop: 3, lineHeight: 1.4, fontFamily: T.fontBody }}>
                  {mismatch.headline}
                </div>
              </div>
              <span style={{ fontSize: 18, color: T.ink400, marginLeft: 12 }}>{showHonest ? '−' : '+'}</span>
            </button>
            {showHonest && (
              <div style={{ padding: '12px 14px', background: 'white', border: `1px solid ${T.ink150}`, borderRadius: 12, marginTop: 4 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mismatch.reasons.map((r, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{
                        flexShrink: 0, width: 6, height: 6, borderRadius: '50%', marginTop: 7,
                        background: r.severity === 'high' ? T.scarlet500 : r.severity === 'medium' ? T.ochre500 : T.lime500,
                      }} />
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.ink400, fontFamily: T.fontBody, fontWeight: 600 }}>{r.axis}</div>
                        <div style={{ fontSize: 12, color: T.ink700, fontFamily: T.fontBody, lineHeight: 1.5, marginTop: 2 }}>{r.text}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Find it on the shelf */}
        {(activeScan?.photoBase64 || activeScan?.photoUrl) && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Find it on the shelf</SectionLabel>
            <ShelfSpotlight
              photoUrl={activeScan.photoBase64 ? `data:image/jpeg;base64,${activeScan.photoBase64}` : activeScan.photoUrl}
              bbox={spotlight?.found ? spotlight.bbox : null}
              loading={spotlightLoading}
              error={spotlight?.found === false ? true : null}
              onRetry={retrySpotlight}
              label={wine.name}
            />
          </div>
        )}

        {/* Approachability + Adventurousness */}
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i <= approachability ? T.forest500 : T.ink150 }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.fontBody }}>{approachLabel}</span>
          </div>
          {wine.adventurousness >= 5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i <= Math.ceil(wine.adventurousness / 2) ? T.scarlet400 : T.ink150 }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.fontBody }}>
                {wine.adventurousness >= 8 ? 'Boldly adventurous' : wine.adventurousness >= 6 ? 'Adventurous pick' : 'Somewhat adventurous'}
              </span>
            </div>
          )}
        </div>

        {/* Where to find it */}
        {!activeScan && wine.retailers?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Typically available at</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {wine.retailers.map(r => (
                <span key={r} style={{
                  padding: '5px 12px', background: T.ink100, borderRadius: 9999,
                  fontSize: 12, color: T.ink700, fontFamily: T.fontBody,
                }}>{RETAILER_LABELS[r] ?? r}</span>
              ))}
            </div>
            <p style={{ fontSize: 11, color: T.ink400, fontFamily: T.fontBody, marginTop: 6 }}>Availability varies by location.</p>
          </div>
        )}

        {/* Find online */}
        <div style={{ marginBottom: 16 }}>
          <a
            href={`https://www.wine-searcher.com/find/${encodeURIComponent([wine.name, wine.vintage].filter(Boolean).join(' '))}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%', padding: '13px', boxSizing: 'border-box',
              background: `linear-gradient(180deg, ${T.cobalt400} 0%, ${T.cobalt500} 100%)`,
              color: 'white', border: 'none', borderRadius: 9999,
              fontSize: 13, fontFamily: T.fontBody, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              textDecoration: 'none',
            }}
          >
            <span>🔍</span>
            <span>Find this wine online</span>
          </a>
        </div>

        {/* Score feedback — only when user is logged in and there's a score to rate */}
        {user && (matchScore !== null || wine.rating > 0) && (
          <ScoreFeedback wine={wine} matchScore={matchScore} user={user} />
        )}

        {/* Bottom padding */}
        <div style={{ height: 24 }} />
      </div>

      {/* Sticky footer */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${T.ink100}`, background: T.ink0, padding: '12px 16px 28px' }}>
        {/* Primary CTA */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => shortlist.toggle(wine)}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 9999, border: 'none', cursor: 'pointer',
              background: `linear-gradient(180deg, ${T.forest400} 0%, ${T.forest500} 100%)`,
              color: 'white', fontSize: 14, fontWeight: 600, fontFamily: T.fontBody,
            }}
          >
            {isSaved ? '✓ Saved' : '🍾 I\'m getting this'}
          </button>
        </div>

        {/* Rate this wine */}
        <div style={{ borderTop: `1px solid ${T.ink100}`, paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ochre500, fontFamily: T.fontBody, fontWeight: 700 }}>
              Rate this wine
            </div>
            {stars > 0 && (
              <button
                onClick={() => {
                  const bucketId = stars >= 5 ? 'loved' : stars >= 4 ? 'liked' : stars >= 3 ? 'ok' : stars >= 2 ? 'disliked' : 'hated'
                  saveRating({ wineId: String(wine.id), bucketId, stars, tasteMatch, wine })
                  onRate?.({ stars, tasteMatch, comment, wineId: String(wine.id), bucketId, wineData: wine })
                }}
                style={{ background: 'none', border: 'none', padding: 0, fontFamily: T.fontBody, fontSize: 12, fontWeight: 700, color: T.forest500, cursor: 'pointer' }}
              >
                Save
              </button>
            )}
          </div>

          <StarRating value={stars} onChange={setStars} />

          {stars > 0 && <TasteMatchPicker value={tasteMatch} onChange={setTasteMatch} />}

          {tasteMatch !== null && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a note (optional)…"
              rows={2}
              style={{
                width: '100%', marginTop: 8, padding: '8px 10px',
                borderRadius: 10, border: `1px solid ${T.ink150}`,
                fontFamily: T.fontBody, fontSize: 13, color: T.ink800,
                background: T.ink50, resize: 'none', boxSizing: 'border-box', outline: 'none',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const SCORE_CHOICES = [
  { id: 'nailed_it',    label: 'Nailed it'    },
  { id: 'pretty_close', label: 'Pretty close' },
  { id: 'missed_it',    label: 'Missed it'    },
]

function ScoreFeedback({ wine, matchScore, user }) {
  const rawId = wine._catalogId ?? wine.id
  const wineCatalogId = (typeof rawId === 'number' || (typeof rawId === 'string' && /^\d+$/.test(rawId)))
    ? Number(rawId) : null

  const { existing, loading, error, submit } = useWineScoreFeedback({
    wineCatalogId,
    wineName: wine.name ?? '',
    userId: user?.id,
  })

  const [picked, setPicked]       = useState(null)
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (existing) {
      setPicked(existing.accuracy)
      setNote(existing.note ?? '')
      setConfirmed(true)
    }
  }, [existing])

  if (loading) return null

  async function handlePick(accuracy) {
    setPicked(accuracy)
    if (accuracy === 'missed_it') return // wait for note + send
    setSaving(true)
    const ok = await submit({ accuracy, note: null, tasteFitScore: matchScore, wePoints: wine.rating ?? null })
    setSaving(false)
    if (ok) setConfirmed(true)
  }

  async function handleSendMissed() {
    setSaving(true)
    const ok = await submit({ accuracy: 'missed_it', note, tasteFitScore: matchScore, wePoints: wine.rating ?? null })
    setSaving(false)
    if (ok) setConfirmed(true)
  }

  if (confirmed && picked) {
    const choice = SCORE_CHOICES.find(c => c.id === picked)
    return (
      <div style={{ marginBottom: 16, padding: '12px 14px', background: T.forest100, border: `1px solid ${T.forest300}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.forest700, lineHeight: 1.4 }}>
          ✓ {choice?.label} — thanks for the feedback
        </span>
        <button
          onClick={() => { setConfirmed(false); setPicked(null); setNote('') }}
          style={{ background: 'none', border: 'none', fontFamily: T.fontBody, fontSize: 12, color: T.ink400, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0, marginLeft: 12, flexShrink: 0 }}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16, padding: '14px 16px', background: T.ink50, border: `1px solid ${T.ink150}`, borderRadius: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.ink400, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: T.fontBody, marginBottom: 5 }}>
        How'd We Do?
      </div>
      <div style={{ fontSize: 13, color: T.ink700, fontFamily: T.fontBody, marginBottom: 10, lineHeight: 1.4 }}>
        Did our score match your experience?
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SCORE_CHOICES.map(c => {
          const active = picked === c.id
          const bg     = active ? (c.id === 'nailed_it' ? T.forest100 : c.id === 'pretty_close' ? T.ochre100 : T.scarlet100) : 'transparent'
          const border = active ? (c.id === 'nailed_it' ? T.forest500 : c.id === 'pretty_close' ? T.ochre500 : T.scarlet500) : T.ink200
          const color  = active ? (c.id === 'nailed_it' ? T.forest700 : c.id === 'pretty_close' ? T.ochre700 : T.scarlet600) : T.ink500
          return (
            <button
              key={c.id}
              onClick={() => !saving && handlePick(c.id)}
              style={{
                padding: '7px 14px', borderRadius: 9999,
                border: `1.5px solid ${border}`, background: bg, color,
                fontFamily: T.fontBody, fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: saving ? 'default' : 'pointer', transition: 'all 100ms',
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>
      {picked === 'missed_it' && (
        <>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What was off? (optional)"
            rows={2}
            style={{
              width: '100%', marginTop: 10, padding: '8px 10px',
              borderRadius: 10, border: `1px solid ${T.ink150}`,
              fontFamily: T.fontBody, fontSize: 13, color: T.ink800,
              background: T.ink0, resize: 'none', boxSizing: 'border-box', outline: 'none',
            }}
          />
          <button
            onClick={handleSendMissed}
            disabled={saving}
            style={{
              marginTop: 8, padding: '8px 18px', borderRadius: 9999,
              border: 'none', background: T.scarlet500, color: 'white',
              fontFamily: T.fontBody, fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Send feedback'}
          </button>
        </>
      )}
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: T.scarlet600, fontFamily: T.fontBody }}>{error}</div>
      )}
    </div>
  )
}

function StyleBadges({ wine }) {
  const styles = Array.isArray(wine.wineStyle) ? wine.wineStyle : []
  const adv = wine.adventurousness ?? 3

  let badge = null
  if (styles.includes('pét-nat'))
    badge = { label: 'Pét-Nat', bg: T.cobalt100, color: T.cobalt700 }
  else if (styles.includes('skin-contact') || styles.includes('orange-wine'))
    badge = { label: 'Skin Contact', bg: T.ochre100, color: T.ochre700 }
  else if (styles.includes('amphora'))
    badge = { label: 'Amphora', bg: T.ochre100, color: T.ochre700 }
  else if (styles.includes('biodynamic'))
    badge = { label: 'Biodynamic', bg: T.forest100, color: T.forest700 }
  else if (styles.includes('natural'))
    badge = { label: 'Natural', bg: T.forest100, color: T.forest700 }
  else if (adv >= 7)
    badge = { label: 'Adventurous pick', bg: T.scarlet100, color: T.scarlet600 }

  if (!badge) return null

  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 9999,
        background: badge.bg, color: badge.color,
        fontFamily: T.fontBody, letterSpacing: '0.04em',
      }}>
        {badge.label}
      </span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink400, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.fontBody }}>
      {children}
    </div>
  )
}

function AxisRow({ label, lo, hi, wineValue, userValue, descriptor: desc }) {
  const wPct = clamp(wineValue)
  const uPct = typeof userValue === 'number' ? clamp(userValue) : null
  const delta = uPct !== null ? Math.abs(wPct - uPct) : 0
  const aligned = uPct !== null && delta < 12
  const off = uPct !== null && delta >= 28
  const markerColor = aligned ? T.lime500 : off ? T.scarlet500 : T.ochre500

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink800, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400 }}>{desc}</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: T.ink100, borderRadius: 3, overflow: 'visible' }}>
        {/* Wine fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', width: `${wPct}%`,
          background: `linear-gradient(90deg, ${T.forest400}, ${T.forest500})`,
          borderRadius: 3,
        }} />
        {/* Wine dot */}
        <div style={{
          position: 'absolute', left: `${wPct}%`, top: -3,
          width: 12, height: 12, marginLeft: -6,
          borderRadius: '50%', background: T.forest500,
          border: `2px solid white`, boxShadow: `0 0 0 1px ${T.forest500}55`,
        }} />
        {/* User palate triangle */}
        {uPct !== null && (
          <div style={{
            position: 'absolute', left: `${uPct}%`, top: 10,
            width: 0, height: 0, marginLeft: -5,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: `7px solid ${markerColor}`,
          }} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: uPct !== null ? 14 : 4 }}>
        <span style={{ fontFamily: T.fontBody, fontSize: 10, color: T.ink400 }}>{lo}</span>
        <span style={{ fontFamily: T.fontBody, fontSize: 10, color: T.ink400 }}>{hi}</span>
      </div>
      {uPct !== null && (
        <div style={{ fontSize: 10, color: markerColor, fontFamily: T.fontBody, marginTop: 2 }}>
          {aligned ? '◆ aligns with your palate' : off ? '◆ notably different from your palate' : '◆ slight difference from your palate'}
        </div>
      )}
    </div>
  )
}
