export const theme = {
  colors: {
    // Core palette — "Watercolor Spectrum"
    // Deep plum/aubergine bases + magenta-rose primary, watercolor teal,
    // wine berry, peach + soft rose. Warm cream paper for light surfaces.
    brand:       '#3D1B4E',  // deep plum (replaces navy)
    brandDark:   '#1A0B26',  // near-black aubergine
    brandDeep:   '#5A2A6E',  // mid plum for layering

    // Primary accent — magenta-rose (replaces ember orange).
    // gold / goldBright kept as compat aliases pointing at the same hues.
    gold:        '#C2418A',
    goldBright:  '#E15FA8',
    ember:       '#C2418A',
    emberBright: '#E15FA8',
    magenta:     '#C2418A',
    magentaBright: '#E15FA8',

    // Wine berry — used for flame-tip / depth accents.
    crimson:     '#8E2A5A',
    crimsonSoft: '#D88AAE',
    berry:       '#8E2A5A',
    rose:        '#D88AAE',

    // Tide — kept name, retuned to the watercolor teal in the wing.
    tide:        '#4FA89C',
    tideLight:   '#9FCFC6',
    tideDeep:    '#1F6B66',
    teal:        '#4FA89C',
    tealDeep:    '#1F6B66',

    // New warm hue from the wing — peach/apricot wash.
    peach:       '#F2A57C',
    peachDeep:   '#D87A4E',

    // Surfaces & ink
    cream:       '#FAF6EE',  // watercolor paper
    parchment:   '#F2EAD9',  // aged paper for cards on dark
    text:        '#2A1234',  // deep aubergine ink
    textMuted:   '#6E5A78',  // dusty plum
    textOnDark:  '#F4ECF6',  // soft pink-white on dark plum
    surface:     '#FAF6EE',  // off-white warm surface
    surfaceAlt:  '#F2EAD9',  // alternate card surface
    border:      '#E4D8E1',  // soft plum-tinted edge
    borderDark:  '#5A2A6E',  // plum border on dark

    // Status / data
    success:     '#4FA89C',  // teal
    warning:     '#F2A57C',  // peach
    crowd:       '#1F6B66',  // deep teal
    matchHigh:   '#4FA89C',
    matchMid:    '#F2A57C',
    matchLow:    '#8E2A5A',
    crowdBg:     '#DCEEEB',
    valueBg:     '#FBE4D5',
    bestMatchBg: '#DCEEEB',
    criticBg:    '#3D1B4E',
    dotEmpty:    '#E4D8E1',
    barTrack:    '#F2EAD9',
  },
  typography: {
    // Logo only: "Lotus Eater Sans" — reserved for the wordmark on the home screen.
    // Display & Body/UI use "Open Sauce One" everywhere else.
    fontLogo:    "'Lotus Eater Sans', 'Sora', system-ui, sans-serif",
    fontSerif:   "'Open Sauce One', 'Open Sauce', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontDisplay: "'Open Sauce One', 'Open Sauce', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSans:    "'Open Sauce One', 'Open Sauce', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sizes: {
      xs:   '11px',
      sm:   '12px',
      md:   '14px',
      lg:   '16px',
      xl:   '20px',
      xxl:  '26px',
      xxxl: '36px',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
  },
  spacing: {
    xs:  '4px',
    sm:  '8px',
    md:  '12px',
    lg:  '16px',
    xl:  '24px',
    xxl: '36px',
  },
  radius: {
    sm:   '4px',
    md:   '8px',
    lg:   '14px',
    pill: '100px',
  },
  shadows: {
    card:     '0 2px 8px rgba(42, 18, 52, 0.10), 0 1px 2px rgba(42, 18, 52, 0.05)',
    elevated: '0 12px 32px rgba(42, 18, 52, 0.22), 0 2px 6px rgba(42, 18, 52, 0.10)',
    brass:    '0 0 0 1px rgba(194, 65, 138, 0.30), 0 4px 16px rgba(42, 18, 52, 0.22)',
  },
}
