# Spec 010 — Character Axes

## Goals
Extend the taste profile and match engine with a second dimension of preference:
**character axes** that capture what a wine smells and tastes like, independent of
its structure. Users who prefer funky, earthy, mineral, oaky, or floral wines get
recommendations that reflect those preferences, not just body/tannin/acidity/sweetness.

## Non-goals
- New onboarding UI (v1 collects character preferences from the existing free-text
  description box only)
- Profile screen visualization of character axes (future)
- Character-axis filtering UI (future)
- Changing how structural axes work

---

## The five character axes

| Axis | Wine low end | Wine high end | Example wines |
|------|-------------|---------------|---------------|
| `earthiness` | Clean fruit-forward | Forest floor, mushroom, truffle, leather, tobacco, iron | Barolo, Burgundy, Rioja Reserva, Côte Rôtie |
| `funk` | Clean, conventional | Brett, barnyard, wild-ferment, volatile complexity, oxidative | Jura, natural wines, traditional Rhône, Beaujolais Cru |
| `mineral` | Neutral, soft | Wet stone, chalk, volcanic, flinty, oyster shell, saline | Chablis, Sancerre, Mosel Riesling, Albariño |
| `oak` | No oak, unoaked | Pronounced vanilla, toast, cedar, smoke, coconut | New-World Chardonnay, American Cab, many Rioja |
| `floral` | No floral character | Violet, rose, jasmine, orange blossom, lavender | Viognier, Gewürztraminer, Nebbiolo, Muscat |

All values are integers 0–100. A score near 0 does not mean "bad" — it means the
character is absent. A wine can score 0 on earthiness and 90 on floral.

---

## Data model changes

### Wine catalog (`mockData.js` — `RAW_WINES`)
Add 5 new numeric fields to every wine entry:
```js
{ ..., earthiness: 20, funk: 5, mineral: 35, oak: 72, floral: 8 }
```

### Taste profile object
Add an optional `character` map alongside `palate`:
```js
{
  palate: { body, tannin, sweetness, acidity },   // existing, unchanged
  character: {                                     // NEW — null means no preference
    earthiness: 75 | null,
    funk: 60 | null,
    mineral: null,
    oak: 20 | null,
    floral: null,
  }
}
```

`null` on an axis means the user has never expressed a preference for it. That axis
is excluded from the character match calculation entirely — it does not pull the
score toward 50.

---

## Match engine changes (`matchEngine.js`)

### `computeMatch(wine, tasteProfile)`
After computing the existing structural distance score, blend in a character score
**only when** the user has at least one non-null character axis and the wine has
character values.

```
characterScore = average distance score across expressed axes only
   For each axis where tasteProfile.character[axis] !== null:
     axisScore = 100 - |wine[axis] - tasteProfile.character[axis]|
   characterScore = mean(axisScores)

finalScore = structuralScore * (1 - charWeight) + characterScore * charWeight
  where charWeight = min(0.30, expressedAxes * 0.07)
```

Rationale: a user with one expressed axis gets 7% character influence; five axes
gets the max 30%. This prevents character from overwhelming structural fit when the
user has only mentioned one thing in passing.

**Backward compatible:** if `tasteProfile.character` is null/undefined, the result
is identical to the current engine.

### `computeMatchWithConfidence`
No change to the confidence logic. Character blending happens inside `computeMatch`
before confidence adjustment.

### `explainMatch` / `explainMismatch`
Add character axis commentary where character diverges or aligns notably (delta ≥ 25).
Examples:
- "You love earthy wines — this Barolo delivers it."
- "This is a cleaner, more fruit-forward style than the funky wines you tend to prefer."

### `inferPalateFromRatings` (`palateInferenceEngine.js`)
When a user rates wines, infer character preferences the same way structural palate
is inferred: loved wines pull the character centroid toward their character values,
hated wines push it away. Only axes where the rated wines have meaningful variance
(std dev > 15 across rated set) get a non-null inferred value — otherwise left null.

---

## `describe-palate` API changes (`/api/describe-palate.ts`)

### Tool schema extension

Extend the `extract_palate` tool schema with 5 optional character fields:
```
earthiness: integer 0–100 or null — only set if user mentions earthy/terroir/mushroom/soil/forest floor/leather
funk:        integer 0–100 or null — only set if user mentions funk/barnyard/brett/wild/natural wine character/volatile
mineral:     integer 0–100 or null — only set if user mentions mineral/chalky/flinty/stony/saline/wet stone
oak:         integer 0–100 or null — set if user mentions oaky/vanilla/toasty/buttery OR explicitly anti-oak (inverted)
floral:      integer 0–100 or null — only set if user mentions floral/violet/rose/jasmine/perfumed/aromatic
```

**Key rule:** default to `null`, not 0. Only emit a value when the user's description
clearly implies a preference. "I like red wine" → all character axes null. "I love
earthy, funky Burgundy" → earthiness: 78, funk: 65, others null.

### Vocabulary-to-axis calibration (prompt-level guidance for Claude)

