export function isConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  return !!(url && key)
}

export const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || ''
export const supabaseKey: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
