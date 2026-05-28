import { theme } from '../theme/theme.js'

export default function ApproachabilityDots({ score }) {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: i <= score ? theme.colors.gold : theme.colors.dotEmpty,
          }}
        />
      ))}
    </div>
  )
}
