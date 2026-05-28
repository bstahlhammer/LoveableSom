import { useState } from 'react'
import { theme } from '../theme/theme.js'
import FeedbackModal from './FeedbackModal.jsx'

export default function FeedbackFAB({ currentScreen, userId, showToast }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute',
          bottom: 96,
          right: 12,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: theme.radius.pill,
          background: theme.colors.brand,
          color: theme.colors.textOnDark,
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: theme.typography.fontBody,
          fontWeight: theme.typography.weights.medium,
          boxShadow: theme.shadows.elevated,
          letterSpacing: '0.01em',
        }}
        aria-label="Leave feedback"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M11.5 1.5a2.121 2.121 0 0 1 3 3L5 14H2v-3L11.5 1.5Z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          />
        </svg>
        Feedback
      </button>

      {open && (
        <FeedbackModal
          currentScreen={currentScreen}
          userId={userId}
          showToast={showToast}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
