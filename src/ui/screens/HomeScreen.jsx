import { useState, useEffect } from 'react'
import T from '../theme/T.js'
import winebirdMark from '@/assets/winebird-mark.png'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-1.9 1.3-4.3 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39 16.3 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6 5.1c-.4.4 6.7-4.9 6.7-14.5 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

function Monogram() {
  return (
    <div style={{
      width: 168, height: 168,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto', position: 'relative', borderRadius: '50%',
      background: `radial-gradient(circle at 50% 45%, ${T.ink0} 0%, ${T.ink50} 100%)`,
      boxShadow: `0 0 0 1px ${T.scarlet300}, 0 0 0 8px color-mix(in oklch, ${T.scarlet500} 8%, transparent), 0 12px 36px color-mix(in oklch, ${T.scarlet500} 12%, transparent)`,
      overflow: 'hidden',
    }}>
      <img src={winebirdMark} alt="Uncork" width={148} height={148}
        style={{ width: 148, height: 148, objectFit: 'contain' }} />
    </div>
  )
}

function TasteProfileCard({ tasteProfile, onTap }) {
  const archetype = tasteProfile?.name || tasteProfile?.archetype?.name || 'Your taste profile'
  const description = tasteProfile?.description || tasteProfile?.archetype?.description || ''
  return (
    <button onClick={onTap} style={{
      width: '100%', textAlign: 'left', padding: '14px 16px',
      background: `linear-gradient(135deg, ${T.ink0} 0%, ${T.forest50} 100%)`,
      border: `1px solid ${T.forest300}`,
      borderRadius: 14, cursor: 'pointer', boxShadow: T.shadowMd,
    }}>
      <div style={{ fontSize: 10, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.forest500, marginBottom: 4 }}>
        Your taste profile
      </div>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 22, color: T.ink900, lineHeight: 1.1, marginBottom: description ? 6 : 0 }}>
        {archetype}
      </div>
      {description && (
        <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink400, lineHeight: 1.4 }}>
          {description}
        </div>
      )}
    </button>
  )
}

// ── iOS-faithful SVG icons ────────────────────────────────────────────────

function DotsIcon({ size = 24, color = 'currentColor' }) {
  const r = size * 0.08
  const cy = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size * 0.25} cy={cy} r={r} fill={color} />
      <circle cx={size * 0.5}  cy={cy} r={r} fill={color} />
      <circle cx={size * 0.75} cy={cy} r={r} fill={color} />
    </svg>
  )
}

function ShareUpIcon({ size = 24, color = 'currentColor', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="8 6 12 2 16 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
      <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
    </svg>
  )
}

