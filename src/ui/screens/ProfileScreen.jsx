import { useState, useEffect } from 'react'
import T from '../theme/T.js'
import VocabTerm, { VocabSheet } from '../components/VocabTerm.jsx'
import { useVocabSheet } from '../hooks/useVocabSheet.js'
import glossary from '@/core/data/wineGlossary.js'
import { nearestTasteProfile, buildTasteIdentity } from '@/core/api'
import { useTasteProfileSync } from '../hooks/useTasteProfileSync.js'
import { supabase } from '@/integrations/supabase/client'
import { trackEvent } from '@/core/analytics'
import { describePalate } from '@/core/engine/palateDescriptor.js'

const AXES = [
  { key: 'body',      label: 'body',      lo: 'light',    hi: 'full'   },
  { key: 'sweetness', label: 'sweetness', lo: 'bone dry', hi: 'sweet'  },
  { key: 'tannin',    label: 'tannin',    lo: 'soft',     hi: 'grippy' },
  { key: 'acidity',   label: 'acidity',   lo: 'round',    hi: 'crisp'  },
]

const CHAR_AXES = [
  { key: 'earthiness', label: 'Earthiness', lo: 'clean',       hi: 'forest floor', color: '#8B6914' },
  { key: 'funk',       label: 'Funk',       lo: 'clean',       hi: 'barnyard',     color: '#9B1E1E' },
  { key: 'mineral',    label: 'Mineral',    lo: 'soft',        hi: 'volcanic',     color: '#1B4F8A' },
  { key: 'oak',        label: 'Oak',        lo: 'unoaked',     hi: 'toasty',       color: '#7B4E1A' },
  { key: 'floral',     label: 'Floral',     lo: 'none',        hi: 'perfumed',     color: '#6B2D8B' },
]

const PROFILE_VIEWS = [
  { id: 'radar',   label: 'Radar',   icon: '✦' },
  { id: 'stats',   label: 'Stats',   icon: '≡' },
  { id: 'tonight', label: 'Tonight', icon: '◑' },
  { id: 'words',   label: 'Words',   icon: '✎' },
  { id: 'receipt', label: 'Receipt', icon: '◎' },
  { id: 'account', label: 'Account', icon: '⚙' },
]

const SAMPLE_REGIONS = [
  { name: 'Loire',      score: 0.91, n: 8 },
  { name: 'Burgundy',   score: 0.82, n: 6 },
  { name: 'Mosel',      score: 0.74, n: 4 },
  { name: 'Beaujolais', score: 0.61, n: 3 },
  { name: 'Napa',       score: 0.32, n: 2 },
]
const SAMPLE_GRAPES = [
  { name: 'Sauv. Blanc', score: 0.92, n: 9 },
  { name: 'Chardonnay',  score: 0.78, n: 7 },
  { name: 'Pinot Noir',  score: 0.86, n: 6 },
  { name: 'Riesling',    score: 0.41, n: 4 },
  { name: 'Gamay',       score: 0.66, n: 3 },
]
const SAMPLE_GAPS = [
  { area: 'Reds, full-bodied', n: 2, need: 5, why: "You've only logged 2, not enough to call it." },
  { area: 'Italian wines',     n: 1, need: 4, why: 'One scan, one rating. We have no read here.' },
  { area: 'Sweet & dessert',   n: 0, need: 3, why: "You've skipped sweet styles. Tell us if that's wrong." },
]
const SAMPLE_SHIFTS = [
  { dir: -1, label: 'less oak',      detail: '3 of your last 5 highs were unoaked whites.' },
  { dir: -1, label: 'lighter body',  detail: 'You rated a heavy Napa Cab ★★ last week.' },
  { dir: +1, label: 'more adventurous', detail: "You've tried 3 new grapes this month." },
]
const SAMPLE_EVENTS = [
  { d: 'Mar 14', name: 'Sancerre, Vacheron 2022',   star: 5, changes: ['+acidity', '+body'] },
  { d: 'Mar 8',  name: 'Chablis 1er Cru, Raveneau', star: 4, changes: ['−sweetness'] },
  { d: 'Mar 2',  name: 'Napa Cab, Caymus 2020',      star: 2, changes: ['−body', '−tannin'] },
  { d: 'Feb 22', name: 'Pinot Noir, Drouhin 2021',   star: 5, changes: ['−tannin'] },
  { d: 'Feb 14', name: 'Albariño, Pazo Señoráns',    star: 4, changes: ['+acidity'] },
]

function palateDescriptor(axis, value) {
  if (axis === 'body')      return value >= 75 ? 'Full' : value >= 50 ? 'Medium' : 'Light'
  if (axis === 'sweetness') return value >= 60 ? 'Sweet' : value >= 35 ? 'Off-dry' : value >= 15 ? 'Dry' : 'Bone dry'
  if (axis === 'tannin')    return value >= 75 ? 'High' : value >= 45 ? 'Medium' : 'Low'
  if (axis === 'acidity')   return value >= 65 ? 'High' : value >= 45 ? 'Medium' : 'Low'
  return ''
}

