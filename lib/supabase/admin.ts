import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'apikey': process.env.SUPABASE_SECRET_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
        },
      },
    }
  )
}