function AddHomeIcon({ size = 28, color = '#fff', bg = '#007AFF' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill={bg} />
      <line x1="14" y1="8" x2="14" y2="20" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="8" y1="14" x2="20" y2="14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

// ── Step illustrations ────────────────────────────────────────────────────

function SafariBarIllustration() {
  return (
    <div style={{ margin: '12px 0 4px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%', maxWidth: 320,
        background: '#1C1C1E', borderRadius: 14,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        {/* Back arrow */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {/* Forward arrow — dimmed (no forward page) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {/* Share button */}
        <ShareUpIcon size={20} color="rgba(255,255,255,0.38)" strokeWidth={1.8} />
        {/* Bookmarks */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
        {/* ⋯ button — highlighted */}
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'rgba(0,122,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 3px rgba(0,122,255,0.3)',
        }}>
          <DotsIcon size={20} color="white" />
        </div>
      </div>
    </div>
  )
}

function ShareMenuIllustration() {
  return (
    <div style={{ margin: '12px 0 4px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%', maxWidth: 260,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: '0.5px solid rgba(0,0,0,0.1)',
      }}>
        {/* other menu rows — dimmed */}
        {['Open in New Tab', 'Find on Page', 'Add Bookmark'].map((label, i) => (
          <div key={i} style={{
            padding: '12px 16px',
            borderBottom: '0.5px solid rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: 12,
            opacity: 0.35,
          }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: '#8E8E93', flexShrink: 0 }} />
            <span style={{ fontFamily: '-apple-system, sans-serif', fontSize: 15, color: '#1C1C1E' }}>{label}</span>
          </div>
        ))}
        {/* Share row — highlighted */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(0,122,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '0.5px solid rgba(0,122,255,0.15)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: '#007AFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ShareUpIcon size={17} color="white" strokeWidth={2} />
          </div>
          <span style={{ fontFamily: '-apple-system, sans-serif', fontSize: 15, fontWeight: 600, color: '#007AFF' }}>Share…</span>
        </div>
        {/* trailing row dimmed */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.35 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: '#8E8E93', flexShrink: 0 }} />
          <span style={{ fontFamily: '-apple-system, sans-serif', fontSize: 15, color: '#1C1C1E' }}>More…</span>
        </div>
      </div>
    </div>
  )
}

function ShareSheetIllustration() {
  const actions = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      ),
      label: 'Add Bookmark', dim: true,
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      label: 'Add to Reading List', dim: true,
    },
    {
      icon: <AddHomeIcon size={26} color="#fff" bg="#007AFF" />,
      label: 'Add to Home Screen', highlight: true,
    },
    {
      icon: (
        <div style={{
          width: 26, height: 26, borderRadius: 6, background: '#34C759',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ),
      label: 'Open as Web App',
      note: 'Keep this on',
      checked: true,
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      ),
      label: 'Copy', dim: true,
    },
  ]

  return (
    <div style={{ margin: '12px 0 4px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%', maxWidth: 320,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: '0.5px solid rgba(0,0,0,0.1)',
      }}>
        {/* App icons row — simplified */}
        <div style={{
          padding: '12px 12px 10px',
          borderBottom: '0.5px solid rgba(0,0,0,0.1)',
          display: 'flex', gap: 10, justifyContent: 'center', opacity: 0.35,
        }}>
          {['#007AFF','#34C759','#FF3B30','#FF9500','#AF52DE'].map((c, i) => (
            <div key={i} style={{ width: 36, height: 36, borderRadius: 9, background: c }} />
          ))}
        </div>
        {/* Actions list */}
        {actions.map((a, i) => (
          <div key={i} style={{
            padding: '11px 16px',
            borderBottom: i < actions.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
            display: 'flex', alignItems: 'center', gap: 14,
            background: a.highlight ? 'rgba(0,122,255,0.07)' : 'transparent',
            opacity: a.dim ? 0.38 : 1,
          }}>
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {a.icon}
            </div>
            <div style={{ flex: 1 }}>
              <span style={{
                fontFamily: '-apple-system, sans-serif',
                fontSize: 14,
                fontWeight: a.highlight ? 700 : a.checked ? 600 : 400,
                color: a.highlight ? '#007AFF' : a.checked ? '#34C759' : '#1C1C1E',
              }}>
                {a.label}
              </span>
              {a.note && (
                <div style={{ fontFamily: '-apple-system, sans-serif', fontSize: 11, color: '#34C759', marginTop: 1 }}>
                  ✓ {a.note}
                </div>
              )}
            </div>
            {a.highlight && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            {a.checked && (
              <div style={{
                width: 30, height: 18, borderRadius: 9,
                background: '#34C759', position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', right: 2, top: 2,
                  width: 14, height: 14, borderRadius: '50%', background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }} />
              </div>
            )}
          </div>
        ))}
        {/* Add button */}
        <div style={{
          padding: '10px 16px',
          borderTop: '0.5px solid rgba(0,0,0,0.1)',
          display: 'flex', justifyContent: 'flex-end',
          background: 'rgba(0,0,0,0.02)',
        }}>
          <button style={{
            background: '#007AFF', color: 'white',
            border: 'none', borderRadius: 8,
            fontFamily: '-apple-system, sans-serif',
            fontSize: 15, fontWeight: 600,
            padding: '7px 22px', cursor: 'default',
          }}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Install components ────────────────────────────────────────────────────

function InstallCard({ onTap }) {
  return (
    <button
      onClick={onTap}
      style={{
        marginTop: 8, width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
        background: T.forest50, border: `1px dashed ${T.forest300}`,
        color: T.forest700, fontFamily: T.fontBody, fontSize: 13, textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.forest500, marginBottom: 3 }}>Install</div>
        <div>How to add Uncork to your home screen →</div>
      </div>
      <div style={{ marginLeft: 12, flexShrink: 0 }}>
        <AddHomeIcon size={28} color="#fff" bg={T.forest500} />
      </div>
    </button>
  )
}

function InstallSheet({ onClose }) {
  const steps = [
    {
      number: 1,
      title: 'Tap the ⋯ button',
      detail: 'Find the three-dot button at the bottom right of Safari, then tap it.',
      illustration: <SafariBarIllustration />,
    },
    {
      number: 2,
      title: 'Tap "Share"',
      detail: 'In the menu that appears, tap Share — the box with the arrow pointing up.',
      illustration: <ShareMenuIllustration />,
    },
    {
      number: 3,
      title: 'Tap "Add to Home Screen", keep "Open as Web App" on, then tap Add',
      detail: 'Scroll the list to find Add to Home Screen. Make sure "Open as Web App" is enabled, then tap Add.',
      illustration: <ShareSheetIllustration />,
    },
  ]

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, animation: 'fade-in 200ms ease' }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
        background: T.ink0, borderRadius: '20px 20px 0 0',
        maxHeight: '88vh', overflowY: 'auto',
        animation: 'slide-up 280ms ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{ padding: '20px 20px 40px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.ink200, margin: '0 auto 20px' }} />
          <div style={{ fontFamily: T.fontDisplay, fontSize: 24, color: T.ink900, marginBottom: 6, lineHeight: 1.2 }}>
            How to add Uncork<br />to your home screen
          </div>
          <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink400, lineHeight: 1.55, margin: '0 0 24px' }}>
            Opens instantly like a native app. These steps work in Safari on iPhone.
          </p>

          {steps.map((step) => (
            <div key={step.number} style={{ marginBottom: 28 }}>
              {/* Step header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: T.cobalt500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontSize: 13, fontWeight: 700, fontFamily: T.fontBody }}>{step.number}</span>
                </div>
                <div style={{ fontFamily: T.fontBody, fontSize: 15, fontWeight: 600, color: T.ink900, lineHeight: 1.3 }}>
                  {step.title}
                </div>
              </div>
              {/* Illustration */}
              {step.illustration}
              {/* Description */}
              <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.ink400, lineHeight: 1.5, marginTop: 8 }}>
                {step.detail}
              </div>
            </div>
          ))}

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '14px', marginTop: 4,
              background: T.forest500, color: 'white', border: 'none',
              borderRadius: 100, fontFamily: T.fontBody, fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </>
  )
}

