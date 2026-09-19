import { useState } from 'react'
import type { AuthUser } from '../services/authService'
import { authService } from '../services/authService'
import './auth.css'
import './oauth.css'

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'magic-link' | 'magic-link-sent'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true)
    try { 
      if (mode === 'magic-link') {
        await authService.sendMagicLink(email)
        setMode('magic-link-sent')
      } else if (mode === 'magic-link-sent') {
        // Nothing to do, user must click the link in their email
        return;
      } else {
        onAuthenticated(mode === 'login' ? await authService.login(email, password) : await authService.register(name, email, password)) 
      }
    }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.') }
    finally { setLoading(false) }
  }
  const continueWithX = async () => { setError(''); setLoading(true); try { await authService.signInWithX() } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to connect X.') } finally { setLoading(false) } }
  
  const heading = mode === 'login' ? 'Sign in to your workspace.' : mode === 'register' ? 'Create your workspace.' : mode === 'magic-link-sent' ? 'Check your email' : 'Sign in via Magic Link';
  const eyebrow = mode === 'login' ? 'WELCOME BACK' : mode === 'register' ? 'START BUILDING' : 'SECURE LOGIN';
  const subtitle = mode === 'login' ? 'Your content intelligence is waiting.' : mode === 'register' ? 'A clearer way to grow on X.' : mode === 'magic-link-sent' ? `We sent a magic link to ${email}. Click the link to securely sign in.` : 'Enter your email to receive a secure login link.';

  return <main className="auth-screen"><section className="auth-art"><span className="brand-mark">aX</span><span className="eyebrow">ALLABOUTX</span><h1>Your signal,<br/><em>sharpened.</em></h1><p>Understand what works on X, create with intent, and build a publishing rhythm that compounds.</p><div className="auth-orbit"><i/><i/><i/></div></section><section className="auth-panel"><span className="eyebrow">{eyebrow}</span><h2>{heading}</h2><p className="auth-subtitle">{subtitle}</p>{(mode === 'login' || mode === 'register') && <><button className="x-login" onClick={continueWithX}><b>𝕏</b> Continue with X</button><button type="button" className="auth-switch" style={{marginTop: '10px', background: '#333', color: '#fff', padding: '8px', borderRadius: '6px'}} onClick={() => onAuthenticated({ id: 'dev', email: 'dev@example.com', name: 'Dev User' })}>Skip to Dashboard (Dev)</button><div className="auth-divider"><span>or use email</span></div></>}<form onSubmit={submit}>{mode === 'register' && <label>Name<input value={name} onChange={event => setName(event.target.value)} placeholder="Alex Morgan" required /></label>}{mode !== 'magic-link-sent' && <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label>}{(mode === 'login' || mode === 'register') && <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>}{error && <p className="auth-error">{error}</p>}{mode !== 'magic-link-sent' && <button className="primary full" disabled={loading}>{loading ? 'Working...' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send Magic Link'}</button>}</form>{(mode === 'login' || mode === 'register') ? <><button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'New to AllaboutX? Create an account' : 'Already have an account? Sign in'}</button><button className="auth-switch" onClick={() => { setMode('magic-link'); setError('') }}>Login via magic link</button></> : <button className="auth-switch" onClick={() => { setMode('login'); setError('') }}>Back to standard login</button>}</section></main>
}
