import { useState } from 'react'
import type { AuthUser } from '../services/authService'
import { authService } from '../services/authService'
import { env } from '../lib/env'
import './auth.css'
import './oauth.css'

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true)
    try { onAuthenticated(mode === 'login' ? await authService.login(email, password) : await authService.register(name, email, password)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.') }
    finally { setLoading(false) }
  }
  const continueWithX = () => { window.location.href = `${env.apiUrl}/api/auth/x/start` }
  return <main className="auth-screen"><section className="auth-art"><span className="brand-mark">aX</span><span className="eyebrow">ALLABOUTX</span><h1>Your signal,<br/><em>sharpened.</em></h1><p>Understand what works on X, create with intent, and build a publishing rhythm that compounds.</p><div className="auth-orbit"><i/><i/><i/></div></section><section className="auth-panel"><span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'START BUILDING'}</span><h2>{mode === 'login' ? 'Sign in to your workspace.' : 'Create your workspace.'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Your content intelligence is waiting.' : 'A clearer way to grow on X.'}</p><button className="x-login" onClick={continueWithX}><b>𝕏</b> Continue with X</button><div className="auth-divider"><span>or use email</span></div><form onSubmit={submit}>{mode === 'register' && <label>Name<input value={name} onChange={event => setName(event.target.value)} placeholder="Alex Morgan" required /></label>}<label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>{error && <p className="auth-error">{error}</p>}<button className="primary full" disabled={loading}>{loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form><button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'New to AllaboutX? Create an account' : 'Already have an account? Sign in'}</button></section></main>
}
