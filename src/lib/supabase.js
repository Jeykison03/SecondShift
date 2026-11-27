import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && key)

if (!supabaseConfigured) {
  console.warn('Supabase env vars missing: copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  // PKCE puts the email-confirmation code in ?code=…, which works with the HashRouter used for GitHub Pages.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

/** Throw Supabase errors so callers can use try/catch. */
export function unwrap({ data, error }) {
  if (error) throw error
  return data
}
