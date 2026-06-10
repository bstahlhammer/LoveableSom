import { supabase } from '../integrations/supabase/client'

// Fire-and-forget analytics event for authenticated users.
// Never awaited — never blocks UI actions.
export function trackEvent(type, metadata = {}) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return
    supabase.from('user_events').insert({
      user_id: session.user.id,
      event_type: type,
      metadata,
    })
  }).catch(() => {})
}
