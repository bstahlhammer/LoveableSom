import { useEffect, useState } from 'react'
import { supabase } from '../../integrations/supabase/client.ts'

// Loads and saves the user's "how'd we do?" accuracy rating for a single wine.
// existing: null = loading | false = no record found | { id, accuracy, note } = found
export function useWineScoreFeedback({ wineCatalogId, wineName, userId }) {
  const [existing, setExisting] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!userId || !wineName) { setLoading(false); setExisting(false); return }
    let cancelled = false
    setLoading(true)
    setExisting(null)

    async function load() {
      let query = supabase
        .from('wine_score_feedback')
        .select('id, accuracy, note')
        .eq('user_id', userId)
        .limit(1)

      if (wineCatalogId) {
        query = query.eq('wine_catalog_id', wineCatalogId)
      } else {
        query = query.eq('wine_name', wineName)
      }

      const { data } = await query.maybeSingle()
      if (!cancelled) {
        setExisting(data ?? false)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, wineCatalogId, wineName])

  async function submit({ accuracy, note, tasteFitScore, wePoints }) {
    setError(null)
    try {
      if (existing?.id) {
        const { data, error: err } = await supabase
          .from('wine_score_feedback')
          .update({ accuracy, note: note || null })
          .eq('id', existing.id)
          .select('id, accuracy, note')
          .single()
        if (err) throw err
        setExisting(data)
      } else {
        const { data, error: err } = await supabase
          .from('wine_score_feedback')
          .insert({
            user_id:         userId,
            wine_catalog_id: wineCatalogId ?? null,
            wine_name:       wineName,
            taste_fit_score: tasteFitScore ?? null,
            we_points:       wePoints      ?? null,
            accuracy,
            note: note || null,
          })
          .select('id, accuracy, note')
          .single()
        if (err) throw err
        setExisting(data)
      }
      return true
    } catch {
      setError("Couldn't save, try again")
      return false
    }
  }

  return { existing, loading, error, submit, clearError: () => setError(null) }
}
