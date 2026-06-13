import { useState } from 'react'
import T from '../theme/T.js'

// ── Bottom sheet shared by VocabTerm (self-contained) and useVocabSheet (SVG contexts)
export function VocabSheet({ entry, onClose }) {
  if (!entry) return null
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 900, touchAction: 'none',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 901,
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: '12px 22px 40px',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.ink200, margin: '0 auto 20px' }} />

        <div style={{ fontFamily: T.fontDisplay, fontSize: 26, color: T.ink900, marginBottom: 12, lineHeight: 1.1 }}>
          {entry.term.charAt(0).toUpperCase() + entry.term.slice(1)}
        </div>

        <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.ink700, lineHeight: 1.6, margin: '0 0 14px' }}>
          {entry.definition}
        </p>

        {entry.analogy && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink400, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.fontBody, marginBottom: 6 }}>
              In everyday terms
            </div>
            <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink500, fontStyle: 'italic', lineHeight: 1.55, margin: '0 0 22px' }}>
              {entry.analogy}
            </p>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '13px',
            background: T.forest500, color: 'white',
            border: 'none', borderRadius: 9999,
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </>
  )
}

// ── Inline tappable term — self-contained, manages its own sheet state
export default function VocabTerm({ term, entry: entryProp, children }) {
  const [open, setOpen] = useState(false)

  // entryProp is passed directly from parseWithVocab; term (string) is used for SVG/profile labels
  const entry = entryProp ?? null

  if (!entry) return <>{children}</>

  return (
    <>
      <span
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        style={{
          borderBottom: `1px dotted ${T.forest400}`,
          cursor: 'pointer',
          display: 'inline',
        }}
      >
        {children}
      </span>
      {open && <VocabSheet entry={entry} onClose={() => setOpen(false)} />}
    </>
  )
}