function Radar({ size = 220, dims, secondary, onLabelTap }) {
  const pad = 30
  const vbSize = size + pad * 2
  const cx = vbSize / 2, cy = vbSize / 2, r = size * 0.36
  const n = dims.length
  const angle = (i) => (-Math.PI / 2) + (i * 2 * Math.PI / n)
  const point = (i, v) => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v]
  const path = (vals) => vals.map((v, i) => {
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
        <path d={path(secondary)}
          fill={T.scarlet500} fillOpacity={0.12}
          stroke={T.scarlet500} strokeWidth={1.5} strokeDasharray="3 3" />
      )}
      <path d={path(dims.map(d => d.value))}
        fill={T.forest500} fillOpacity={0.22}
        stroke={T.forest500} strokeWidth={2} />
      {dims.map((d, i) => {
        const [x, y] = point(i, 1.24)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontFamily="'Outfit',sans-serif" fontSize={10.5} fontWeight={600}
            fill={onLabelTap ? T.forest500 : T.ink500}
            onClick={onLabelTap ? () => onLabelTap(d.label.toLowerCase()) : undefined}
            style={{ cursor: onLabelTap ? 'pointer' : 'default', textDecoration: onLabelTap ? 'underline' : 'none', textDecorationStyle: 'dotted' }}>
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

function SecLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink400, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}

// ─── Palate Translation ───────────────────────────────────────────────────────
function PalateTranslation({ palate }) {
  const result = describePalate(palate)
  if (!result) return null
  return (
    <div style={{
      background: T.forest50, borderRadius: 14, padding: '14px 16px',
      border: `1px solid ${T.forest100}`, marginBottom: 18,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.forest500, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.fontBody, marginBottom: 8 }}>
        What this means for you
      </div>
      <p style={{ fontFamily: T.fontDisplay, fontStyle: 'italic', fontSize: 16, color: T.ink800, lineHeight: 1.45, margin: '0 0 10px' }}>
        {result.headline}
      </p>
      {result.sentences.map((s, i) => (
        <p key={i} style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink600, lineHeight: 1.6, margin: i < result.sentences.length - 1 ? '0 0 8px' : 0 }}>
          {s}
        </p>
      ))}
      {result.shopWords.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.ink400, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.fontBody, marginBottom: 6 }}>
            Look for these words
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {result.shopWords.map(w => (
              <span key={w} style={{
                fontSize: 11.5, padding: '4px 10px', borderRadius: 9999,
                background: T.forest100, color: T.forest700,
                fontFamily: T.fontBody, fontWeight: 500,
              }}>{w}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── View A: Radar ────────────────────────────────────────────────────────────
function RadarView({ radarDims, tasteProfile, character, onVocabTerm }) {
  const charEntries = character
    ? CHAR_AXES.map(a => ({ ...a, value: character[a.key] })).filter(a => a.value != null)
    : []
  return (
    <>
      <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
        <div style={{ fontSize: 11, color: T.forest500, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          ✦ Your palate
        </div>
        <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 30, lineHeight: 1.05, margin: '0 0 4px', letterSpacing: '-0.01em', color: T.ink900 }}>
          <em style={{ color: T.forest500 }}>{tasteProfile.name}</em>
        </h1>
        {tasteProfile.description && (
          <div style={{ fontSize: 13, color: T.ink500, fontStyle: 'italic', fontFamily: T.fontDisplay, lineHeight: 1.45, maxWidth: 280, margin: '0 auto' }}>
            {tasteProfile.description}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 0' }}>
        <Radar size={220} dims={radarDims} onLabelTap={onVocabTerm} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 10.5, color: T.ink500, marginTop: -4, marginBottom: 18 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.forest500 }} /> high confidence
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.ink300 }} /> still learning
        </span>
      </div>

      <PalateTranslation palate={tasteProfile?.palate} />

      <div style={{ marginBottom: 18 }}>
        <SecLabel>Recent shifts · last 30 days</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SAMPLE_SHIFTS.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: 'white', border: `1px solid ${T.ink150}`, borderRadius: 10,
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: s.dir > 0 ? T.forest100 : T.cobalt100,
                color: s.dir > 0 ? T.forest500 : T.cobalt500,
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>{s.dir > 0 ? '↑' : '↓'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink800 }}>Trending {s.label}</div>
                <div style={{ fontSize: 11.5, color: T.ink500, marginTop: 1 }}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: T.ink50, borderRadius: 14, padding: '14px 16px', border: `1px dashed ${T.ink200}`, marginBottom: charEntries.length > 0 ? 16 : 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          ⚠ We're still learning
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SAMPLE_GAPS.map((g, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink800 }}>{g.area}</span>
                <span style={{ fontSize: 11, color: T.ink400, fontVariantNumeric: 'tabular-nums' }}>{g.n}/{g.need}</span>
              </div>
              <div style={{ height: 3, background: T.ink150, borderRadius: 2, marginBottom: 5 }}>
                <div style={{ width: `${(g.n / g.need) * 100}%`, height: '100%', background: T.ochre500, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11.5, color: T.ink500, lineHeight: 1.4 }}>{g.why}</div>
            </div>
          ))}
        </div>
      </div>

      {charEntries.length > 0 && (
        <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: `1px solid ${T.ink150}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink400, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            ✦ Character preferences
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {charEntries.map(a => (
              <div key={a.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: a.color }}>{a.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: a.color }}>
                    {a.value >= 78 ? 'Defining' : a.value >= 55 ? 'Prominent' : a.value >= 35 ? 'Subtle' : 'Hint'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.ink400, marginBottom: 4 }}>
                  <span>{a.lo}</span>
                  <span>{a.hi}</span>
                </div>
                <div style={{ position: 'relative', height: 8, background: T.ink100, borderRadius: 4 }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: `${a.value}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 14, height: 14, borderRadius: '50%', background: a.color,
                    border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── View B: Stats ────────────────────────────────────────────────────────────
function StatsView({ palate, updateAxis, handleSaveTune, savingTune, onVocabTerm }) {
  return (
    <>
      <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 24, lineHeight: 1.1, margin: '4px 0 16px', letterSpacing: '-0.01em', color: T.ink900 }}>
        Your taste, by the numbers
      </h2>

      <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: `1px solid ${T.ink150}`, boxShadow: T.shadowMd }}>
        <SecLabel>Style profile · drag to adjust</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {AXES.map(a => (
            <div key={a.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: onVocabTerm ? T.forest500 : T.ink700, textTransform: 'capitalize', borderBottom: onVocabTerm ? `1px dotted ${T.forest400}` : 'none', cursor: onVocabTerm ? 'pointer' : 'default' }}
                  onClick={onVocabTerm ? () => onVocabTerm(a.key) : undefined}
                >{a.key}</span>
                <span style={{ fontSize: 11, color: T.forest500, fontWeight: 700 }}>{palateDescriptor(a.key, palate[a.key])}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: T.ink400, marginBottom: 4 }}>
                <span>{a.lo}</span>
                <span>{a.hi}</span>
              </div>
              <input
                type="range" min="0" max="100" value={palate[a.key]}
                onChange={e => updateAxis(a.key, e.target.value)}
                style={{ width: '100%', accentColor: T.forest500 }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => handleSaveTune('stats')}
          disabled={savingTune}
          style={{
            width: '100%', padding: '12px', marginTop: 18,
            background: savingTune ? T.ink200 : `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
            color: savingTune ? T.ink500 : 'white',
            border: 'none', borderRadius: 100,
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
            cursor: savingTune ? 'default' : 'pointer',
          }}
        >
          {savingTune ? 'Saving…' : 'Save palate'}
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: `1px solid ${T.ink150}` }}>
        <SecLabel>Regions you love</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SAMPLE_REGIONS.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: T.ink800 }}>{r.name}</span>
              <div style={{ flex: 1, height: 6, background: T.ink100, borderRadius: 3 }}>
                <div style={{ width: `${r.score * 100}%`, height: '100%', background: T.forest500, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 10.5, color: T.ink400, width: 25, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.n}×</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: `1px solid ${T.ink150}` }}>
        <SecLabel>Grapes you love</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SAMPLE_GRAPES.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: T.ink800 }}>{g.name}</span>
              <div style={{ flex: 1, height: 6, background: T.ink100, borderRadius: 3 }}>
                <div style={{ width: `${g.score * 100}%`, height: '100%', background: T.cobalt500, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 10.5, color: T.ink400, width: 25, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{g.n}×</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: T.scarlet100, borderRadius: 14, padding: '12px 14px', border: `1px solid ${T.scarlet300}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.scarlet600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          ⚠ 3 areas we can't read yet
        </div>
        <div style={{ fontSize: 12.5, color: T.ink700, lineHeight: 1.45 }}>
          Italian, Spanish, sweet styles. We'll guess conservatively until you scan more.
        </div>
      </div>
    </>
  )
}

