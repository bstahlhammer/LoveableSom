/**
 * POST /api/label-request
 *
 * Body: { catalog_id: number, wine_name: string }
 * Headers: Authorization: Bearer <supabase-access-token>
 *
 * Inserts a label_requests row for the given wine.
 * No-ops (200 ok) if a pending request already exists for this wine.
 * Returns 401 if the session token is missing or invalid.
 */

import { createFileRoute } from '@tanstack/react-router'
import { createClient }    from '@supabase/supabase-js'

const SUPABASE_URL      = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'

export const Route = createFileRoute('/api/label-request')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify session token
        const authHeader = request.headers.get('Authorization') ?? ''
        const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
        if (!accessToken) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Create authed Supabase client so RLS sees the correct user
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
        })

        // Verify token and get user ID
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: { catalog_id?: number; wine_name?: string }
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const { catalog_id, wine_name } = body
        if (!catalog_id || !wine_name) {
          return Response.json({ error: 'Missing catalog_id or wine_name' }, { status: 400 })
        }

        // Upsert — unique index on (catalog_id) WHERE status='pending' prevents duplicates
        const { error: insertError } = await supabase
          .from('label_requests')
          .insert({
            catalog_id,
            wine_name,
            requested_by: user.id,
          })

        // 23505 = unique_violation — means a pending request already exists, that's fine
        if (insertError && insertError.code !== '23505') {
          console.error('label-request insert error:', insertError)
          return Response.json({ error: 'Failed to save request' }, { status: 500 })
        }

        return Response.json({ ok: true })
      },
    },
  },
})
