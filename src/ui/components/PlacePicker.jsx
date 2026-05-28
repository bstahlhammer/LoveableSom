import { useEffect, useRef, useState } from 'react'
import { theme } from '../theme/theme.js'
import { searchPlaces, getPlaceDetails, findNearbyPlaces } from '@/core/api'

/**
 * PlacePicker — autocomplete + GPS auto-detect for a Google Maps place.
 *
 * Calls /core/api which proxies to server functions (key stays server-side).
 * Emits a place object: { placeId, name, address, lat, lng }.
 */
export default function PlacePicker({ initialLabel = '', onPick, onCancel }) {
  const [query, setQuery] = useState(initialLabel)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState(null)
  const sessionTokenRef = useRef(makeSessionToken())
  const debounceRef = useRef(null)
  const userLocRef = useRef(null) // {lat,lng} once granted

  // Autocomplete debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { suggestions, error } = await searchPlaces({
        query: query.trim(),
        lat: userLocRef.current?.lat,
        lng: userLocRef.current?.lng,
        sessionToken: sessionTokenRef.current,
      })
      setLoading(false)
      if (error) setError(humanizeError(error))
      else { setError(null); setSuggestions(suggestions) }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function pickSuggestion(s) {
    setLoading(true)
    const { place, error } = await getPlaceDetails({
      placeId: s.placeId,
      sessionToken: sessionTokenRef.current,
    })
    setLoading(false)
    // Rotate session token after a successful pick (Google billing best practice)
    sessionTokenRef.current = makeSessionToken()
    if (error || !place) {
      setError(humanizeError(error || 'unknown'))
      return
    }
    onPick(place)
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location.")
      return
    }
    setGpsLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      userLocRef.current = { lat, lng }
      const { places, error } = await findNearbyPlaces({ lat, lng, radius: 500 })
      setGpsLoading(false)
      if (error) { setError(humanizeError(error)); return }
      if (!places.length) {
        setError('No restaurants or stores found nearby.')
        return
      }
      // Show nearby as suggestions; user taps to confirm
      setSuggestions(places.map(p => ({
        placeId: p.placeId,
        primaryText: p.name,
        secondaryText: p.address,
        _full: p, // cache full details so we don't need a 2nd call
      })))
      setQuery(places[0].name)
    }, (err) => {
      setGpsLoading(false)
      setError(err.code === 1 ? 'Location permission denied.' : 'Could not get your location.')
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })
  }

  function pickAny(s) {
    if (s._full) {
      onPick(s._full)
      return
    }
    pickSuggestion(s)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 8, padding: 12, background: theme.colors.surfaceAlt, borderTop: `1px solid ${theme.colors.border}` }}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search restaurant or store…"
          style={{
            flex: 1,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.sm,
            padding: '10px 12px',
            fontFamily: theme.typography.fontSans,
            fontSize: theme.typography.sizes.sm,
            background: '#fff',
            outline: 'none',
          }}
        />
        <button
          onClick={useCurrentLocation}
          disabled={gpsLoading}
          title="Use my current location"
          style={{
            border: `1px solid ${theme.colors.border}`,
            background: '#fff',
            borderRadius: theme.radius.sm,
            padding: '0 12px',
            fontFamily: theme.typography.fontSans,
            fontSize: 12,
            color: theme.colors.brand,
            cursor: gpsLoading ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {gpsLoading ? '…' : '📍 Nearby'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 14px', background: '#fff', color: theme.colors.crimson, fontSize: 12, fontFamily: theme.typography.fontSans }}>
          {error}
        </div>
      )}

      {loading && !suggestions.length && (
        <div style={{ padding: '12px 14px', background: '#fff', color: theme.colors.textMuted, fontSize: 12, fontFamily: theme.typography.fontSans }}>
          Searching…
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ background: '#fff', borderTop: `1px solid ${theme.colors.border}`, maxHeight: 240, overflowY: 'auto' }}>
          {suggestions.map(s => (
            <button
              key={s.placeId}
              onClick={() => pickAny(s)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                borderBottom: `1px solid ${theme.colors.border}`,
                cursor: 'pointer',
                fontFamily: theme.typography.fontSans,
              }}
            >
              <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text, fontWeight: 500 }}>
                {s.primaryText}
              </div>
              {s.secondaryText && (
                <div style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>
                  {s.secondaryText}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', borderTop: `1px solid ${theme.colors.border}` }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px 0',
            background: 'transparent',
            color: theme.colors.textMuted,
            border: 'none',
            fontFamily: theme.typography.fontSans,
            fontSize: 12,
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          Cancel
        </button>
        {query.trim() && (
          <button
            onClick={() => onPick({ name: query.trim() })}
            style={{
              flex: 1,
              padding: '10px 0',
              background: theme.colors.brand,
              color: theme.colors.cream,
              border: 'none',
              fontFamily: theme.typography.fontSans,
              fontSize: 12,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Save as text
          </button>
        )}
      </div>
    </div>
  )
}

function makeSessionToken() {
  // Google recommends a UUID-like token; this is good enough for billing grouping
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function humanizeError(code) {
  if (code === 'auth_required') return 'Please sign in.'
  if (code === 'missing_api_key') return 'Maps search is not configured.'
  if (code === 'http_403') return 'Maps search is not authorized for this app yet. Try again later or enter a place by name.'
  if (typeof code === 'string' && code.startsWith('http_')) return 'Maps search is unavailable right now. Try entering a place by name.'
  return 'Something went wrong.'
}
