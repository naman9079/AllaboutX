import { useState } from 'react'
import type { AuthUser } from '../services/authService'
import { authService } from '../services/authService'
import { env } from '../lib/env'
import './auth.css'
import './oauth.css'

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'otp-verify'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true)
    try { 
      if (mode === 'otp') {
        await authService.sendOtp(email)
        setMode('otp-verify')
      } else if (mode === 'otp-verify') {
        onAuthenticated(await authService.verifyOtp(email, token))
      } else {
        onAuthenticated(mode === 'login' ? await authService.login(email, password) : await authService.register(name, email, password)) 
      }
    }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.') }
    finally { setLoading(false) }
  }
  const continueWithX = () => { window.location.href = `${env.apiUrl}/api/auth/x/start` }
  
  const heading = mode === 'login' ? 'Sign in to your workspace.' : mode === 'register' ? 'Create your workspace.' : mode === 'otp-verify' ? 'Check your email' : 'Sign in via Email OTP';
  const eyebrow = mode === 'login' ? 'WELCOME BACK' : mode === 'register' ? 'START BUILDING' : 'SECURE LOGIN';
  const subtitle = mode === 'login' ? 'Your content intelligence is waiting.' : mode === 'register' ? 'A clearer way to grow on X.' : mode === 'otp-verify' ? `We sent a code to ${email}` : 'Enter your email to receive a secure code.';

  return <main className="auth-screen"><section className="auth-art"><span className="brand-mark">aX</span><span className="eyebrow">ALLABOUTX</span><h1>Your signal,<br/><em>sharpened.</em></h1><p>Understand what works on X, create with intent, and build a publishing rhythm that compounds.</p><div className="auth-orbit"><i/><i/><i/></div></section><section className="auth-panel"><span className="eyebrow">{eyebrow}</span><h2>{heading}</h2><p className="auth-subtitle">{subtitle}</p>{(mode === 'login' || mode === 'register') && <><button className="x-login" onClick={continueWithX}><b>𝕏</b> Continue with X</button><div className="auth-divider"><span>or use email</span></div></>}<form onSubmit={submit}>{mode === 'register' && <label>Name<input value={name} onChange={event => setName(event.target.value)} placeholder="Alex Morgan" required /></label>}{mode !== 'otp-verify' && <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label>}{(mode === 'login' || mode === 'register') && <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>}{mode === 'otp-verify' && <label>Login Code<input type="text" value={token} onChange={event => setToken(event.target.value)} placeholder="00000000" minLength={8} maxLength={8} required /></label>}{error && <p className="auth-error">{error}</p>}<button className="primary full" disabled={loading}>{loading ? 'Working...' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'otp' ? 'Send Code' : 'Verify & Login'}</button></form>{(mode === 'login' || mode === 'register') ? <><button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'New to AllaboutX? Create an account' : 'Already have an account? Sign in'}</button><button className="auth-switch" onClick={() => { setMode('otp'); setError('') }}>Login via email OTP</button></> : <button className="auth-switch" onClick={() => { setMode('login'); setError('') }}>Back to standard login</button>}</section></main>
}
