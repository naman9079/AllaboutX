const optional = (name: string) => import.meta.env[name] as string | undefined

export const env = {
  supabaseUrl: optional('VITE_SUPABASE_URL'),
  supabaseAnonKey: optional('VITE_SUPABASE_ANON_KEY'),
  useSupabase: optional('VITE_USE_SUPABASE') === 'true',
  xDataFunctionUrl: optional('VITE_X_DATA_FUNCTION_URL'),
}

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey)
