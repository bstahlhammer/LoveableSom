import { useCallback } from 'react'

const KEY = 'uncork_taste_profile'

// Taste profile sync — persists to localStorage until Supabase is configured.
export function useTasteProfileSync() {
  const saveProfile = useCallback((profile) => {
    try { localStorage.setItem(KEY, JSON.stringify(profile)) } catch {}
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const raw = localStorage.getItem(KEY)
      return { profile: raw ? JSON.parse(raw) : null, error: null }
    } catch {
      return { profile: null, error: null }
    }
  }, [])

  return { saveProfile, loadProfile }
}