// ─── View C: Tonight ──────────────────────────────────────────────────────────
function TonightView({ radarDims, tonightDims }) {
  const diverging = AXES.filter((a, i) => Math.abs(tonightDims[i] - radarDims[i].value) > 0.06)
  return (
    <>
      <div style={{
        background: `linear-gradient(135deg, ${T.cobalt500}, ${T.cobalt700})`,
        color: 'white', borderRadius: 18, padding: '16px 18px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>
          Tonight's occasion
        </div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 500, lineHeight: 1.15, marginBottom: 8 }}>
          Anniversary dinner, splurging
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['celebrating', 'red meat', 'up to $150', 'impress'].map(c => (
            <span key={c} style={{
              fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 9999,
              background: 'rgba(255,255,255,0.18)', color: 'white',
            }}>{c}</span>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 20, margin: '0 0 2px', letterSpacing: '-0.01em', color: T.ink900 }}>
          Tonight nudges you off-profile
        </h2>
        <div style={{ fontSize: 11.5, color: T.ink500, fontStyle: 'italic', fontFamily: T.fontDisplay }}>
          Solid: you · Dashed: tonight's lens
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 0' }}>
        <Radar size={220} dims={radarDims} secondary={tonightDims} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 10.5, color: T.ink500, marginTop: -4, marginBottom: 18 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 14, height: 2, background: T.forest500, display: 'inline-block' }} /> your taste
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 14, height: 0, borderTop: `2px dashed ${T.scarlet500}`, display: 'inline-block' }} /> tonight's lens
        </span>
      </div>

      {diverging.length > 0 && (
        <>
          <SecLabel>Where they diverge</SecLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {diverging.map((a) => {
              const idx = AXES.indexOf(a)
              const myVal = radarDims[idx].value
              const tvVal = tonightDims[idx]
              const delta = tvVal - myVal
              return (
                <div key={a.key} style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: `1px solid ${T.ink150}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.ink800, textTransform: 'capitalize' }}>{a.key}</span>
                    <span style={{ fontSize: 11, color: T.scarlet600, fontWeight: 600 }}>
                      {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} tonight
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 8, background: T.ink100, borderRadius: 4, marginBottom: 6 }}>
                    <div style={{
                      position: 'absolute', top: '50%', left: `${myVal * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 14, height: 14, borderRadius: '50%', background: T.forest500, border: '2px solid white',
                    }} />
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left: `${tvVal * 100}%`,
                      width: 2, background: T.scarlet500, transform: 'translateX(-50%)', borderRadius: 1,
                    }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: T.ink500, lineHeight: 1.4 }}>
                    {a.key === 'body' && "Steak pulls toward fuller body. We'll suggest a touch heavier."}
                    {a.key === 'tannin' && "Celebration reds lean grippier. We'll stay within your range."}
                    {a.key === 'sweetness' && "Tonight's context softens the sweetness preference slightly."}
                    {a.key === 'acidity' && 'Rich food softens acid preference. Small nudge.'}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div style={{
        background: T.forest100, borderRadius: 14, padding: '14px 16px',
        border: `1px solid ${T.forest300}`, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1, fontSize: 12.5, color: T.forest700, lineHeight: 1.45 }}>
          Want picks that <strong>ignore tonight</strong> and stick strictly to your profile?
        </div>
        <button style={{
          background: 'white', color: T.forest700, border: `1px solid ${T.forest300}`,
          padding: '7px 12px', borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: T.fontBody,
        }}>Yes</button>
      </div>
    </>
  )
}

