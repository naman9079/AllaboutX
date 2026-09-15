import { env } from '../lib/env'

export type AuthUser = { id: string; email: string; name: string; xUsername?: string; profileImageUrl?: string | null }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error ?? 'Authentication request failed.')
  return body as T
}

export const authService = {
  me: () => request<AuthUser>('/api/auth/me'),
  login: (email: string, password: string) => request<AuthUser>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => request<AuthUser>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
}
