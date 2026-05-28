import { useState } from 'react'
import T from '../theme/T.js'
import { useAuth } from '../hooks/useAuth.js'

export default function AuthScreen({ goBack, onAuthed, authMode = 'full' }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const showGoogle = authMode !== 'email'
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleGoogle() {
    setError(null); setBusy(true)
    const r = await signInWithGoogle()
    if (r?.error) { setError(r.error.message || 'Google sign-in failed'); setBusy(false) }
    // if redirected, browser leaves the page
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setInfo(null); setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
        onAuthed?.()
      } else {
        const { data, error } = await signUpWithEmail(email, password, displayName)
        if (error) throw error
        if (data.session) onAuthed?.()
        else setInfo('Account created, you can sign in now.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '14px',
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${T.forest300}`,
    borderRadius: 12, color: T.ink100,
    fontFamily: T.fontBody, fontSize: 14,
    outline: 'none', marginBottom: 12,
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: T.dark, padding: '32px 24px',
      overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      {/* dark watercolor washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -60, left: -40, width: 220, height: 220, borderRadius: '50%', background: T.forest500, opacity: 0.12, filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: 60, right: -40, width: 200, height: 200, borderRadius: '50%', background: T.cobalt500, opacity: 0.10, filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 40, width: 160, height: 160, borderRadius: '50%', background: T.ochre500, opacity: 0.07, filter: 'blur(44px)' }} />
      </div>

      <button onClick={goBack} style={{
        position: 'relative', zIndex: 1,
        background: 'none', border: 'none', color: T.forest300,
        fontFamily: T.fontBody, fontSize: 13, letterSpacing: '0.12em',
        textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'flex-start',
        marginBottom: 24, padding: 0,
      }}>
        ← Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: T.fontBody, fontSize: 10,
          letterSpacing: '0.32em', color: T.ochre500,
          textTransform: 'uppercase', marginBottom: 8,
        }}>
          {mode === 'signin' ? 'Welcome Back' : 'Join the Cellar'}
        </div>
        <h1 style={{
          fontFamily: T.fontDisplay, fontSize: 40,
          color: T.ink100, lineHeight: 1, margin: 0,
          letterSpacing: '0.01em',
        }}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {showGoogle && (
          <>
            <button onClick={handleGoogle} disabled={busy} style={{
              width: '100%', padding: '14px',
              background: 'white', color: T.ink900,
              border: 'none', borderRadius: 100,
              fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 4,
            }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-1.9 1.3-4.3 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6 5.1c-.4.4 6.7-4.9 6.7-14.5 0-1.2-.1-2.4-.4-3.5z"/></svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${T.ochre500}80, transparent)` }} />
              <span style={{ fontFamily: T.fontBody, fontSize: 10, letterSpacing: '0.28em', color: T.ochre500, textTransform: 'uppercase' }}>or</span>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${T.ochre500}80, transparent)` }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input type="text" placeholder="Display name" value={displayName}
              onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
          )}
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6} style={inputStyle} />

          {error && (
            <div style={{ color: T.scarlet300, fontFamily: T.fontBody, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ color: T.ochre400, fontFamily: T.fontBody, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
              {info}
            </div>
          )}

          <button type="submit" disabled={busy} style={{
            width: '100%', padding: '16px',
            background: `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
            color: 'white', border: 'none', borderRadius: 100,
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: busy ? 'wait' : 'pointer',
            boxShadow: `0 6px 20px color-mix(in oklch, ${T.forest500} 30%, transparent)`,
          }}>
            {busy ? '…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null) }} style={{
          background: 'none', border: 'none', color: T.forest300,
          fontFamily: T.fontDisplay, fontStyle: 'italic',
          fontSize: 15, marginTop: 16, cursor: 'pointer',
          display: 'block', width: '100%', textAlign: 'center',
        }}>
          {mode === 'signin'
            ? "don't have an account? create one"
            : 'already have an account? sign in'}
        </button>

        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: `1px solid ${T.forest700}`,
          display: 'flex', justifyContent: 'center', gap: 18,
          fontFamily: T.fontBody, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <a href="/privacy" style={{ color: T.ochre500, textDecoration: 'none', opacity: 0.8 }}>Privacy</a>
          <a href="/terms" style={{ color: T.ochre500, textDecoration: 'none', opacity: 0.8 }}>Terms</a>
        </div>

        <p style={{
          marginTop: 12, textAlign: 'center',
          fontFamily: T.fontBody, fontSize: 11,
          color: `${T.ink300}`, lineHeight: 1.5,
        }}>
          By continuing you confirm you&rsquo;re of legal drinking age and agree to our Terms.
        </p>
      </div>
    </div>
  )
}
