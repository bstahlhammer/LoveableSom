import { useEffect, useState } from 'react'
import { theme } from '../theme/theme.js'

export default function Toast({ message }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: theme.colors.brandDark,
        color: theme.colors.cream,
        padding: '10px 20px',
        borderRadius: theme.radius.md,
        fontSize: theme.typography.sizes.md,
        fontFamily: theme.typography.fontSans,
        fontWeight: theme.typography.weights.medium,
        zIndex: 100,
        whiteSpace: 'nowrap',
        boxShadow: theme.shadows.elevated,
        animation: visible
          ? 'toastIn 0.2s ease forwards'
          : 'toastOut 0.3s ease forwards',
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  )
}