| User says | Axis | Value range |
|-----------|------|-------------|
| "a little earthy", "earthy undertones" | earthiness | 35–50 |
| "earthy", "I love earthy wines" | earthiness | 60–75 |
| "very earthy", "tons of earthiness" | earthiness | 80–92 |
| "funky", "I like funk" | funk | 55–70 |
| "a lot of funk", "love the barnyard" | funk | 75–88 |
| "natural wine", "I drink natural" | funk | 45–60, earthiness | 45–60 |
| "natural wine with funk" | funk | 70–85, earthiness | 55–70 |
| "mineral", "stony", "flinty" | mineral | 55–75 |
| "very mineral", "volcanic" | mineral | 78–92 |
| "oaky", "buttery", "toasty" | oak | 65–80 |
| "not too oaky", "unoaked" | oak | 10–25 |
| "I hate oak" | oak | 0–10 |
| "floral", "violet notes" | floral | 55–72 |
| "very floral", "perfumed" | floral | 78–92 |

### Follow-up questions

Add a `followUpQuestions` field to the tool output — an array of 0–2 objects:
```json
{
  "id": "funk_clarify",
  "question": "When you say funky — are you thinking barnyard/brett character, or more earthy/mushroom notes?",
  "options": [
    { "label": "Barnyard & brett", "delta": { "funk": 80, "earthiness": 40 } },
    { "label": "Earthy & mushroom", "delta": { "funk": 35, "earthiness": 78 } },
    { "label": "Both, the wilder the better", "delta": { "funk": 85, "earthiness": 80 } }
  ]
}
```

Emit a follow-up question when:
- A character term is ambiguous (e.g., "natural" alone — could mean style preference or farming)
- Confidence on a character axis is moderate (30–65 range, neither clearly present nor absent)
- The description implies character preference but doesn't quantify it (e.g., "I appreciate funk" vs. "I love heavy funk")

Maximum 2 follow-up questions per submission. Omit the array if none needed.

### System prompt update

Replace the current minimal system prompt with explicit guidance:

```
You are a sommelier translating a user's casual wine description into a structured
taste profile. Extract BOTH structural axes (body, tannin, sweetness, acidity) AND
character axes (earthiness, funk, mineral, oak, floral).

STRUCTURAL AXES: always output all four. Infer from wine style, variety, and
adjectives. "Dry" → sweetness 5–15. "Smooth" → low tannin. "Crisp" → high acidity.

CHARACTER AXES: only output non-null when clearly implied. These capture aroma and
flavor character, not structure. Use null as the default — absence of mention means
absence of preference, not a mid-range preference.

KEY MAPPINGS:
- "earthy", "terroir-driven", "forest floor", "mushroom" → earthiness
- "funky", "barnyard", "brett", "wild", "natural wine character" → funk
- "natural wines" alone → moderate funk + earthiness (45–60), not maximum
- "mineral", "stony", "flinty", "volcanic", "oyster shell" → mineral
- "oaky", "buttery", "vanilla", "toasty" → high oak; "unoaked", "clean", "no oak" → low oak
- "floral", "violet", "rose", "aromatic", "perfumed" → floral

SCALE: 0=absent, 30=subtle hint, 50=noticeable, 70=prominent, 85+=defining character.
"A lot of funk" → 78–88. "A little earthy" → 30–45.

FOLLOW-UP QUESTIONS: include 0–2 when a signal is ambiguous or mid-confidence.
Never ask about axes the user clearly specified.
```

### Updated API response shape

```json
{
  "palate": { "body": 60, "tannin": 35, "sweetness": 12, "acidity": 74 },
  "character": { "earthiness": 72, "funk": 82, "mineral": null, "oak": null, "floral": null },
  "confidence": 0.85,
  "coachingNote": "Bone-dry, earthy, and funky — you're drawn to natural wine character with real terroir expression.",
  "vocabulary": ["brett", "terroir", "natural wine", "low-intervention"],
  "followUpQuestions": [
    {
      "id": "natural_clarify",
      "question": "By 'natural' — mainly about the funky character, or also the farming approach?",
      "options": [
        { "label": "The character — funky & wild", "delta": { "funk": 85 } },
        { "label": "Both character and farming", "delta": { "funk": 78, "earthiness": 65 } },
        { "label": "Mostly the farming/organic side", "delta": { "funk": 45, "earthiness": 55 } }
      ]
    }
  ]
}
```

Callers that only read `palate` are unaffected.

---

## `DescribeStep` UI changes (`WineRatingStep.jsx`)

### Character confirmation card
After the API responds, "Here's what we heard" surfaces detected character axes as
explicit chips the user can verify or dismiss. For each character axis with a non-null
value, show a labeled chip with an intensity indicator:

```
We picked up:
  [Dry preference]  [Earthy — strong]  [Funky — high]  [Natural character]
                                                        × dismiss any chip
```

Chips use color from the character axis family (earthy = ochre, funk = scarlet, mineral = cobalt, oak = brown, floral = violet). Tapping a chip opens a 3-option intensity selector (subtle / noticeable / defining). User can dismiss a chip if we misread them.

