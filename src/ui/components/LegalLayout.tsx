import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
// @ts-expect-error - JS theme module
import { theme } from '@/ui/theme/theme.js'

export function LegalLayout({ eyebrow, title, updated, children }: {
  eyebrow: string
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at top, ${theme.colors.brand} 0%, ${theme.colors.brandDark} 70%)`,
        fontFamily: theme.typography.fontSans,
        color: theme.colors.parchment,
        padding: '32px 20px 80px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: 32,
            color: theme.colors.gold,
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          ← Back to Uncork
        </Link>

        <div style={{
          fontSize: 10,
          letterSpacing: '0.32em',
          color: theme.colors.gold,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          {eyebrow}
        </div>
        <h1 style={{
          fontFamily: theme.typography.fontDisplay,
          fontSize: 44,

          color: theme.colors.cream,
          margin: 0,
          letterSpacing: '0.02em',
          lineHeight: 1.05,
        }}>
          {title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 32px' }}>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.colors.gold}, transparent)` }} />
          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.colors.gold }} />
          <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.colors.gold}, transparent)` }} />
        </div>

        <div style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: theme.colors.gold,
          marginBottom: 24,
        }}>
          Last updated · {updated}
        </div>

        <div className="legal-prose" style={{
          fontSize: 15,
          lineHeight: 1.7,
          color: theme.colors.textOnDark,
        }}>
          {children}
        </div>

        <div style={{
          marginTop: 56,
          paddingTop: 24,
          borderTop: `1px solid ${theme.colors.gold}40`,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          fontSize: 12,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}>
          <Link to="/privacy" style={{ color: theme.colors.gold, textDecoration: 'none' }}>Privacy</Link>
          <Link to="/terms" style={{ color: theme.colors.gold, textDecoration: 'none' }}>Terms</Link>
          <Link to="/account" style={{ color: theme.colors.gold, textDecoration: 'none' }}>Account</Link>
          <a href="mailto:brian@forgeproductstrategy.com" style={{ color: theme.colors.gold, textDecoration: 'none', marginLeft: 'auto' }}>
            brian@forgeproductstrategy.com
          </a>
        </div>
      </div>

      <style>{`
        .legal-prose h2 {
          font-family: ${theme.typography.fontDisplay};
          font-style: italic;
          font-size: 24px;
          color: ${theme.colors.cream};
          margin: 36px 0 12px;
          letter-spacing: 0.01em;
        }
        .legal-prose h3 {
          font-family: ${theme.typography.fontSans};
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: ${theme.colors.gold};
          margin: 24px 0 8px;
        }
        .legal-prose p { margin: 0 0 14px; }
        .legal-prose ul { margin: 0 0 14px; padding-left: 20px; }
        .legal-prose li { margin-bottom: 6px; }
        .legal-prose strong { color: ${theme.colors.cream}; font-weight: 600; }
        .legal-prose a { color: ${theme.colors.goldBright}; }
      `}</style>
    </div>
  )
}
