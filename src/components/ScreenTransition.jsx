import { useEffect, useRef, useState } from 'react'

export default function ScreenTransition({ screenKey, direction, children }) {
  const [animStyle, setAnimStyle] = useState({})
  const prevKey = useRef(screenKey)

  useEffect(() => {
    if (screenKey === prevKey.current) return
    prevKey.current = screenKey

    const anim = direction === 'back' ? 'slideInLeft' : 'slideInRight'
    setAnimStyle({ animation: `${anim} 0.2s ease forwards` })

    const t = setTimeout(() => setAnimStyle({}), 210)
    return () => clearTimeout(t)
  }, [screenKey, direction])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...animStyle,
      }}
    >
      {children}
    </div>
  )
}
