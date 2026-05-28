import { useState, useEffect } from 'react'

export default function DeviceFrame({ children }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 500 : false
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 500)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: '#fff',
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '20px 0 20px',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          width: 390,
          height: 844,
          backgroundColor: '#fff',
          borderRadius: 44,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 0 0 8px #2a2a2a, 0 0 0 9px #444, 0 24px 64px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}
