/**
 * Uncork design-system theme bridge.
 *
 * Every value points at a CSS variable defined in `tokens.css`.
 * Light/dark mode auto-switches via [data-theme="dark"] on <html>.
 */

export const theme = {
  colors: {
    // Primary brand: wine red
    brand:        'var(--color-primary)',
    brandDark:    'var(--wine-700)',
    brandDeep:    'var(--wine-800)',

    // Red spectrum
    crimson:      'var(--wine-400)',
    crimsonSoft:  'var(--wine-100)',

    // Warm accent (terra/ember)
    ember:        'var(--terra-500)',
    emberBright:  'var(--terra-400)',
    peach:        'var(--terra-100)',

    // Gold / value
    gold:         'var(--color-value)',
    goldBright:   'var(--gold-400)',

    // Taste-fit: violet (replaces old purple/berry/magenta)
    crowd:        'var(--color-taste)',
    berry:        'var(--violet-500)',
    magenta:      'var(--wine-300)',
    magentaBright:'var(--wine-200)',

    // Cool tones (mapped to ink/violet — no true teal in the palette)
    teal:         'var(--violet-400)',
    tealDeep:     'var(--violet-500)',
    tide:         'var(--ink-300)',

    // Backgrounds
    cream:        'var(--ink-50)',
    parchment:    'var(--bg-base)',
    surface:      'var(--bg-surface)',
    surfaceAlt:   'var(--bg-raised)',

    // Foreground
    text:         'var(--fg-1)',
    textMuted:    'var(--fg-2)',
    textOnDark:   'var(--fg-inv)',

    // Borders & tracks
    border:       'var(--border)',
    dotEmpty:     'var(--ink-200)',
    barTrack:     'var(--bg-raised)',

    // Status
    success:      'var(--wine-600)',
    warning:      'var(--gold-700)',

    // Match scores
    matchHigh:    'var(--color-primary)',
    matchMid:     'var(--color-value)',
    matchLow:     'var(--ink-300)',

    // Badge backgrounds
    crowdBg:      'var(--color-taste-subtle)',
    valueBg:      'var(--color-value-subtle)',
    bestMatchBg:  'var(--color-primary-subtle)',
    criticBg:     'var(--color-primary)',
  },

  typography: {
    fontDisplay: "var(--font-display)",   // Cormorant Garamond — wine names, hero text
    fontLogo:    "var(--font-display)",   // same editorial face for the wordmark
    fontSerif:   "var(--font-display)",
    fontSans:    "var(--font-body)",      // Outfit — all UI text

    sizes: {
      xs:   'var(--text-xs)',    // 11
      sm:   'var(--text-sm)',    // 13
      md:   'var(--text-base)',  // 15
      lg:   'var(--text-md)',    // 17
      xl:   'var(--text-lg)',    // 20
      xxl:  'var(--text-xl)',    // 24
      xxxl: 'var(--text-3xl)',   // 38
    },

    weights: {
      normal: 400,
      medium: 500,
    },
  },

  spacing: {
    xs:  'var(--space-1)',   // 4
    sm:  'var(--space-2)',   // 8
    md:  'var(--space-3)',   // 12
    lg:  'var(--space-4)',   // 16
    xl:  'var(--space-6)',   // 24
    xxl: 'var(--space-8)',   // 32
  },

  radius: {
    sm:   'var(--radius-sm)',
    md:   'var(--radius-md)',
    lg:   'var(--radius-lg)',
    pill: 'var(--radius-full)',
  },

  shadows: {
    card:     'var(--shadow-sm)',
    elevated: 'var(--shadow-md)',
    brass:    '0 4px 12px oklch(42% .10 70 / 0.25)',
  },
}
