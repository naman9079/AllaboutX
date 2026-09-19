import { env } from '../lib/env'
import { supabase } from '../lib/supabase'

export type AuthUser = { id: string; email: string; name: string; xUsername?: string; profileImageUrl?: string | null }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error ?? 'Authentication request failed.')
  return body as T
}

export const authService = {
  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Not signed in to Supabase')
    try {
      return await request<AuthUser>('/api/auth/me')
    } catch {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.provider_token) {
        return request<AuthUser>('/api/auth/supabase', { method: 'POST', body: JSON.stringify({ user, providerToken: session.provider_token }) })
      }
      return { id: user.id, email: user.email || '', name: user.user_metadata?.name || 'User' }
    }
  },
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    try {
      return await request<AuthUser>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    } catch {
      return { id: data.user.id, email: data.user.email || '', name: data.user.user_metadata?.name || 'User' }
    }
  },
  register: async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) throw new Error(error.message)
    try {
      return await request<AuthUser>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
    } catch {
      return { id: data.user?.id || '', email: data.user?.email || '', name }
    }
  },
  sendMagicLink: async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ 
      email, 
      options: { emailRedirectTo: window.location.origin } 
    })
    if (error) throw new Error(error.message)
  },
  signInWithX: async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'twitter', options: { redirectTo: window.location.origin, scopes: 'tweet.read users.read tweet.write offline.access' } })
    if (error) throw new Error(error.message)
  },
  connectX: async () => {
    const { data, error } = await supabase.auth.linkIdentity({ provider: 'twitter', options: { redirectTo: window.location.origin } })
    if (error) {
      console.error('linkIdentity error:', error)
      throw new Error(error.message)
    }
    if (data?.url) {
      window.location.href = data.url
    }
  },
  verifyOtp: async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error || !data.user) throw new Error(error?.message || 'Failed to verify OTP')
    return { id: data.user.id, email: data.user.email || '', name: data.user.user_metadata?.name || 'User' }
  },
  logout: async () => {
    await supabase.auth.signOut()
    return request<void>('/api/auth/logout', { method: 'POST' }).catch(() => {})
  },
}