### Follow-up questions inline
If `followUpQuestions` is non-empty, render them below the coaching note, before the
"✓ That's me" button. Each question shows as a single-select chip row. User can skip
questions (they're optional). On confirm, answered questions apply their `delta`
values to the character axes.

### Confirmed state
The locked-in "Description · locked in" card adds a character tags row:
```
"Bone-dry, earthy, and funky…"
[brett]  [terroir]  [natural wine]       ← vocabulary chips (existing)
[Earthy — strong]  [Funky — high]        ← character chips (new)
```

### `aiPalate` shape extension
`aiPalate` currently stores `{ body, tannin, sweetness, acidity }`. Extend to also
carry `character: { earthiness, funk, mineral, oak, floral }` so the `TasteBuilderScreen`
can pass it through to `onComplete` → profile persistence.

---

## Catalog tagging plan

All 50 entries in `RAW_WINES` get scored on the 5 axes. Scores are derived from
grape variety, regional style, and existing tasting notes. Representative examples:

| Wine | earthiness | funk | mineral | oak | floral |
|------|-----------|------|---------|-----|--------|
| Penfolds Grange | 30 | 8 | 20 | 55 | 5 |
| Banfi Brunello | 65 | 12 | 38 | 30 | 20 |
| Antinori Tignanello | 62 | 10 | 30 | 40 | 8 |
| Ruffino Chianti Classico | 55 | 8 | 22 | 20 | 10 |
| Muga Rioja Reserva | 48 | 10 | 18 | 52 | 12 |
| Ridge Geyserville | 42 | 15 | 22 | 32 | 5 |
| Belle Glos Pinot Noir | 45 | 8 | 25 | 28 | 15 |
| La Crema Pinot Noir | 30 | 5 | 20 | 22 | 12 |
| Rombauer Chardonnay | 5 | 2 | 10 | 82 | 8 |
| Cakebread Chardonnay | 10 | 3 | 28 | 58 | 10 |
| Bouchard Mâcon-Villages | 18 | 5 | 52 | 8 | 12 |
| Cloudy Bay SB | 5 | 5 | 35 | 5 | 20 |
| Kim Crawford SB | 5 | 3 | 28 | 3 | 15 |
| Trimbach Riesling | 8 | 5 | 62 | 2 | 18 |
| Whispering Angel Rosé | 12 | 5 | 30 | 8 | 22 |
| Meiomi Moscato | 2 | 2 | 5 | 5 | 55 |
| Bartenura Moscato d'Asti | 2 | 2 | 5 | 3 | 68 |
| Santa Margherita PG | 8 | 3 | 35 | 5 | 25 |
| Louis Jadot Beaujolais | 22 | 18 | 20 | 5 | 30 |
| Silver Oak Cab | 18 | 3 | 15 | 70 | 5 |
| Caymus Cab | 12 | 3 | 10 | 65 | 5 |

(Full scoring for all 50 wines provided during implementation.)

---

## Build sequence

1. **Catalog tagging** — add 5 fields to all `RAW_WINES` entries in `mockData.js`
2. **Match engine** — update `computeMatch`, `explainMatch`, `explainMismatch` in `matchEngine.js`
3. **Palate inference** — update `inferPalateFromRatings` in `palateInferenceEngine.js`
4. **describe-palate API** — extend tool schema, system prompt, and follow-up question output in `describe-palate.ts`
5. **DescribeStep UI** — character confirmation chips, follow-up question rendering, extend `aiPalate` shape
6. **Profile persistence** — verify `character` object round-trips through Supabase profile save/load (`useTasteProfileSync`)

---

## Acceptance criteria

- [ ] All 50 catalog wines have all 5 character fields set
- [ ] "I like dry, earthy, natural reds with a lot of funk" produces: sweetness ≤ 15, earthiness ≥ 65, funk ≥ 72, and triggers ≥ 1 follow-up question about "natural"
- [ ] User who enters "I love earthy, funky natural wines" gets `earthiness` and `funk` set in their profile; earthy/funky wines rank higher in results
- [ ] Character chips appear in "Here's what we heard" card showing detected axes with intensity labels
- [ ] Follow-up question chips appear below coaching note when API returns `followUpQuestions`
- [ ] Answering a follow-up question updates the character delta before confirmation
- [ ] Dismissing a character chip removes that axis from the profile
- [ ] User with no character preferences gets identical match scores to today (backward compat)
- [ ] User who says "I hate oaky wines" gets `oak: low` in profile; high-oak wines rank lower
- [ ] `explainMatch` surfaces a character-axis note when character is the main driver of fit
- [ ] `character` is null-safe throughout — no crashes on old profiles without the field
- [ ] Supabase profile load/save round-trips `character` correctly

---

## Edge cases

- **Wine missing character values**: treat as neutral (50) for match purposes rather than skipping — prevents newly-added wines from being invisible to character-aware users
- **All character axes null**: `charWeight = 0`, pure structural score, no change to existing behavior
- **Partial character profile**: only expressed axes contribute; a user who mentioned earthiness but not funk is not penalized for preferring funky wines
- **Character vs. structure conflict**: a user who loves full-bodied AND earthy wines will get wines that are both; the scores add — there's no conflict to resolve
