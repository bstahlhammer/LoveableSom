import { useState } from 'react'
import { theme } from '../theme/theme.js'
import { getRatingBuckets, getWineSearchIndex } from '@/core/api'
import { useWineRatings } from '../hooks/useWineRatings.js'

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function AddWineSheet({ onClose, onSaved }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null) // { id, name, ... } from catalog OR custom
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualMaker, setManualMaker] = useState('')
  const [manualVintage, setManualVintage] = useState('')
  const [manualColor, setManualColor] = useState('')
  const [bucketId, setBucketId] = useState(null)
  const [saving, setSaving] = useState(false)

  const { saveRating } = useWineRatings()
  const buckets = getRatingBuckets()

  const results = query.length >= 1
    ? getWineSearchIndex().filter(w => {
        const q = query.toLowerCase()
        return (
          w.name.toLowerCase().includes(q) ||
          (w.grape || '').toLowerCase().includes(q) ||
          (w.region || '').toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : []

  function pickCatalog(w) {
    setPicked({ id: w.id, name: w.name, source: 'catalog' })
    setManualMode(false)
  }

  function commitManual() {
    const name = manualName.trim()
    if (!name) return
    const idParts = ['custom', slugify(name)]
    if (manualMaker.trim()) idParts.push(slugify(manualMaker))
    if (manualVintage.trim()) idParts.push(slugify(manualVintage))
    setPicked({
      id: idParts.join(':'),
      name: [manualMaker.trim(), name, manualVintage.trim()].filter(Boolean).join(' '),
      color: manualColor || null,
      source: 'custom',
    })
  }

  async function save() {
    if (!picked || !bucketId) return
    setSaving(true)
    await saveRating({ wineId: picked.id, bucketId })
    setSaving(false)
    onSaved?.(`Logged ${picked.name}`)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(20, 8, 30, 0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: theme.colors.cream,
          color: theme.colors.brand,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          maxHeight: '85vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: theme.spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            margin: 0, fontFamily: theme.typography.fontDisplay,
            fontSize: 20, fontWeight: 600,
          }}>Rate a wine I tried</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, lineHeight: 1, padding: 4, color: theme.colors.brand,
            }}
            aria-label="Close"
          >×</button>
        </div>

        {!picked && !manualMode && (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, grape, or region…"
              style={{
                width: '100%', padding: '12px 14px', boxSizing: 'border-box',
                fontFamily: theme.typography.fontSans, fontSize: 14,
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.colors.brand}33`,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map(w => (
                <button
                  key={w.id}
                  onClick={() => pickCatalog(w)}
                  style={{
                    textAlign: 'left', padding: '10px 12px',
                    background: 'white', border: `1px solid ${theme.colors.brand}1a`,
                    borderRadius: theme.radius.sm, cursor: 'pointer',
                    fontFamily: theme.typography.fontSans, fontSize: 13,
                    color: theme.colors.brand,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{w.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    {[w.vintage, w.grape, w.region].filter(Boolean).join(' · ')}
                  </div>
                </button>
              ))}
              {query.length >= 1 && results.length === 0 && (
                <div style={{
                  padding: '8px 4px', fontFamily: theme.typography.fontSans,
                  fontSize: 12, opacity: 0.7,
                }}>
                  No matches. Add it manually below.
                </div>
              )}
            </div>
            <button
              onClick={() => setManualMode(true)}
              style={{
                marginTop: 4,
                padding: '10px 12px', borderRadius: theme.radius.sm,
                border: `1px dashed ${theme.colors.brand}55`,
                background: 'transparent', cursor: 'pointer',
                fontFamily: theme.typography.fontSans, fontSize: 13, fontWeight: 600,
                color: theme.colors.brand,
              }}
            >
              Add it manually
            </button>
          </>
        )}

        {!picked && manualMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            <Field label="Wine name *">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Whispering Angel"
                style={inputStyle}
              />
            </Field>
            <Field label="Producer / maker">
              <input
                value={manualMaker}
                onChange={(e) => setManualMaker(e.target.value)}
                placeholder="e.g. Château d’Esclans"
                style={inputStyle}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Vintage" style={{ flex: 1 }}>
                <input
                  value={manualVintage}
                  onChange={(e) => setManualVintage(e.target.value)}
                  placeholder="2022 or NV"
                  style={inputStyle}
                />
              </Field>
              <Field label="Color" style={{ flex: 1 }}>
                <select
                  value={manualColor}
                  onChange={(e) => setManualColor(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">—</option>
                  <option value="red">Red</option>
                  <option value="white">White</option>
                  <option value="rose">Rosé</option>
                  <option value="sparkling">Sparkling</option>
                  <option value="dessert">Dessert</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={commitManual}
                disabled={!manualName.trim()}
                style={{
                  flex: 1, padding: '12px', borderRadius: theme.radius.sm,
                  border: 'none', cursor: manualName.trim() ? 'pointer' : 'not-allowed',
                  background: theme.colors.brand, color: theme.colors.cream,
                  fontFamily: theme.typography.fontSans, fontSize: 13, fontWeight: 700,
                  opacity: manualName.trim() ? 1 : 0.5,
                }}
              >Continue</button>
              <button
                onClick={() => setManualMode(false)}
                style={{
                  padding: '12px 16px', borderRadius: theme.radius.sm,
                  border: `1px solid ${theme.colors.brand}33`, cursor: 'pointer',
                  background: 'transparent', color: theme.colors.brand,
                  fontFamily: theme.typography.fontSans, fontSize: 13,
                }}
              >Back</button>
            </div>
          </div>
        )}

        {picked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{
              padding: theme.spacing.sm,
              background: 'white', borderRadius: theme.radius.sm,
              border: `1px solid ${theme.colors.brand}1a`,
            }}>
              <div style={{ fontFamily: theme.typography.fontDisplay, fontSize: 16, fontWeight: 600 }}>
                {picked.name}
              </div>
              <button
                onClick={() => { setPicked(null); setBucketId(null) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: theme.colors.brand, opacity: 0.7,
                  fontSize: 12, padding: 0, marginTop: 4,
                  textDecoration: 'underline',
                  fontFamily: theme.typography.fontSans,
                }}
              >Change</button>
            </div>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: theme.colors.magenta,
                fontFamily: theme.typography.fontSans, marginBottom: 6,
              }}>
                How was it?
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {buckets.map(b => {
                  const active = bucketId === b.id
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBucketId(b.id)}
                      style={{
                        flex: '1 1 calc(33% - 6px)', minWidth: 92,
                        padding: '10px 8px', borderRadius: theme.radius.sm,
                        border: active ? `1px solid ${theme.colors.magenta}` : `1px solid ${theme.colors.brand}33`,
                        background: active ? `${theme.colors.magenta}22` : 'white',
                        color: theme.colors.brand, cursor: 'pointer',
                        fontFamily: theme.typography.fontSans, fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <span aria-hidden>{b.emoji}</span>
                      <span>{b.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              onClick={save}
              disabled={!bucketId || saving}
              style={{
                width: '100%', padding: '14px',
                background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold})`,
                color: theme.colors.brandDark, border: 'none',
                borderRadius: theme.radius.sm,
                cursor: !bucketId || saving ? 'not-allowed' : 'pointer',
                fontFamily: theme.typography.fontSans, fontSize: 14, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                opacity: !bucketId ? 0.5 : 1,
              }}
            >{saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
  fontFamily: theme.typography.fontSans, fontSize: 14,
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.colors.brand}33`,
  background: 'white', color: theme.colors.brand,
}

function Field({ label, children, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: theme.colors.brand, opacity: 0.7,
        fontFamily: theme.typography.fontSans,
      }}>{label}</span>
      {children}
    </label>
  )
}
