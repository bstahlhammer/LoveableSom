# Spec 034 — Wine Education Card

## Problem
The Wine Detail screen tells a user whether a wine fits their palate and what it tastes like, but it never answers "why is this wine interesting?" A curious, early-stage wine drinker leaves the screen with a score and some tasting notes but no hook to remember the wine or its place in the broader world. The pairing card and tasting notes are evaluative — they say nothing educational.

## Goals
- Add a "What makes this interesting" card to WineDetailScreen for wines whose grape or region is in the education library.
- Build a static education library (~80 entries) covering the most common grapes and wine regions encountered during scans.
- Keep writing plain and human — no critic-speak, no jargon, no marketing language.

## Non-Goals
- AI-generated per-wine notes (separate concern; static lookup is faster and more reliable).
- Covering every possible grape or region (unknown entries gracefully omitted).
- Editing or admin-managing the education content from within the app.

## Behavior

### Education card placement
The card renders in the WineDetailScreen scrollable body, between the "Tastes like" tasting notes block and the flavor-tag row. If neither the wine's `grape` nor `region` matches any entry in the library, the card is omitted entirely.

### Card anatomy
- Label: `WHAT MAKES THIS INTERESTING` (uppercase, 10px, T.ink400, same style as other section labels)
- Body: 2–4 sentences of plain-language context. Grape entry preferred; fall back to region entry if grape not found.
- A small decorative left-border accent in T.forest300 (2px, rounded), similar treatment to the pairing card.
- No title beyond the section label — the text speaks for itself.

### Education library structure
New file `src/core/data/wineEducation.js` — a default-export JS object with two keys:

```js
export default {
  grapes: {
    'pinot noir':      { text: '...' },
    'chardonnay':      { text: '...' },
    // ~40 entries
  },
  regions: {
    'burgundy':        { text: '...' },
    'sancerre':        { text: '...' },
    // ~40 entries
  }
}
```

Lookup is case-insensitive substring match against `wine.grape` (grapes dict) then `wine.region` (regions dict). First match wins.

### Minimum grape entries
Cabernet Sauvignon, Merlot, Pinot Noir, Syrah/Shiraz, Malbec, Tempranillo, Sangiovese, Nebbiolo, Grenache, Gamay, Chardonnay, Sauvignon Blanc, Riesling, Pinot Gris/Grigio, Albariño, Viognier, Grüner Veltliner, Gewürztraminer, Chenin Blanc, Moscato/Muscat, Champagne/Sparkling blend, Prosecco, Cava, Rosé (generic).

### Minimum region entries
Bordeaux, Burgundy, Champagne, Rhône, Loire, Alsace, Beaujolais, Provence, Rioja, Ribera del Duero, Tuscany/Chianti, Barolo/Piedmont, Prosecco/Veneto, Mosel, Rhine/Rheingau, Napa Valley, Sonoma, Willamette Valley, Mendoza, Marlborough, Barossa Valley, Hunter Valley, Douro.

### Text quality guidelines (enforced in code review, not in runtime)
- Written for someone who has never taken a wine class.
- Each entry answers at least one of: why is this grape/region special, what should I expect in the glass, what's a fun fact that creates curiosity.
- Maximum 60 words per entry.
- No scoring numbers, no point references.

## Edge Cases
- Wine has no `grape` and no `region`: card omitted.
- Wine grape is a blend ("Bordeaux blend", "GSM"): match falls through to region lookup.
- Region string contains the library key as a substring (e.g. wine.region = "Côte de Nuits, Burgundy"): the case-insensitive includes() check catches "burgundy" in that string.

## Acceptance Criteria
- Opening the detail screen for a Pinot Noir renders the education card with the Pinot Noir text between tasting notes and flavor tags.
- Opening the detail screen for a wine from Sancerre (but grape not in library) renders the Sancerre region text.
- Opening the detail screen for an obscure unlisted grape from an unlisted region renders no education card (the gap between tasting notes and flavor tags disappears cleanly).
- Card text contains no wine-scoring numbers.
- Education library covers all grape and region entries listed in "Minimum" sections above.

## Files
- `src/core/data/wineEducation.js` — new static library (grapes + regions)
- `src/ui/screens/WineDetailScreen.jsx` — add EducationCard component + lookup logic in scrollable body
