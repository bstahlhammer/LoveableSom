import { useEffect, useState } from 'react'
import { theme } from '../theme/theme.js'

const MESSAGES = [
  'Reading wines from list…',
  'Identifying 8 wines…',
  'Matching to database…',
  'Done ✓',
]

export default function ScanningScreen({ navigate }) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const intervals = [
      setTimeout(() => setMsgIdx(1), 700),
      setTimeout(() => setMsgIdx(2), 1500),
      setTimeout(() => setMsgIdx(3), 2200),
      setTimeout(() => navigate('anonResults'), 2600),
    ]
    return () => intervals.forEach(clearTimeout)
  }, [navigate])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0A0A0A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xl,
        padding: theme.spacing.xl,
      }}
    >
      {/* Camera frame */}
      <div
        style={{
          width: 260,
          height: 180,
          position: 'relative',
          border: `1.5px solid ${theme.colors.gold}80`,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#111',
        }}
      >
        {/* Corner marks */}
        {[
          { top: -1, left: -1, borderTop: `2px solid ${theme.colors.gold}`, borderLeft: `2px solid ${theme.colors.gold}` },
          { top: -1, right: -1, borderTop: `2px solid ${theme.colors.gold}`, borderRight: `2px solid ${theme.colors.gold}` },
          { bottom: -1, left: -1, borderBottom: `2px solid ${theme.colors.gold}`, borderLeft: `2px solid ${theme.colors.gold}` },
          { bottom: -1, right: -1, borderBottom: `2px solid ${theme.colors.gold}`, borderRight: `2px solid ${theme.colors.gold}` },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />
        ))}

        {/* Scan line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: theme.colors.gold,
            boxShadow: `0 0 8px ${theme.colors.gold}`,
            animation: 'scanLine 1.2s ease-in-out infinite alternate',
            top: 4,
          }}
        />

        {/* Simulated list content */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              height: 8,
              top: 24 + i * 28,
              backgroundColor: '#ffffff10',
              borderRadius: 2,
              animation: 'pulse 2s ease infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Status message */}
      <div
        style={{
          fontSize: theme.typography.sizes.md,
          color: theme.colors.cream,
          fontFamily: theme.typography.fontSans,
          animation: 'pulse 1.5s ease infinite',
          letterSpacing: '0.02em',
        }}
      >
        {MESSAGES[msgIdx]}
      </div>
    </div>
  )
}