// ─── View D: Words ────────────────────────────────────────────────────────────
function WordsView({
  tasteProfile, palate, updateAxis,
  character, updateCharAxis, toggleCharAxis,
  aversions, aversionInput, setAversionInput, addAversion, removeAversion,
  handleSaveTune, savingTune, navigate,
  feedbackText, setFeedbackText,
}) {
  return (
    <>
      <div style={{
        background: T.cobalt900, color: 'white', borderRadius: 20, padding: '20px 20px 18px',
        marginBottom: 14, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%',
          background: T.forest100, filter: 'blur(30px)',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ochre400, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            ✎ How we describe you
          </div>
          <p style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 400, lineHeight: 1.45, margin: 0, fontStyle: 'italic' }}>
            {tasteProfile.description
              ? <><strong style={{ color: T.lime400, fontStyle: 'normal' }}>{tasteProfile.name}</strong> — {tasteProfile.description}</>
              : <>You drink <strong style={{ color: T.lime400, fontStyle: 'normal' }}>crisp, dry whites</strong>, cool-climate Loire and Burgundy. Light, low-tannin reds when you reach for red. You skip oaky and sweet.</>
            }
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['crisp', 'dry', 'cool-climate', 'low oak', 'curious'].map(tag => (
              <span key={tag} style={{
                fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 9999,
                background: 'rgba(255,255,255,0.12)', color: 'white',
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: `1px solid ${T.ink150}` }}>
        <SecLabel>✎ Tell us what to change</SecLabel>
        <textarea
          value={feedbackText}
          onChange={e => setFeedbackText(e.target.value)}
          placeholder="Tell us what to change — e.g. push me toward more adventurous, less oak, cheaper bottles…"
          maxLength={2000}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${T.ink150}`, borderRadius: 12, padding: '10px 12px',
            fontSize: 13, color: T.ink900, lineHeight: 1.5, fontFamily: T.fontBody,
            minHeight: 72, marginBottom: 10, resize: 'vertical', outline: 'none',
            background: 'white', display: 'block',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['less sweet', 'more reds', 'open me up', 'cheaper', 'splurgier'].map(s => (
            <button key={s}
              onClick={() => setFeedbackText(t => t ? `${t}, ${s}` : s)}
              style={{
                fontSize: 11.5, fontWeight: 500, padding: '6px 10px', borderRadius: 9999,
                background: T.ink50, color: T.ink600, border: `1px solid ${T.ink150}`,
                cursor: 'pointer', fontFamily: T.fontBody,
              }}>+ {s}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', border: `1px solid ${T.ink150}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20, boxShadow: T.shadowMd }}>
        <SecLabel>Fine-tune your palate</SecLabel>
        <div style={{ fontSize: 12, color: T.ink500, marginBottom: 14, lineHeight: 1.5 }}>
          Drag to adjust — save when it feels right.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {AXES.map(a => (
            <div key={a.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: T.ink800, fontWeight: 600, textTransform: 'capitalize' }}>{a.key}</span>
                <span style={{ color: T.forest500, fontWeight: 700 }}>{palateDescriptor(a.key, palate[a.key])}</span>
              </div>
              <input
                type="range" min="0" max="100" value={palate[a.key]}
                onChange={e => updateAxis(a.key, e.target.value)}
                style={{ width: '100%', accentColor: T.forest500 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 10, color: T.ink400 }}>{a.lo}</span>
                <span style={{ fontSize: 10, color: T.ink400 }}>{a.hi}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: T.ink100, margin: '20px 0 16px' }} />
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink400, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Character preferences
        </div>
        <div style={{ fontSize: 12, color: T.ink500, marginBottom: 14, lineHeight: 1.5 }}>
          Toggle an axis on to express a preference. Leave it off if you don't care either way.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CHAR_AXES.map(a => {
            const active = character[a.key] != null
            return (
              <div key={a.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: active ? 6 : 0 }}>
                  <button
                    onClick={() => toggleCharAxis(a.key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    <span style={{
                      width: 32, height: 18, borderRadius: 9, display: 'inline-block',
                      background: active ? a.color : T.ink150,
                      position: 'relative', transition: 'background 0.2s',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        position: 'absolute', top: 2, left: active ? 14 : 2, width: 14, height: 14,
                        borderRadius: '50%', background: 'white',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? a.color : T.ink600 }}>{a.label}</span>
                  </button>
                  {active && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: a.color }}>
                      {character[a.key] >= 78 ? 'Defining' : character[a.key] >= 55 ? 'Prominent' : character[a.key] >= 35 ? 'Subtle' : 'Hint'}
                    </span>
                  )}
                </div>
                {active && (
                  <>
                    <input
                      type="range" min="0" max="100" value={character[a.key]}
                      onChange={e => updateCharAxis(a.key, e.target.value)}
                      style={{ width: '100%', accentColor: a.color }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: T.ink400 }}>{a.lo}</span>
                      <span style={{ fontSize: 10, color: T.ink400 }}>{a.hi}</span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleSaveTune}
          disabled={savingTune}
          style={{
            width: '100%', padding: '13px', marginTop: 20,
            background: savingTune ? T.ink200 : `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
            color: savingTune ? T.ink500 : 'white',
            border: 'none', borderRadius: 100,
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
            cursor: savingTune ? 'default' : 'pointer',
          }}
        >
          {savingTune ? 'Saving…' : 'Save palate'}
        </button>
        <button
          onClick={() => navigate('quizIntro')}
          style={{
            display: 'block', margin: '10px auto 0', background: 'none', border: 'none',
            color: T.ink400, fontFamily: T.fontBody, fontSize: 13,
            textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', padding: 6,
          }}
        >
          Or retake the guided tasting →
        </button>
      </div>

      <div style={{ background: 'white', border: `1px solid ${T.ink150}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20, boxShadow: T.shadowMd }}>
        <SecLabel>Varietals to avoid</SecLabel>
        <div style={{ fontSize: 12, color: T.ink500, marginBottom: 12, lineHeight: 1.5 }}>
          Wines with these varietals will be ranked lower in your results.
        </div>
        {aversions.varietals.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {aversions.varietals.map(v => (
              <span key={v} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, padding: '4px 10px',
                background: T.scarlet100, color: T.scarlet600,
                border: `1px solid ${T.scarlet300}`, borderRadius: 9999,
              }}>
                {v}
                <button
                  onClick={() => removeAversion(v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.scarlet500, padding: 0, lineHeight: 1, fontSize: 14 }}
                  aria-label={`Remove ${v}`}
                >×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={aversionInput}
            onChange={e => setAversionInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAversion() } }}
            placeholder="e.g. Cabernet Sauvignon"
            style={{
              flex: 1, padding: '9px 12px',
              border: `1px solid ${T.ink200}`, borderRadius: 10,
              fontFamily: T.fontBody, fontSize: 13, color: T.ink900,
              background: 'white', outline: 'none',
            }}
          />
          <button
            onClick={addAversion}
            style={{
              padding: '9px 14px',
              background: T.ink100, color: T.ink700,
              border: `1px solid ${T.ink200}`, borderRadius: 10,
              fontFamily: T.fontBody, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >Add</button>
        </div>
        <div style={{ fontSize: 11, color: T.ink400, marginTop: 8 }}>
          Changes take effect after saving your palate above.
        </div>
      </div>
    </>
  )
}

// ─── View E: Receipt ──────────────────────────────────────────────────────────
function ReceiptView({ palate }) {
  return (
    <>
      <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 24, lineHeight: 1.1, margin: '4px 0 4px', letterSpacing: '-0.01em', color: T.ink900 }}>
        A receipt of your taste
      </h2>
      <p style={{ fontSize: 12.5, color: T.ink500, lineHeight: 1.5, margin: '0 0 14px' }}>
        Every rating moves a dial. Here's what moved.
      </p>

      <div style={{ background: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 14, border: `1px solid ${T.ink150}` }}>
        <SecLabel>Where you stand now</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {AXES.map(a => (
            <div key={a.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: T.ink700, textTransform: 'capitalize' }}>{a.key}</span>
                <span style={{ fontSize: 10.5, color: T.forest500, fontWeight: 600 }}>{palateDescriptor(a.key, palate[a.key])}</span>
              </div>
              <div style={{ position: 'relative', height: 5, background: T.ink100, borderRadius: 3 }}>
                <div style={{
                  position: 'absolute', top: '50%', left: `${palate[a.key]}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 11, height: 11, borderRadius: '50%', background: T.forest500, border: '2px solid white',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <SecLabel>Recent moves · newest first</SecLabel>
      <div style={{ position: 'relative', paddingLeft: 18 }}>
        <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1.5, background: T.ink200 }} />
        {SAMPLE_EVENTS.map((e, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: 12 }}>
            <div style={{
              position: 'absolute', left: -17, top: 3, width: 11, height: 11, borderRadius: '50%',
              background: 'white', border: `2px solid ${T.forest500}`,
            }} />
            <div style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: `1px solid ${T.ink150}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: T.ink400, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{e.d}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink900, marginTop: 2 }}>{e.name}</div>
                </div>
                <div style={{ fontSize: 11, color: T.ochre500, letterSpacing: '0.05em' }}>
                  {'★'.repeat(e.star)}<span style={{ color: T.ink200 }}>{'★'.repeat(5 - e.star)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {e.changes.map((c, j) => (
                  <span key={j} style={{
                    fontSize: 11.5, padding: '2px 8px', borderRadius: 6,
                    background: c.startsWith('+') ? T.forest100 : T.cobalt100,
                    color: c.startsWith('+') ? T.forest500 : T.cobalt500,
                    fontWeight: 600,
                  }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 6, padding: '12px 14px', background: 'white', borderRadius: 12,
        border: `1px dashed ${T.ink200}`, fontSize: 12, color: T.ink500, lineHeight: 1.5,
      }}>
        <strong style={{ color: T.ink700 }}>You can undo any of these.</strong> If a rating doesn't reflect your taste, tap and remove its weight.
      </div>
    </>
  )
}

// ─── View F: Account ──────────────────────────────────────────────────────────
function AccountView({
  auth, displayName, setDisplayName, handleSaveName, savingName,
  onSignOut, confirmDelete, setConfirmDelete, handleDeleteAccount, deleting,
}) {
  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ fontSize: 12, color: T.ink400, marginBottom: 20 }}>
        Signed in as <strong style={{ color: T.ink700 }}>{auth?.user?.email}</strong>
      </div>

      <div style={{ background: 'white', border: `1px solid ${T.ink150}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16, boxShadow: T.shadowMd }}>
        <SecLabel>Display name</SecLabel>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
            style={{
              flex: 1, padding: '10px 12px',
              border: `1px solid ${T.ink200}`, borderRadius: 10,
              fontFamily: T.fontBody, fontSize: 14, color: T.ink900,
              background: 'white', outline: 'none',
            }}
          />
          <button
            onClick={handleSaveName}
            disabled={savingName}
            style={{
              padding: '10px 16px',
              background: T.forest500, color: 'white',
              border: 'none', borderRadius: 10,
              fontFamily: T.fontBody, fontSize: 13, fontWeight: 600,
              cursor: savingName ? 'default' : 'pointer', opacity: savingName ? 0.6 : 1,
            }}
          >
            {savingName ? '…' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '13px',
            background: 'transparent', color: T.cobalt500,
            border: `1px solid ${T.cobalt300}`, borderRadius: 100,
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Sign out
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%', background: 'none', border: 'none',
              color: T.scarlet600, fontFamily: T.fontBody, fontSize: 13,
              textDecoration: 'underline', textUnderlineOffset: 3,
              cursor: 'pointer', padding: 8,
            }}
          >
            Delete my account and data
          </button>
        ) : (
          <div style={{ border: `1px solid ${T.scarlet300}`, borderRadius: 14, padding: 16, background: T.scarlet100 }}>
            <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink800, marginBottom: 12, lineHeight: 1.5 }}>
              This permanently deletes your taste profile, scan history, and account. There's no undo.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  flex: 1, padding: '11px',
                  background: T.scarlet500, color: 'white',
                  border: 'none', borderRadius: 100,
                  fontFamily: T.fontBody, fontSize: 13, fontWeight: 600,
                  cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: '11px',
                  background: 'white', color: T.ink600,
                  border: `1px solid ${T.ink200}`, borderRadius: 100,
                  fontFamily: T.fontBody, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── View Bar ─────────────────────────────────────────────────────────────────
function ProfileViewBar({ active, onChange }) {
  return (
    <div className="hide-scrollbar" style={{
      flexShrink: 0,
      borderTop: `1px solid ${T.ink150}`,
      backgroundColor: 'white',
      padding: '10px 12px',
      display: 'flex',
      gap: 6,
      overflowX: 'auto',
    }}>
      {PROFILE_VIEWS.map(v => {
        const on = v.id === active
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            style={{
              flex: '1 0 auto',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 10px',
              background: on ? T.forest100 : 'transparent',
              border: `1px solid ${on ? T.forest300 : 'transparent'}`,
              borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1, color: on ? T.forest500 : T.ink400 }}>{v.icon}</span>
            <span style={{
              fontSize: 9.5, fontFamily: T.fontBody, fontWeight: on ? 700 : 500,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: on ? T.forest500 : T.ink400, lineHeight: 1,
            }}>{v.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigate, goBack, auth, tasteProfile, onProfileUpdate }) {
  const { openTerm, vocabEntry, closeVocab } = useVocabSheet()
  const { saveProfile } = useTasteProfileSync(auth?.user?.id)
  const [palate, setPalate] = useState(tasteProfile?.palate || { body: 50, sweetness: 30, tannin: 50, acidity: 55 })
  const [character, setCharacter] = useState(tasteProfile?.character || {})
  const [aversions, setAversions] = useState(tasteProfile?.aversions ?? { varietals: [] })
  const [aversionInput, setAversionInput] = useState('')
  const [displayName, setDisplayName] = useState(auth?.profile?.display_name || '')
  const [savingTune, setSavingTune] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [view, setView] = useState('radar')
  const [feedbackText, setFeedbackText] = useState('')

  useEffect(() => {
    if (!auth?.user?.id) return
    supabase
      .from('profiles')
      .select('recommendation_feedback')
      .eq('user_id', auth.user.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.recommendation_feedback) setFeedbackText(data.recommendation_feedback) })
  }, [auth?.user?.id])

  function flash(msg) { setToast(msg); setTimeout(() => setToast(null), 2000) }
  function updateAxis(key, value) { setPalate(p => ({ ...p, [key]: Number(value) })) }
  function updateCharAxis(key, value) { setCharacter(c => ({ ...c, [key]: Number(value) })) }
  function toggleCharAxis(key) {
    setCharacter(c => ({ ...c, [key]: c[key] == null ? 50 : null }))
  }
  function addAversion() {
    const v = aversionInput.trim()
    if (!v) return
    if (!aversions.varietals.map(x => x.toLowerCase()).includes(v.toLowerCase())) {
      setAversions(a => ({ ...a, varietals: [...a.varietals, v] }))
    }
    setAversionInput('')
  }
  function removeAversion(v) {
    setAversions(a => ({ ...a, varietals: a.varietals.filter(x => x !== v) }))
  }

  async function handleSaveTune(source = 'words') {
    if (!tasteProfile) return
    setSavingTune(true)
    const archetype = nearestTasteProfile(palate)
    const charToSave = Object.keys(character).length > 0 ? character : null
    const identity = buildTasteIdentity(palate, charToSave)
    const updated = {
      ...tasteProfile,
      ...archetype,
      name: identity?.name ?? archetype.name,
      description: identity?.description ?? archetype.description,
      archetype,
      palate,
      character: charToSave,
      aversions,
    }
    await saveProfile(updated, { refined: true, recommendationFeedback: feedbackText || null })
    onProfileUpdate?.(updated)
    setSavingTune(false)
    flash('Palate updated')
    if (source === 'stats') {
      trackEvent('palate_refined', { source: 'stats_sliders', axisCount: 4 })
    } else if (feedbackText.trim()) {
      trackEvent('recommendation_feedback_saved', { charCount: feedbackText.length })
    }
  }

  async function handleSaveName() {
    if (!auth?.user?.id) return
    setSavingName(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', auth.user.id)
    setSavingName(false)
    flash(error ? 'Could not save' : 'Name updated')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('home')
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      await supabase.auth.signOut()
      navigate('home')
    } catch {
      flash('Could not delete account')
    } finally {
      setDeleting(false)
    }
  }

  if (!tasteProfile) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
        background: T.ink0, fontFamily: T.fontBody, position: 'relative',
      }}>
        <div style={{ padding: '16px 22px 0', flexShrink: 0 }}>
          <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 22, cursor: 'pointer', padding: '0 0 10px', display: 'block' }}>←</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px 48px', textAlign: 'center', gap: 12 }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 26, color: T.ink800, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            No taste profile yet
          </div>
          <div style={{ color: T.ink400, fontSize: 14, maxWidth: 260, lineHeight: 1.6 }}>
            Take the quick guided tasting to unlock personalized matches.
          </div>
          <button
            onClick={() => navigate('quizIntro')}
            style={{
              marginTop: 8, padding: '13px 28px',
              background: `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
              color: 'white', border: 'none', borderRadius: 100,
              fontFamily: T.fontBody, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Help me find wines I'll love
          </button>
        </div>
      </div>
    )
  }

  const radarDims = AXES.map(a => ({ label: a.label, value: palate[a.key] / 100 }))
  const tonightDims = radarDims.map((d, i) => {
    const offsets = [0.12, -0.08, 0.10, -0.06]
    return Math.min(1, Math.max(0, d.value + offsets[i]))
  })

  function renderView() {
    switch (view) {
      case 'radar':
        return <RadarView radarDims={radarDims} tasteProfile={tasteProfile} character={character} onVocabTerm={openTerm} />
      case 'stats':
        return <StatsView palate={palate} updateAxis={updateAxis} handleSaveTune={handleSaveTune} savingTune={savingTune} onVocabTerm={openTerm} />
      case 'tonight':
        return <TonightView radarDims={radarDims} tonightDims={tonightDims} />
      case 'words':
        return (
          <WordsView
            tasteProfile={tasteProfile}
            palate={palate} updateAxis={updateAxis}
            character={character} updateCharAxis={updateCharAxis} toggleCharAxis={toggleCharAxis}
            aversions={aversions} aversionInput={aversionInput}
            setAversionInput={setAversionInput} addAversion={addAversion} removeAversion={removeAversion}
            handleSaveTune={handleSaveTune} savingTune={savingTune}
            navigate={navigate}
            feedbackText={feedbackText} setFeedbackText={setFeedbackText}
          />
        )
      case 'receipt':
        return <ReceiptView palate={palate} />
      case 'account':
        return (
          <AccountView
            auth={auth}
            displayName={displayName} setDisplayName={setDisplayName}
            handleSaveName={handleSaveName} savingName={savingName}
            onSignOut={handleSignOut}
            confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
            handleDeleteAccount={handleDeleteAccount} deleting={deleting}
          />
        )
      default:
        return <RadarView radarDims={radarDims} tasteProfile={tasteProfile} />
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      background: T.ink0, fontFamily: T.fontBody, position: 'relative', overflow: 'hidden',
    }}>
      {/* watercolor washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -40, left: -40, width: 220, height: 220, borderRadius: '50%', background: T.forest300, opacity: 0.07, filter: 'blur(52px)' }} />
        <div style={{ position: 'absolute', top: 80, right: -30, width: 180, height: 180, borderRadius: '50%', background: T.cobalt300, opacity: 0.06, filter: 'blur(44px)' }} />
      </div>

      {/* top bar */}
      <div style={{ padding: '16px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 1, position: 'relative' }}>
        <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}>←</button>
        <span style={{ fontSize: 12, color: T.ink500, fontWeight: 600 }}>Your taste</span>
        <button onClick={() => navigate('quizIntro')} style={{ background: 'transparent', border: 'none', color: T.cobalt500, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.fontBody }}>Refine</button>
      </div>

      {/* scrollable body */}
      <div className="hide-scrollbar" style={{
        flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '8px 22px 40px', position: 'relative', zIndex: 1,
        background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)`,
      }}>
        {renderView()}
      </div>

      <ProfileViewBar active={view} onChange={setView} />

      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: T.dark, color: T.ink0,
          padding: '9px 18px', borderRadius: 100,
          fontFamily: T.fontBody, fontSize: 13, fontWeight: 500,
          zIndex: 100, pointerEvents: 'none',
          boxShadow: T.shadowLg,
        }}>
          {toast}
        </div>
      )}

      <VocabSheet entry={vocabEntry} onClose={closeVocab} />
    </div>
  )
}
