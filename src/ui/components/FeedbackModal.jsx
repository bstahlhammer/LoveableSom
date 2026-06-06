import { useState } from 'react'
import { theme } from '../theme/theme.js'
import { supabase } from '../../integrations/supabase/client.ts'

const TYPES = ['Feature Request', 'Bug', 'UX Feedback']
const MAX = 500

export default function FeedbackModal({ currentScreen, userId, showToast, onClose }) {
  const [type, setType]               = useState('Feature Request')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting]   = useState(false)

  const canSubmit = description.trim().length >= 10 && !submitting
  const count     = description.length
  const overLimit = count >= MAX - 10

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    const { error } = await supabase.from('feedback').insert({
      user_id:     userId,
      type,
      description: description.trim(),
      screen:      currentScreen,
    })
    setSubmitting(false)
    if (error) {
      showToast("Couldn't send — try again")
    } else {
      showToast('Feedback sent — thanks!')
      onClose()
      // fire-and-forget: create GitHub issue + AI triage (errors silently ignored)
      fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description: description.trim(), screen: currentScreen }),
      }).catch(() => {})
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(20, 8, 30, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: theme.colors.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          display: 'flex', flexDirection: 'column', gap: theme.spacing.lg,
          boxShadow: theme.shadows.elevated,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            margin: 0,
            fontFamily: theme.typography.fontDisplay,
            fontSize: 20, fontWeight: 600,
            color: theme.colors.text,
          }}>
            Share feedback
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, lineHeight: 1, padding: 4,
              color: theme.colors.textMuted,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Type picker */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: '6px 14px',
                borderRadius: theme.radius.pill,
                border: `1.5px solid ${type === t ? theme.colors.brand : theme.colors.border}`,
                background: type === t ? theme.colors.brand : 'transparent',
                color: type === t ? theme.colors.textOnDark : theme.colors.textMuted,
                fontSize: 13,
                fontFamily: theme.typography.fontBody,
                fontWeight: type === t ? theme.typography.weights.medium : theme.typography.weights.regular,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, MAX))}
            placeholder="What's on your mind?"
            rows={4}
            style={{
              resize: 'none',
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: theme.radius.md,
              border: `1.5px solid ${theme.colors.border}`,
              background: theme.colors.cream,
              color: theme.colors.text,
              fontSize: 14,
              fontFamily: theme.typography.fontBody,
              lineHeight: 1.5,
              outline: 'none',
            }}
          />
          <span style={{
            alignSelf: 'flex-end',
            fontSize: 12,
            color: overLimit ? theme.colors.magenta : theme.colors.textMuted,
          }}>
            {count}/{MAX}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: theme.radius.pill,
              border: `1.5px solid ${theme.colors.border}`,
              background: 'transparent',
              color: theme.colors.textMuted,
              fontSize: 14,
              fontFamily: theme.typography.fontBody,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '9px 20px',
              borderRadius: theme.radius.pill,
              border: 'none',
              background: canSubmit ? theme.colors.brand : theme.colors.border,
              color: canSubmit ? theme.colors.textOnDark : theme.colors.textMuted,
              fontSize: 14,
              fontFamily: theme.typography.fontBody,
              fontWeight: theme.typography.weights.medium,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s ease',
              minWidth: 80,
            }}
          >
            {submitting ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
