/**
 * Guided sommelier-style quiz — declarative branching tree.
 *
 * Each node is a question. Each option carries:
 *   - `palate`: signed deltas added to a neutral baseline
 *               { body: 50, sweetness: 30, tannin: 50, acidity: 50 }
 *   - `flavor`: optional flavor-character flag (fruity / savory / balanced)
 *   - `next`:   id of the next node, or `null` to end the quiz.
 *               May be a function (answers) => nextId for branching.
 *
 * "Not sure" options always have empty palate deltas so they don't pollute
 * signal. Every question allows skipping forward via "Not sure".
 *
 * Palate axes (0–100):
 *   body       — light → full
 *   sweetness  — bone dry → very sweet
 *   tannin     — soft/none → very grippy
 *   acidity    — soft → mouthwatering
 */

export const NEUTRAL_BASELINE = { body: 50, sweetness: 30, tannin: 50, acidity: 50 }

// Threshold for showing the optional advanced level: at least N answers must
// be confident (i.e. not "not sure") AND no entry-level "not sure".
function shouldShowAdvanced(answers) {
  const confidentCount = Object.values(answers).filter(a => a && !a.notSure).length
  const entryConfident = answers.entry && !answers.entry.notSure
  return entryConfident && confidentCount >= 4
}

export const guidedQuizTree = {
  // ── Level 1 — Entry ────────────────────────────────────────────────
  entry: {
    id: 'entry',
    level: 1,
    levelLabel: 'Getting to know you',
    question: 'What kind of wine do you usually enjoy?',
    subtitle: 'Pick the one that sounds most like you.',
    type: 'single',
    options: [
      {
        id: 'light_crisp',
        label: 'Light and crisp',
        hint: 'Bright, refreshing whites and rosés',
        palate: { body: -25, acidity: 20, tannin: -15 },
        next: 'sweetness',
      },
      {
        id: 'smooth_fruity',
        label: 'Smooth and fruity',
        hint: 'Easy-drinking with juicy fruit',
        palate: { body: 0, sweetness: 10, tannin: -10 },
        next: 'sweetness',
      },
      {
        id: 'rich_bold',
        label: 'Rich and bold',
        hint: 'Full-bodied reds with structure',
        palate: { body: 25, tannin: 15 },
        next: 'sweetness',
      },
      {
        id: 'not_sure',
        label: 'Not sure yet',
        hint: 'Help me figure it out',
        palate: {},
        notSure: true,
        next: 'flavors', // skip to flavor-first path
      },
    ],
  },

  // ── Level 2 — Simple taste path ────────────────────────────────────
  sweetness: {
    id: 'sweetness',
    level: 2,
    levelLabel: 'Sweetness',
    question: 'Do you like wines that taste more dry or a little sweet?',
    subtitle: 'Dry means almost no sugar; sweet wines linger longer on the tongue.',
    type: 'single',
    options: [
      { id: 'dry',     label: 'Dry',            palate: { sweetness: -25 }, next: 'acidity' },
      { id: 'slight',  label: 'Slightly sweet', palate: { sweetness: 10 },  next: 'acidity' },
      { id: 'sweet',   label: 'Sweet',          palate: { sweetness: 35 },  next: 'acidity' },
      { id: 'not_sure',label: 'Not sure',       palate: {}, notSure: true,  next: 'acidity' },
    ],
  },

  acidity: {
    id: 'acidity',
    level: 2,
    levelLabel: 'Brightness',
    question: 'Do you prefer wines that feel crisp and mouthwatering, or soft and round?',
    subtitle: 'Crisp wines make your mouth water. Soft wines feel mellow and gentle.',
    type: 'single',
    options: [
      { id: 'crisp', label: 'Crisp and mouthwatering', palate: { acidity: 20 },  next: 'tannin' },
      { id: 'soft',  label: 'Soft and round',          palate: { acidity: -15 }, next: 'tannin' },
      { id: 'both',  label: 'Both, depending on mood', palate: { acidity: 0 },   next: 'tannin' },
      { id: 'not_sure', label: 'Not sure',             palate: {}, notSure: true, next: 'tannin' },
    ],
  },

  tannin: {
    id: 'tannin',
    level: 2,
    levelLabel: 'Grip',
    question: 'Do you like a drying, grippy feeling in red wine?',
    subtitle: 'That\'s tannin — the sensation that makes your gums feel slightly fuzzy.',
    type: 'single',
    options: [
      { id: 'yes',         label: 'Yes, I like grip',          palate: { tannin: 25 },  next: 'flavors' },
      { id: 'a_little',    label: 'A little',                  palate: { tannin: 5 },   next: 'flavors' },
      { id: 'smooth',      label: 'No, I prefer smooth reds',  palate: { tannin: -20 }, next: 'flavors' },
      { id: 'white_only',  label: 'I mainly drink white wine', palate: { tannin: -25 }, next: 'flavors' },
      { id: 'not_sure',    label: 'Not sure',                  palate: {}, notSure: true, next: 'flavors' },
    ],
  },

  // ── Level 3 — Flavor path ──────────────────────────────────────────
  flavors: {
    id: 'flavors',
    level: 3,
    levelLabel: 'Flavors',
    question: 'Which flavors sound most appealing?',
    subtitle: 'Pick all that catch your eye — no wrong answers.',
    type: 'multi',
    options: [
      { id: 'citrus',   label: 'Citrus, green apple, lime',         palate: { acidity: 10, body: -5 } },
      { id: 'stone',    label: 'Stone fruit, peach, apricot',       palate: { sweetness: 5, acidity: 5 } },
      { id: 'red_fruit',label: 'Red fruit, cherry, strawberry',     palate: { body: -5, tannin: -5 } },
      { id: 'black',    label: 'Black fruit, plum, blackberry',     palate: { body: 10, tannin: 10 } },
      { id: 'herbal',   label: 'Herbal, grassy, vegetal',           palate: { acidity: 10, sweetness: -10 }, flavor: 'savory' },
      { id: 'earthy',   label: 'Earthy, mushroom, forest floor',    palate: { tannin: 5, sweetness: -5 }, flavor: 'savory' },
      { id: 'spicy',    label: 'Spicy, peppery, smoky',             palate: { body: 10, tannin: 10 }, flavor: 'savory' },
      { id: 'oaky',     label: 'Oaky, vanilla, toast',              palate: { body: 10, sweetness: 5 } },
    ],
    next: 'fruity_savory',
  },

  fruity_savory: {
    id: 'fruity_savory',
    level: 3,
    levelLabel: 'Character',
    question: 'Do you want a wine that tastes more fruity or savory?',
    subtitle: 'Fruity wines lead with ripe fruit; savory wines lean herbal, earthy, or mineral.',
    type: 'single',
    options: [
      { id: 'fruity',   label: 'Fruity',   palate: { sweetness: 5 },  flavor: 'fruity',   next: 'body' },
      { id: 'savory',   label: 'Savory',   palate: { sweetness: -10 }, flavor: 'savory',   next: 'body' },
      { id: 'balanced', label: 'Balanced', palate: {},                 flavor: 'balanced', next: 'body' },
      { id: 'not_sure', label: 'Not sure', palate: {}, notSure: true,  next: 'body' },
    ],
  },

  // ── Level 4 — Body & structure ─────────────────────────────────────
  body: {
    id: 'body',
    level: 4,
    levelLabel: 'Weight',
    question: 'How heavy should the wine feel?',
    subtitle: 'Like the difference between skim milk, whole milk, and cream.',
    type: 'single',
    options: [
      { id: 'light',    label: 'Light-bodied',  palate: { body: -25 }, next: 'warmth' },
      { id: 'medium',   label: 'Medium-bodied', palate: { body: 0 },   next: 'warmth' },
      { id: 'full',     label: 'Full-bodied',   palate: { body: 25 },  next: 'warmth' },
      { id: 'not_sure', label: 'Not sure',      palate: {}, notSure: true, next: 'warmth' },
    ],
  },

  warmth: {
    id: 'warmth',
    level: 4,
    levelLabel: 'Warmth',
    question: 'How much warmth do you want from alcohol?',
    subtitle: 'Higher-alcohol wines feel warming, almost like a slight burn.',
    type: 'single',
    options: [
      { id: 'low',      label: 'Low warmth',         palate: { body: -10 }, next: (a) => shouldShowAdvanced(a) ? 'advanced_structure' : null },
      { id: 'some',     label: 'Some warmth',        palate: { body: 0 },   next: (a) => shouldShowAdvanced(a) ? 'advanced_structure' : null },
      { id: 'rich',     label: 'Rich and warming',   palate: { body: 15 },  next: (a) => shouldShowAdvanced(a) ? 'advanced_structure' : null },
      { id: 'not_sure', label: 'Not sure',           palate: {}, notSure: true, next: null },
    ],
  },

  // ── Level 5 — Advanced (gated) ─────────────────────────────────────
  advanced_structure: {
    id: 'advanced_structure',
    level: 5,
    levelLabel: 'Sommelier mode',
    question: 'Which style description fits you best?',
    subtitle: 'Optional — skip if it\'s not your vocabulary yet.',
    type: 'single',
    options: [
      { id: 'high_acid_light', label: 'High acid, light body, lower tannin',         palate: { acidity: 15, body: -15, tannin: -10 }, next: 'finish' },
      { id: 'medium_balanced', label: 'Medium acid, medium body, balanced structure', palate: {}, next: 'finish' },
      { id: 'firm_full_dark',  label: 'Firm tannin, full body, darker fruit',         palate: { tannin: 15, body: 15 }, next: 'finish' },
      { id: 'off_dry_aromatic',label: 'Off-dry, aromatic, lower bitterness',         palate: { sweetness: 15, tannin: -10 }, next: 'finish' },
      { id: 'not_sure',        label: 'Not sure',                                     palate: {}, notSure: true, next: 'finish' },
    ],
  },

  finish: {
    id: 'finish',
    level: 5,
    levelLabel: 'Finish',
    question: 'Which finish do you prefer?',
    subtitle: 'How long the flavor lingers after you swallow.',
    type: 'single',
    options: [
      { id: 'short',    label: 'Crisp and short',     palate: { body: -5, acidity: 5 }, next: null },
      { id: 'medium',   label: 'Smooth and medium',   palate: {}, next: null },
      { id: 'long',     label: 'Long and structured', palate: { body: 10, tannin: 10 }, next: null },
      { id: 'not_sure', label: 'I don\'t know',       palate: {}, notSure: true, next: null },
    ],
  },
}

export const GUIDED_INITIAL_NODE = 'entry'
