import T from '../theme/T.js'
import { getTasteProfiles } from '@/core/api'

const ICONS = {
  'bold-red':      '🔥',
  'elegant-red':   '🍂',
  'rich-white':    '🌅',
  'crisp-white':   '🌊',
  'sweet-sipper':  '🌸',
  'crowd-pleaser': '✨',
}

export default function ArchetypePicker({ value, onChange }) {
  const profiles = getTasteProfiles()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {profiles.map(p => {
        const selected = value === p.id
        return (
          <button
            key={p.id}
            onClick={() => onChange(selected ? null : p.id)}
            style={{
              width: '100%', textAlign: 'left', padding: 12, borderRadius: 8,
              border: `1px solid ${selected ? T.forest300 : T.ink150}`,
              background: selected ? T.forest50 : 'white',
              boxShadow: selected ? T.shadowMd : 'none',
              cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              border: `1px solid ${selected ? T.forest300 : T.ink150}`,
              background: selected ? T.forest100 : T.ink50,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              {ICONS[p.id] ?? '🍷'}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 16, color: T.ink900, lineHeight: 1.2 }}>
                {p.name}
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.ink400, lineHeight: 1.4 }}>
                {p.description}
              </div>
              <div style={{ marginTop: 4, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.ochre500, fontFamily: T.fontBody, fontWeight: 500 }}>
                Loves · {p.loves.slice(0, 3).join(' · ')}
              </div>
            </div>
            <div style={{ alignSelf: 'center', fontSize: 18, color: selected ? T.forest500 : T.ink300, fontFamily: T.fontDisplay }}>
              {selected ? '✓' : '›'}
            </div>
          </button>
        )
      })}
    </div>
  )
}
