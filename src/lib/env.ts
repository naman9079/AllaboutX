const optional = (name: string) => import.meta.env[name] as string | undefined

export const env = {
  apiUrl: optional('VITE_API_URL') || 'http://localhost:8787',
  supabaseUrl: optional('VITE_SUPABASE_URL') || 'https://xyz.supabase.co',
  supabaseAnonKey: optional('VITE_SUPABASE_ANON_KEY') || 'your-anon-key',
}
