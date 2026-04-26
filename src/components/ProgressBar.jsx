import { theme } from '../theme/theme.js'

export default function ProgressBar({ current, total, onStepClick }) {
  const pct = ((current) / total) * 100

  return (
    <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg} 0` }}>
      {/* Filled bar */}
      <div style={{ height: 3, borderRadius: 2, backgroundColor: theme.colors.barTrack, marginBottom: theme.spacing.sm }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: theme.colors.brand,
            borderRadius: 2,
            transition: 'width 0.25s ease',
          }}
        />
      </div>
      {/* Breadcrumb dots */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {Array.from({ length: total }).map((_, i) => {
          const done = i < current
          const active = i === current
          return (
            <button
              key={i}
              onClick={() => done && onStepClick?.(i)}
              style={{
                width: active ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: done || active ? theme.colors.brand : theme.colors.dotEmpty,
                border: 'none',
                cursor: done ? 'pointer' : 'default',
                padding: 0,
                transition: 'all 0.2s ease',
                opacity: done ? 0.6 : 1,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
