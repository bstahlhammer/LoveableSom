import { useEffect, useState } from 'react'
import T from '../theme/T.js'
import PlacePicker from '../components/PlacePicker.jsx'
import { useScanHistory } from '../hooks/useScanHistory.js'
import { formatScanLabel } from '../utils/formatScan.js'

export default function HistoryScreen({ navigate, goBack, onOpenScan }) {
  const { listScans, deleteScan, updateScanLocation, getPhotoUrl } = useScanHistory()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [thumbs, setThumbs] = useState({})
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { scans } = await listScans()
      if (cancelled) return
      setScans(scans)
      setLoading(false)
      const entries = await Promise.all(
        scans.filter(s => s.photo_path).map(async s => [s.id, await getPhotoUrl(s.photo_path)])
      )
      if (!cancelled) setThumbs(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [listScans, getPhotoUrl])

  async function handleDelete(scan) {
    if (!confirm('Delete this scan?')) return
    await deleteScan(scan)
    setScans(s => s.filter(x => x.id !== scan.id))
  }

  async function handlePickPlace(scan, picked) {
    const update = picked.placeId
      ? { place: picked }
      : { locationLabel: picked.name }
    await updateScanLocation(scan.id, update)
    setScans(s => s.map(x => x.id === scan.id ? {
      ...x,
      location_label: picked.name || picked.placeId ? (picked.name || x.location_label) : null,
      place_id: picked.placeId || null,
      place_address: picked.address || null,
      place_lat: picked.lat ?? null,
      place_lng: picked.lng ?? null,
    } : x))
    setEditingId(null)
  }

  const totalWines = scans.reduce((n, s) => n + (s.wine_count || 0), 0)

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      background: T.ink0, fontFamily: T.fontBody, position: 'relative', overflow: 'hidden',
    }}>
      {/* watercolor washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -40, left: -40, width: 220, height: 220, borderRadius: '50%', background: T.forest300, opacity: 0.07, filter: 'blur(52px)' }}/>
        <div style={{ position: 'absolute', top: 80, right: -30, width: 170, height: 170, borderRadius: '50%', background: T.cobalt300, opacity: 0.06, filter: 'blur(40px)' }}/>
      </div>

      {/* Header */}
      <div style={{ padding: '16px 22px 14px', flexShrink: 0, zIndex: 1, position: 'relative' }}>
        <button
          onClick={goBack}
          style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 22, cursor: 'pointer', padding: '0 0 10px', display: 'block', lineHeight: 1 }}
        >←</button>
        <h1 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 28, lineHeight: 1.1, margin: '0 0 4px', letterSpacing: '-0.01em', color: T.ink900 }}>
          {scans.length > 0
            ? <><em style={{ color: T.forest500 }}>{scans.length} scan{scans.length !== 1 ? 's' : ''}</em> in your history</>
            : <>Scan <em style={{ color: T.forest500 }}>history</em></>
          }
        </h1>
        {scans.length > 0 && (
          <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>
            {totalWines} wine{totalWines !== 1 ? 's' : ''} catalogued
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className="hide-scrollbar"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 18px 32px', position: 'relative', zIndex: 1, background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)` }}
      >
        {loading && (
          <div style={{ color: T.forest500, fontSize: 14, padding: '32px 0', textAlign: 'center' }}>Loading…</div>
        )}

        {!loading && scans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 24, color: T.ink700, marginBottom: 8 }}>No scans yet</div>
            <div style={{ fontSize: 13, color: T.ink400, fontFamily: T.fontBody, marginBottom: 28, lineHeight: 1.6 }}>
              Snap a wine list or shelf,<br/>it'll show up here.
            </div>
            <button
              onClick={() => navigate('scanPrompt')}
              style={{
                padding: '12px 28px',
                background: `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: 100,
                fontFamily: T.fontBody,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Scan now
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scans.map(scan => (
            <div key={scan.id} style={{
              background: 'white',
              border: `1px solid ${T.ink150}`,
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: T.shadowMd,
            }}>
              <button
                onClick={() => onOpenScan?.(scan)}
                style={{
                  display: 'flex',
                  width: '100%',
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: T.ink100,
                  border: `1px solid ${T.ink150}`,
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundImage: thumbs[scan.id] ? `url(${thumbs[scan.id]})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}>
                  {!thumbs[scan.id] && <span style={{ fontSize: 22 }}>🍇</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.fontBody,
                    fontWeight: 600,
                    fontSize: 14,
                    color: T.ink900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    lineHeight: 1.2,
                  }}>
                    {formatScanLabel(scan)}
                    {scan.place_id && <span title="Linked to Google Maps" style={{ fontSize: 11 }}>📍</span>}
                  </div>
                  {scan.place_address && (
                    <div style={{ fontSize: 11, color: T.ink400, fontFamily: T.fontBody, marginTop: 2 }}>
                      {scan.place_address}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: T.forest500, fontFamily: T.fontBody, marginTop: 3, fontWeight: 500 }}>
                    {scan.wine_count} wine{scan.wine_count === 1 ? '' : 's'}
                  </div>
                </div>
                <div style={{ color: T.ink300, fontSize: 20, lineHeight: 1 }}>›</div>
              </button>

              {editingId === scan.id ? (
                <PlacePicker
                  initialLabel={scan.location_label || ''}
                  onPick={(picked) => handlePickPlace(scan, picked)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div style={{ display: 'flex', borderTop: `1px solid ${T.ink100}` }}>
                  <button
                    onClick={() => setEditingId(scan.id)}
                    style={miniBtn(T.ink400)}
                  >
                    {scan.location_label ? 'Edit place' : 'Add place'}
                  </button>
                  {(scan.place_id || scan.location_label) && (
                    <a
                      href={mapsUrl(scan)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...miniBtn(T.cobalt500), textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      View on Maps
                    </a>
                  )}
                  <button onClick={() => handleDelete(scan)} style={miniBtn(T.scarlet500)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function miniBtn(color) {
  return {
    flex: 1,
    padding: '10px 0',
    background: 'transparent',
    color,
    border: 'none',
    fontFamily: T.fontBody,
    fontSize: 12,
    cursor: 'pointer',
    letterSpacing: '0.04em',
    textAlign: 'center',
  }
}

function mapsUrl(scan) {
  if (scan.place_id) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(scan.location_label || '')}&query_place_id=${encodeURIComponent(scan.place_id)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(scan.location_label || '')}`
}
