import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseKey, isConfigured } from './env'

function getCredentials() {
  if (isConfigured()) {
    return { url: supabaseUrl, key: supabaseKey }
  }
  return { url: 'http://localhost', key: 'missing-key' }
}

const { url, key } = getCredentials()

export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export function authRedirectUrl(): string {
  return window.location.origin + import.meta.env.BASE_URL
}
