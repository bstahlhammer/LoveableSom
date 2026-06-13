# Spec 039 — Explore Style Mode

## Problem
The app is entirely scan-triggered — you have to be standing in front of a wine list or shelf to use it. A curious wine learner wants to engage with wine between purchasing moments: to browse styles, understand regions, and build a mental map of the wine world before they walk into a shop. There is no browsing or education pathway today, only decision-support at the point of purchase.

## Goals
- Add an Explore screen accessible from the HomeScreen, browsable without a scan.
- Organize exploration around 12 curated style pathways (e.g. "Crisp whites", "Bold reds", "Bubbles", "Skin contact").
- Each pathway: a short description, what to look for on a label, and 4–6 example bottles with catalog links.
- Personalize subtly: if the user has a taste profile, show which styles are likely matches and which are stretches.

## Non-Goals
- Live inventory or real-time pricing (static example bottles, Wine-Searcher link for purchase).
- User-generated pathways or social features.
- A search bar or exhaustive catalog browse (that's a separate product decision).

## Behavior

### Entry point
On HomeScreen, add a third button below "Rate a wine I tried":
```
[ Explore wine styles → ]
```
Style: transparent background, T.ink400 text, no border, T.fontBody 12px, centered — clearly tertiary. Navigates to `'explore'`.

For logged-out users: the button also appears and navigates to explore (no auth required).

### ExploreScreen layout
Top: branded header (same dark bar pattern as TasteBuilderScreen).  
Heading: "Explore the wine world" / subhead: "12 styles to try. Pick one and go deep."

Body: 2-column grid of StyleCards. On narrow phones (<360px): single column.

### StyleCard (grid item)
- 160×110 area with a color wash background (each style has a distinct T.* palette color).
- Style name: T.fontDisplay, 16px, T.ink0 (white on dark wash).
- 1-line descriptor: T.fontBody, 11px, T.ink200.
- If user has taste profile: a small "Great fit" (T.forest400) or "Stretch" (T.ochre400) badge bottom-right, based on whether the style's average palate is within 25 pts of the user's palate on body+acidity combined.
- Tap: opens StyleDetailScreen for that pathway.

### 12 style pathways (static data in `src/core/data/wineStyles.js`)
Each entry: `{ id, name, descriptor, colorKey, whatToLook, description, bottles[], avgPalate }`.

| id | Name | Descriptor |
|---|---|---|
| crisp-whites | Crisp whites | Sauvignon Blanc, Grüner, Albariño |
| rich-whites | Rich whites | Oaked Chardonnay, Viognier, Roussanne |
| light-reds | Light reds | Pinot Noir, Gamay, Barbera |
| bold-reds | Bold reds | Cabernet, Syrah, Malbec, Nebbiolo |
| rosé | Rosé | Dry Provence to fruit-forward styles |
| bubbles | Bubbles | Champagne, Crémant, Pét-Nat, Cava |
| skin-contact | Skin contact & orange | Orange wines, amber wines |
| natural | Natural & low-intervention | Natural, biodynamic, minimal-SO₂ |
| dessert | Sweet & dessert | Sauternes, Port, Tokaj, Moscato |
| fortified | Fortified | Sherry, Vermouth, Madeira |
| italian | Italian exploration | Nebbiolo, Sangiovese, Nerello |
| old-world-adventurous | Off the beaten path | Grüner, Txakoli, Assyrtiko, Mencía |

`avgPalate`: approximate `{ body, sweetness, tannin, acidity }` center for wines in this style, used for the fit badge calculation.

`bottles[]`: 4–6 static example wines: `{ name, producer, region, grape, priceRange, searchQuery }`. `searchQuery` feeds into the Wine-Searcher URL on the StyleDetailScreen.

`whatToLook`: array of 3–5 label keywords to look for ("look for 'Marlborough' or 'Loire'").

`description`: 3–4 plain-language sentences. Same writing guidelines as spec 034 (no critic scores, no jargon without explanation).

### StyleDetailScreen
Not a new route — rendered as a sub-view of ExploreScreen (state: `{ selectedStyle }`).

Layout:
```
[← Back]  [Style name]

[color wash hero with name + descriptor]

[description paragraph]

What to look for on a label:
  · keyword 1
  · keyword 2

Example bottles (vertical list):
  [bottle card × 4–6]

[Search all wines like this →]  (Wine-Searcher link)
```

**Bottle card**: name + producer, region, grape, price range badge ("$12–20"), and a "Find it" link → Wine-Searcher.

**Match badge** (if user has taste profile): each bottle card shows a small "Fits your palate" or "A stretch for you" badge based on the style's `avgPalate` vs user profile.

**"Search all wines like this"** button: opens Wine-Searcher with a style-appropriate search term (e.g. "Sauvignon Blanc Loire" for crisp-whites).

## Edge Cases
- User has no taste profile: grid renders with no fit/stretch badges. No login prompt shown.
- User's taste profile has null palate: treat as no profile for badge purposes.
- Screen navigated to directly (deep link, future): falls back to showing full grid.

## Acceptance Criteria
- HomeScreen shows the "Explore wine styles" button for both logged-in and logged-out users.
- Explore screen shows all 12 style cards in a 2-column grid.
- A user with a high-acidity, low-body taste profile sees "Great fit" on Crisp Whites and no badge (or "Stretch") on Bold Reds.
- Tapping a style card opens the detail view with description, "what to look for" list, and example bottle cards.
- Tapping "Find it" on an example bottle opens Wine-Searcher (external link, new tab).
- A logged-out user can browse all 12 styles without being prompted to sign in.

## Files
- `src/core/data/wineStyles.js` — 12 style pathway definitions with example bottles
- `src/ui/screens/ExploreScreen.jsx` — new screen, grid + detail sub-view
- `src/ui/screens/HomeScreen.jsx` — add "Explore wine styles" button
- App router: register `'explore'` → `ExploreScreen`
