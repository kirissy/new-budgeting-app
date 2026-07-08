import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client for trusted server-only contexts with no user session
// (e.g. the cron route). Bypasses RLS — never import this from client code.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
