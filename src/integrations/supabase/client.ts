import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
})
