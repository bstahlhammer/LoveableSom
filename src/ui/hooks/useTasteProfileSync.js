import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

const KEY = 'uncork_taste_profile'

export function useTasteProfileSync(userId) {
  const saveProfile = useCallback(async (profile, { recommendationFeedback } = {}) => {
    try { localStorage.setItem(KEY, JSON.stringify(profile)) } catch {}
    if (!userId) return
    const payload = {
      user_id: userId,
      taste_profile: profile,
      taste_profile_updated_at: new Date().toISOString(),
    }
    if (recommendationFeedback !== undefined) payload.recommendation_feedback = recommendationFeedback
    try {
      await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' })
    } catch (err) {
      console.error('Failed to save taste profile to Supabase:', err)
    }
  }, [userId])

  const loadProfile = useCallback(async () => {
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('taste_profile')
          .eq('user_id', userId)
          .maybeSingle()
        if (!error && data?.taste_profile) {
          try { localStorage.setItem(KEY, JSON.stringify(data.taste_profile)) } catch {}
          return { profile: data.taste_profile, error: null }
        }
      } catch {}
    }
    try {
      const raw = localStorage.getItem(KEY)
      return { profile: raw ? JSON.parse(raw) : null, error: null }
    } catch {
      return { profile: null, error: null }
    }
  }, [userId])

  return { saveProfile, loadProfile }
}
