import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }
  if (!_supabase) _supabase = createClient(url, key);
  return _supabase;
}

/** Client Supabase (lazy): in build usa placeholder; in produzione imposta le env var su Vercel. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});