export default function HomeScreen({ navigate, auth, tasteProfile, hasActiveSession, activeWineCount, onResumeScan, onEmailSignIn, onOpenScan, onAddWine }) {
  const user = auth?.user
  const profileName = auth?.profile?.display_name
  const initial = (profileName || user?.email || '?').trim()[0]?.toUpperCase() ?? '?'
  const hasProfile = !!tasteProfile

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    setIsStandalone(
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    )
    setBannerDismissed(localStorage.getItem('uncork_install_banner_dismissed') === '1')
  }, [])

  function dismissBanner() {
    localStorage.setItem('uncork_install_banner_dismissed', '1')
    setBannerDismissed(true)
  }

  const showBanner = !isStandalone && !bannerDismissed
  const showInstallCard = !isStandalone

  async function handleGoogle() {
    setError(null); setBusy(true)
    const r = await auth?.signInWithGoogle?.()
    if (r?.error) { setError(r.error.message || 'Google sign-in failed'); setBusy(false) }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.ink0, fontFamily: T.fontBody,
      padding: '40px 24px 32px',
      justifyContent: 'space-between',
      position: 'relative', overflowY: 'auto',
      touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
    }}>
      {/* watercolor washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-8%', left: '-10%', width: '60%', height: '55%', background: T.forest100, opacity: 0.8, filter: 'blur(70px)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '8%', right: '-12%', width: '55%', height: '50%', background: T.cobalt100, opacity: 0.7, filter: 'blur(80px)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-8%', width: '65%', height: '55%', background: T.scarlet100, opacity: 0.6, filter: 'blur(75px)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '-10%', width: '55%', height: '50%', background: T.ochre100, opacity: 0.75, filter: 'blur(70px)', borderRadius: '50%' }} />
      </div>

      {/* install banner */}
      {showBanner && (
        <div style={{
          margin: '-40px -24px 0 -24px',
          padding: '11px 16px',
          background: T.forest700,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', zIndex: 10,
        }}>
          <button
            onClick={() => setShowInstructions(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, flex: 1 }}
          >
            <span style={{ fontSize: 15 }}>📲</span>
            <span style={{ fontFamily: T.fontBody, fontSize: 13, color: 'white', fontWeight: 500 }}>
              How to add Uncork to your home screen
            </span>
          </button>
          <button
            onClick={dismissBanner}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: 'rgba(255,255,255,0.65)', fontSize: 18, lineHeight: 1, marginLeft: 8 }}
          >
            ×
          </button>
        </div>
      )}

      {/* auth chip */}
      {user && (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
          <button onClick={() => navigate('profile')} title="Account" aria-label="Account" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '50%',
            background: `linear-gradient(180deg, ${T.ochre400} 0%, ${T.ochre500} 100%)`,
            color: T.forest700,
            fontFamily: T.fontBody, fontWeight: 700, fontSize: 14,
            border: 'none', cursor: 'pointer', boxShadow: T.shadowMd,
          }}>
            {initial}
          </button>
        </div>
      )}

      {/* hero */}
      <div style={{ position: 'relative', textAlign: 'center', marginTop: 16, zIndex: 1 }}>
        <Monogram />
      </div>

      {user ? (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24, zIndex: 1 }}>
          {hasActiveSession && (
            <button onClick={onResumeScan} style={{
              width: '100%', padding: '14px',
              background: `color-mix(in oklch, ${T.ochre500} 10%, transparent)`,
              color: T.ochre500,
              border: `1px solid color-mix(in oklch, ${T.ochre500} 50%, transparent)`,
              borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: T.fontBody,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span>↩</span>
              <span>Continue — {activeWineCount} wine{activeWineCount === 1 ? '' : 's'} found</span>
            </button>
          )}

          <button onClick={() => navigate('scanPrompt')} style={{
            width: '100%', padding: '18px',
            background: `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`,
            color: 'white', border: 'none', borderRadius: 100,
            fontSize: 15, fontWeight: 600, fontFamily: T.fontBody, cursor: 'pointer',
            boxShadow: `0 6px 20px color-mix(in oklch, ${T.forest500} 30%, transparent)`,
          }}>
            {hasProfile ? "Scan to find a wine I'll love" : 'Scan a wine list, shelf or bottle'}
          </button>

          <button onClick={onAddWine} style={{
            width: '100%', padding: '14px',
            background: 'transparent', color: T.forest500,
            border: `1px solid ${T.forest300}`,
            borderRadius: 100, fontSize: 14, fontWeight: 500,
            fontFamily: T.fontBody, cursor: 'pointer',
            letterSpacing: '0.02em',
          }}>
            Rate a wine I tried
          </button>

          {hasProfile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${T.forest300}, transparent)` }} />
                <span style={{ fontSize: 9, fontFamily: T.fontBody, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: T.ink400 }}>
                  Your taste
                </span>
                <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${T.forest300}, transparent)` }} />
              </div>

              <TasteProfileCard tasteProfile={tasteProfile} onTap={() => navigate('profile')} />

              <button onClick={() => navigate('quizIntro')} style={{
                background: 'none', border: 'none', color: T.forest500,
                fontSize: 12, fontFamily: T.fontBody, cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                alignSelf: 'center', padding: 4,
              }}>
                Update my taste profile
              </button>
            </>
          ) : (
            <button onClick={() => navigate('quizIntro')} style={{
              width: '100%', padding: '17px',
              background: 'transparent', color: T.cobalt500,
              border: `1px solid color-mix(in oklch, ${T.cobalt500} 50%, transparent)`,
              borderRadius: 100, fontSize: 15, fontWeight: 500,
              fontFamily: T.fontBody, cursor: 'pointer',
              letterSpacing: '0.04em',
            }}>
              Build my taste profile
            </button>
          )}

          {showInstallCard && <InstallCard onTap={() => setShowInstructions(true)} />}
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, zIndex: 1 }}>
          {/* numbered steps from handoff */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            {[
              { num: 1, color: T.forest500, text: 'Scan any wine list or shelf' },
              { num: 2, color: T.cobalt500, text: 'Tell us about your moment' },
              { num: 3, color: T.ochre500,  text: 'Get 3 picks in 30 seconds' },
            ].map(({ num, color, text }) => (
              <div key={num} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: T.ink0, borderRadius: 12, padding: '11px 14px',
                border: `1px solid ${T.ink150}`, boxShadow: T.shadowMd,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, background: color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{num}</span>
                </div>
                <span style={{ fontFamily: T.fontBody, fontSize: 14, color: T.ink700 }}>{text}</span>
              </div>
            ))}
          </div>

          <button onClick={handleGoogle} disabled={busy} style={{
            width: '100%', padding: '16px',
            background: 'white', color: T.ink900,
            border: `1px solid ${T.ink150}`, borderRadius: 100,
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <GoogleLogo />
            Continue with Google
          </button>

          <button onClick={() => onEmailSignIn?.()} disabled={busy} style={{
            width: '100%', padding: '15px',
            background: 'transparent', color: T.forest500,
            border: `1px solid color-mix(in oklch, ${T.forest500} 50%, transparent)`,
            borderRadius: 100, fontSize: 14, fontWeight: 500,
            fontFamily: T.fontBody, cursor: busy ? 'wait' : 'pointer',
            letterSpacing: '0.04em',
          }}>
            Sign in with email
          </button>

          {error && (
            <div style={{ color: T.scarlet500, fontFamily: T.fontBody, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              {error}
            </div>
          )}

          <button onClick={() => navigate('scanPrompt')} disabled={busy} style={{
            background: 'none', border: 'none', color: T.ink400,
            fontFamily: T.fontBody, fontSize: 12, letterSpacing: '0.08em',
            cursor: busy ? 'wait' : 'pointer',
            textDecoration: 'underline', textUnderlineOffset: 3,
            padding: '4px 0', alignSelf: 'center',
          }}>
            Try it without an account →
          </button>

          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 18, fontFamily: T.fontBody, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            <a href="/privacy" style={{ color: T.ochre500, textDecoration: 'none', opacity: 0.8 }}>Privacy</a>
            <a href="/terms" style={{ color: T.ochre500, textDecoration: 'none', opacity: 0.8 }}>Terms</a>
          </div>

          <p style={{ marginTop: 4, textAlign: 'center', maxWidth: 280, margin: '4px auto 0', fontFamily: T.fontBody, fontSize: 11, color: T.ink400, lineHeight: 1.5 }}>
            By continuing you confirm you&rsquo;re of legal drinking age and agree to our Terms.
          </p>

          {showInstallCard && <InstallCard onTap={() => setShowInstructions(true)} />}
        </div>
      )}

      {showInstructions && <InstallSheet onClose={() => setShowInstructions(false)} />}
    </div>
  )
}
