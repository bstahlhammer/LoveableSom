# Spec 035 — Plain-Language Palate Translation

## Problem
The taste profile screens (Radar, Stats) show Body / Sweetness / Tannin / Acidity as numbers or chart positions. A curious wine beginner looks at this and cannot translate it into action. They don't know whether "high acidity" is good or bad for them, what to order when they can't scan, or how to describe themselves to a wine shop employee. The profile is useful data trapped behind vocabulary the user doesn't yet own.

## Goals
- Add a "What this means for you" plain-language summary block to the ProfileScreen Radar tab.
- Build a `describePalate(palate)` function that generates 3–5 human sentences from the four axis values.
- Include vocabulary the user can take into a restaurant or wine shop ("look for the word…").

## Non-Goals
- Changing the radar chart itself.
- AI-generated descriptions (rule-based is sufficient and more consistent).
- Covering the character axes (earthiness, funk, mineral, oak, floral) in this first pass.

## Behavior

### Summary block placement
Renders in the Radar tab of ProfileScreen, below the radar chart and the existing "your palate" archetype chip. Replaces the blank space currently below the chart.

### `describePalate(palate)` function
New export from `src/core/engine/palateDescriptor.js`.

Input: `{ body, sweetness, tannin, acidity }` each 0–100.

Output: `{ headline: string, sentences: string[], shopWords: string[] }`

- `headline`: one sentence, ~12 words, captures the dominant character. E.g. "You like wines that feel light, crisp, and clean."
- `sentences`: 2–4 sentences that explain what each axis means for the user's actual drinking experience. Written in second person. Example for high acidity: "That brightness you feel on the sides of your tongue — the zingy, almost mouth-watering sensation — is acidity. You like a lot of it."
- `shopWords`: 3–6 words or short phrases the user can say in a wine shop or scan a menu for. E.g. ["crisp", "mineral", "unoaked", "high-acid", "light-bodied"].

### Axis threshold bands (per axis)
**Body** (1-100): ≤33 = light, 34–66 = medium, ≥67 = full  
**Sweetness** (1-100): ≤15 = bone dry, 16–30 = dry, 31–50 = off-dry, ≥51 = sweet  
**Tannin** (1-100): ≤33 = soft, 34–66 = medium, ≥67 = grippy  
**Acidity** (1-100): ≤33 = round, 34–66 = medium, ≥67 = bright/crisp  

### Sentence construction rules
- Highest-contrast axis (furthest from 50) generates the lead sentence.
- Sweetness at bone-dry or dry always gets an explicit mention (many users don't realize this is a preference).
- If body + tannin are both high: add a sentence about food pairing ("wines like this need something to hold onto — a steak, a lamb chop, aged cheese").
- If acidity is high + body is low: add a sentence about versatility ("wines with this profile work almost anywhere — aperitivo, fish, salads, or just by themselves").
- `shopWords` are drawn from a static lookup keyed by band, not generated freeform.

### Rendering in ProfileScreen (Radar tab)
```
[Radar chart — existing]
[Archetype chip — existing]

─────── WHAT THIS MEANS FOR YOU ───────

headline sentence

sentence 1
sentence 2
[sentence 3 if applicable]

Look for these words:   crisp · mineral · unoaked
```

The "Look for these words" row renders each word as a small pill (T.forest50 background, T.forest700 text, same pill style as flavor tags).

## Edge Cases
- `palate` is null or all zeros: `describePalate` returns `null`; the block is omitted.
- All four axes are near 50 (true mid-palate): the headline uses a "balanced" framing — "You're drawn to balanced, food-friendly wines that work in almost any situation."
- Profile has been built from archetype seed only (low confidence): the block renders with the same text but with a footnote "Based on your archetype — rate more wines to sharpen this." The footnote uses T.ink400, 11px.

## Acceptance Criteria
- Opening the Radar tab for a user with high acidity (≥67), low body (≤33) renders a headline that captures those two traits and includes at least two `shopWords` that a sommelier would recognize as appropriate.
- A user with high tannin + high body sees a food-pairing sentence.
- A user with a fully null palate sees no "What this means" block (no empty box).
- The shop-words pills are readable at 10px and tap-target is at least 28px tall.
- `describePalate` is a pure function with no side effects — no API calls, no state.

## Files
- `src/core/engine/palateDescriptor.js` — new, exports `describePalate(palate)`
- `src/ui/screens/ProfileScreen.jsx` — Radar tab: add `describePalate` block below chart + archetype chip
