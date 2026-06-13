# Spec 038 — Tappable Wine Vocabulary

## Problem
Wine vocabulary appears throughout the app — in tasting notes ("mineral finish," "grippy tannins"), in the ProfileScreen axis labels (Body, Tannin, Acidity, Sweetness), in style badges ("Pét-Nat," "Skin Contact"), and in the GuidedQuiz. These terms are never explained. A curious learner encountering "terroir" or "bretty" for the first time has no recourse other than leaving the app to Google it. Every unexplained term is a small moment of exclusion that reinforces the feeling that wine is a world with gatekeepers.

## Goals
- Build a shared vocabulary glossary with ~60 entries.
- Make any occurrence of a listed term in tasting notes and ProfileScreen axis labels tappable.
- Tapping any term opens a bottom-sheet definition: 2–3 plain-language sentences + a real-world analogy.
- Axis labels on the WineRadar and the ProfileScreen axes also become tappable.

## Non-Goals
- Automated term detection in arbitrary text (manual markup only for tasting notes — too risky to auto-link).
- Covering every possible obscure wine term in v1 (~60 is sufficient for common encounters).
- Flashcard or quiz mode (separate concern).

## Behavior

### Glossary data
New file `src/core/data/wineGlossary.js`, default export: array of `{ term: string, aliases: string[], definition: string, analogy: string }`.

- `term`: canonical name, lowercase ("tannin", "terroir").
- `aliases`: alternate spellings/forms ["tannic", "tannins"].
- `definition`: 2 plain-English sentences. No scoring language. No jargon in the definition.
- `analogy`: one sentence connecting to everyday experience ("Like the way strong black tea dries out your mouth.").

Minimum terms to cover: tannin, acidity, body, sweetness, finish, minerality, terroir, oak, tannins, grip, fruit-forward, earthy, funky, barnyard, brett, pét-nat, skin-contact / orange wine, natural wine, biodynamic, sparkling, still, vintage, varietal/grape variety, appellation, estate, reserve, old vine, new world, old world, dry, off-dry, bone dry, crisp, full-bodied, light-bodied, structured, approachable, complex, elegant, bold, food-friendly, decanting, aeration, sulfites, organic, amphora, lees, malolactic fermentation, carbonic maceration, sur lie, négociant.

### VocabTerm component
New shared component `src/ui/components/VocabTerm.jsx`.

Props: `{ term: string, children: ReactNode }`.

Renders `children` wrapped in a `<span>` with:
- A subtle dotted underline (border-bottom: 1px dotted T.forest400).
- Tap opens a bottom sheet (same sheet pattern as the InstallSheet in HomeScreen): overlay + slide-up panel.

Sheet anatomy:
```
[drag handle]
TERM NAME   (T.fontDisplay, 24px, T.ink900)

definition sentences   (T.fontBody, 14px, T.ink700, line-height 1.55)

"In everyday terms:"
analogy sentence   (T.fontBody, 13px, T.ink500, italic)

[Got it]  button (T.forest500, full width, same style as InstallSheet)
```

### Usage in WineDetailScreen — tasting notes
The `wine.tasting` string is scanned against the glossary (lowercased). For each matched alias, the text is split and the matched portion is wrapped in `<VocabTerm term={canonical}>`. This parsing happens in a `parseWithVocab(text, glossary)` utility function. The output is a React node array (mix of strings and VocabTerm elements) rendered inside the italic tasting-notes `<p>`.

Parsing rules:
- Only wrap whole-word matches (word boundaries).
- Match longest alias first (avoid "dry" matching inside "off-dry" prematurely).
- A term is only wrapped once per tasting note string (first occurrence).

### Usage in ProfileScreen — axis labels
The four `AXES` labels (Body, Sweetness, Tannin, Acidity) in `StatsView` and the five `CHAR_AXES` labels (Earthiness, Funk, Mineral, Oak, Floral) each render as `<VocabTerm>` elements.

The WineRadar axis labels in both `WineDetailScreen` and `ProfileScreen` are SVG `<text>` elements — these cannot use VocabTerm directly. Instead, add transparent tap-target `<rect>` elements positioned over each axis label that trigger the sheet programmatically via a shared `useVocabSheet` hook.

### `useVocabSheet` hook
`src/ui/hooks/useVocabSheet.js` — provides `{ openTerm, sheetProps }`.

- `openTerm(termName)`: opens the sheet for the given canonical term.
- `sheetProps`: `{ visible, term, onClose }` — passed to `<VocabSheet>`.

This allows SVG tap targets to open the sheet without wrapping SVG text in React components.

## Edge Cases
- Term appears in tasting notes but the app has no entry for it: no underline, no sheet.
- Tapping a term while a sheet is already open: close the first sheet, open the new one.
- `wine.tasting` is null: `parseWithVocab` returns null; no change to render.
- The glossary `analogy` field is empty for some entries: the "In everyday terms:" row is omitted.

## Acceptance Criteria
- A tasting note containing "grippy tannins" shows "tannin" with a dotted underline.
- Tapping "tannin" in any tasting note opens a bottom sheet with definition and analogy.
- The axis label "Acidity" in the ProfileScreen Stats view is tappable and opens the acidity entry.
- Tapping "Tannin" on the WineRadar chart (SVG) opens the tannin sheet.
- Terms are only wrapped on their first occurrence in any given string.
- "Bone dry" (two words) matches before "dry" (one word) when both appear in the same text.
- Sheet closes cleanly on overlay tap or "Got it" button.

## Files
- `src/core/data/wineGlossary.js` — glossary data, ~60 entries
- `src/ui/components/VocabTerm.jsx` — inline tappable term + bottom sheet
- `src/ui/hooks/useVocabSheet.js` — imperative sheet controller for SVG contexts
- `src/core/utils/parseWithVocab.js` — text → React-node-array parser
- `src/ui/screens/WineDetailScreen.jsx` — apply VocabTerm parsing to tasting notes
- `src/ui/screens/ProfileScreen.jsx` — wrap axis labels; add SVG tap targets on radars
