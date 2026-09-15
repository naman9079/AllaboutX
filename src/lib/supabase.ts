import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, hasSupabaseConfig } from './env'
import type { Database } from '../types/database'

let client: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!hasSupabaseConfig) return null
  if (!client) {
    client = createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return client
}
