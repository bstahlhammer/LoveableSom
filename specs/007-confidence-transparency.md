# Spec 007 — Match Confidence Transparency

**Goal:** Replace cryptic confidence labels ("est. (limited data)") with plain-language explanations that tell the user exactly why a score is uncertain, whether they can fix it, and when the app genuinely cannot make a strong recommendation.

---

## The core problem

The app already knows *why* a match score is uncertain — three independent flags:
1. **Profile incomplete** — `inferenceConfidence < 0.95` — *fixable by the user*
2. **Mixed critic scores** — wine rated below 90 — *about the wine, not fixable*
3. **Budget tier** — wine under $20 — *about the wine, not fixable*

Right now these are collapsed into opaque labels like "limited data" or "est. · budget wine, mixed ratings" — too small, too jargon-y, and they don't tell the user what to do.

---

## Changes

### 1. `matchEngine.js` — expose flags and raw values on return

Add `flags`, `profileConf`, `criticRating`, and `priceNum` to the `computeMatchWithConfidence` return so callers can render specific, accurate messages without re-computing anything.

```js
return {
  score, rawScore, isLow, reason, confidence: conf,
  flags,           // ['profile', 'quality', 'price'] — any subset
  profileConf,     // 0–1, e.g. 0.34
  criticRating,    // e.g. 86 or null
  priceNum,        // e.g. 14.99 or null
}
```

---

### 2. `WineDetailScreen` — confidence callout section

**Remove:** the tiny `· est. (matchReason)` line next to the match badge.

**Add:** a collapsible "About this score" card in the scrollable body, directly above the style profile section, shown only when `matchIsLow`. Each active flag gets its own row.

| Flag | Icon | Headline | Body | CTA |
|---|---|---|---|---|
| profile | ◎ | "Your profile is still building" | "We don't have enough wine ratings from you yet to be confident in this score. The more you rate, the sharper this gets." | "Rate wines you've tried →" (navigates to taste builder) |
| quality | ⚠ | "Mixed critic scores" | "This wine scores [X]/100 with critics — below the threshold where we feel confident matching it to your palate." | — |
| price | ⚠ | "Budget-tier wine" | "At $[X], there's less flavor data available for wines in this range, so the match is approximate." | — |

Style: ochre background (`T.ochre100`), border `T.ochre500`, consistent with the "Honest take" card pattern already in the screen.

**Match badge:** change `✦ ~{score}% fit` → `✦ ~{score}% fit · low confidence` in ochre instead of the current green/amber. The `~` prefix stays to signal estimation.

---

### 3. `PersonalizedResultsScreen` — WineRowCard confidence badge

**Remove:** `est. · {reason}` text below the match bar.

**Add:** a small ochre pill badge below the FitBar replacing the current text:

| Flags active | Pill text |
|---|---|
| profile only | "Profile incomplete" |
| quality only | "Mixed critics" |
| price only | "Budget tier" |
| profile + quality | "Low confidence" |
| profile + price | "Low confidence" |
| quality + price | "Low confidence" |
| all three | "Low confidence" |

The pill is `T.ochre500` text on `T.ochre100` background, 10px, uppercase. Replace the FitBar's `~` prefix with the pill instead — cleaner separation between "this is the score" and "this is why to take it with a grain of salt."

**"No strong matches" banner:** Replace current copy with:
- Headline: "Unfortunately, none of these wines will delight you."
- CTA button: "Of these, we think this is the best." → taps directly into WineDetailScreen for `sortedWines[0]` (the top-ranked wine on the list).

---

### 4. `MyWinesScreen` — TryCard confidence badge

Same pill treatment as PersonalizedResultsScreen. Replace `~ estimated · {reason}` with the ochre pill.

---

## What does NOT change

- The `computeMatchWithConfidence` scoring formula itself — only the return shape
- Match scores, thresholds, or how wines are sorted
- The "Honest take" / mismatch section — already working well
- Wines with full confidence — zero visual change for them

---

## Acceptance criteria

- [ ] `computeMatchWithConfidence` returns `flags`, `profileConf`, `criticRating`, `priceNum`
- [ ] WineDetailScreen: "About this score" card appears for any low-confidence wine, hidden for confident wines
- [ ] Each active flag renders its own row with correct dynamic values (actual rating number, actual price)
- [ ] Profile flag includes actionable copy; quality/price flags do not offer false hope of fixing it
- [ ] PersonalizedResultsScreen: ochre confidence pill replaces `est. · reason` text
- [ ] MyWinesScreen: same pill treatment
- [ ] A wine with no confidence issues shows no pill, no callout, no `~` prefix
- [ ] "Low confidence" is never shown silently — if the score is uncertain, the user knows why
