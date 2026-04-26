export default function DeviceFrame({ children }) {
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
