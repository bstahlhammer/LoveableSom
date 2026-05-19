# Uncork — Product Specification
_Generated from full codebase read, 2026-05-17_

---

## 1. What the App Does

**Uncork** is a web-based wine recommendation engine that combines image recognition, taste-profile inference, and algorithmic matching to help users discover wines suited to their palate.

Core capabilities:
- **Scan & Extract**: Photograph a wine list or shelf; extract wine names/details via Claude vision; look up metadata (grape, region, price, palate axes).
- **Taste Profiling**: Build a taste profile through one or more paths:
  - Guided sommelier-style multi-step questionnaire
  - Rate wines you've had (app infers palate from your ratings)
  - Free-text description of your preferences (Claude translates to palate axes)
  - Pick a pre-built archetype ("The Bold & Brooding", "The Light & Crisp", etc.)
- **Personalized Matching**: Score each scanned wine 0–100 based on how well it matches your inferred taste profile.
- **Smart Sorting**: Sort results by taste match, critic rating, crowd-pleaser score, value, or approachability.
- **Filtering**: Narrow by price, color, grape variety, maker, region, and certifications.
- **Shortlist & History**: Authenticated users can save wines, rate them, track scan history, and view detailed wine breakdowns.
- **Shelf Spotlighting**: On the wine detail screen, if a scan is active, overlay a bounding box on the original shelf photo to locate that bottle.

The app is guest-accessible for scanning and browsing; authentication is required only for personal features (history, shortlist, profile persistence).

---

## 2. User Flows (Step-by-Step)

### A. Onboarding / TasteBuilder
1. User lands on HomeScreen (guest or signed in).
2. User taps "Build your taste profile" → navigate to TasteBuilderScreen.
3. TasteBuilderScreen offers three input paths:
   - **Rate wines** (WineRatingStep): Search and rate 3+ wines from the app's catalog.
   - **AI Description**: Type a free-text description of wines they love → Claude extracts palate axes and confidence.
   - **Pick an archetype** (ArchetypePicker): Select a pre-built taste profile.
4. User taps "Done" → app derives a TasteProfile (weighted blend of all signals).
5. Navigate to ProfileRevealScreen to show the derived archetype and palate.
6. Optionally navigate to PersonalizedResultsScreen if scanned wines are available.

### B. GuidedQuiz
1. User taps "Take a guided taste quiz" → navigate to GuidedQuizScreen.
2. QuizEngine walks through a branching tree of ~6–8 questions (light/bold/fruity/rich → flavor → advanced).
3. Each option carries signed palate deltas (e.g., "crisp" = +acidity +body, "smooth" = -tannin).
4. Advanced questions gated by confidence threshold (4+ confident answers on earlier levels).
5. On final question (no next node), quiz ends → update tasteProfile → navigate to ProfileRevealScreen.

### C. Scanning
1. User taps "Scan a wine list" → ScanPromptScreen (optional: select "buying for" intent).
2. User grants camera/file permission and uploads an image.
3. Navigate to ScanningScreen (progress messages: "Easing out the cork…", "Pouring the shortlist…", etc.).
4. `useScan.scanImage()` flow:
   - Convert file to base64, downscale if needed.
   - POST /api/scan with image → Claude Sonnet vision streams back JSON array of wines.
   - If wines are low-confidence or missing grape/region → POST /api/enrich → Claude Haiku fills gaps.
   - Find local image matches via `findWineImage()` (curated 50-wine set).
   - Query Supabase `wine_catalog` for larger catalog matches + image URLs.
5. If authenticated, save scan + photo to Supabase (`scans` and `scan_wines` tables).
6. Navigate to AnonResultsScreen (no profile) or PersonalizedResultsScreen (has profile).

### D. Browse / Explore (AnonResults)
1. AnonResultsScreen shows scanned wines, default sort = crowd-pleaser.
2. Tap "Filter" → FilterSheet (price range, color, grape, maker, region, certifications).
3. Tap sort toggle → Crowd Pleaser / Critic Score / Best Value / Price Low–High / Approachability.
4. Tap a wine row → WineDetailScreen.

### E. Browse / Personalized (PersonalizedResults)
1. PersonalizedResultsScreen shows scanned wines sorted by personalized match score.
2. Same filtering/sorting options, plus match score (0–100) with color bar.
3. Tags: "Top pick" (≥90), "Stretch" (40–64), "Off-taste" (<50), or none.
4. Bottom nav to History, My Wines, Profile (auth only).

### F. Wine Detail
1. Displays: wine header, palate axes (4 sliders with wine + user profile position), critic rating, price, tasting note, food pairings, retailers, approachability dots.
2. If profile exists: match explanation (headline + bullets) and mismatch warning (severity + reasons).
3. If active scan: ShelfSpotlight — displays original scan photo with bounding box overlay for the bottle (via /api/locate-bottle).
4. User can save to shortlist (heart icon) and submit a star rating + taste-match label.

### G. Shortlist / My Wines
1. MyWinesScreen shows wines user has saved (locally via useShortlist).
2. Tap wine → WineDetailScreen.

### H. History
1. HistoryScreen shows all past scans (most recent first): thumbnail, date, location, wine count.
2. User can delete a scan or edit its location (PlacePicker or free-text).
3. Tap scan → load its wines → resume PersonalizedResultsScreen (or AnonResultsScreen).

### I. Profile
1. ProfileScreen (auth only): shows archetype name, description, palate axes as radar, and stats (top regions, grapes, gaps, recent shifts).
2. User can edit their profile (re-run TasteBuilder).

### J. Auth
1. AuthScreen: Google OAuth or email/password.
2. On success, return to pending screen (or home).

---

## 3. Data Model

### Wine (core entity)
Source: `mockData.js` (50 curated) + Supabase `wine_catalog` (100k+)

| Field | Type | Notes |
|-------|------|-------|
| `id` | number \| string | mockData: integer 1–50; catalog: `"cat_${dbId}"` |
| `name` | string | e.g., "Caymus Cabernet Sauvignon" |
| `vintage` | string \| null | e.g., "2022" |
| `region` | string | |
| `grape` | string | |
| `maker` | string | inferred winery name |
| `price` | string \| null | pre-formatted "$N" |
| `priceNum` | number \| null | numeric price for filtering |
| `rating` | number | 85–100 critic score |
| `ratingLabel` | string | "Popular pick" → "Extraordinary" |
| `body` | number (0–100) | palate axis |
| `tannin` | number (0–100) | palate axis |
| `sweetness` | number (0–100) | palate axis |
| `acidity` | number (0–100) | palate axis |
| `color` | string | "red" \| "white" \| "rosé" \| "sparkling" \| "dessert" |
| `tasting` | string | one-sentence tasting note |
| `pairings` | array | 3–4 food pairing strings |
| `retailers` | array | subset of ["costco", "trader_joes", "whole_foods", "grocery", "restaurant", "wine_shop"] |
| `isValue` | boolean | rating ≥90 + price ≤$30 |
| `isCrowd` | boolean | rating ≥88 |
| `certifications` | array | ["organic", "biodynamic", "natural", "low_sulfite"] |
| `imageUrl` | string \| null | local or Supabase R2 URL |
| `_catalogId` | number \| optional | for lazy image fetch |

Derived on-the-fly:
- `computedMatch` (0–100): match score to user's taste profile
- `adjustedMatch` (0–100): confidence-penalized match
- `computedApproachability` (1–5): ease-of-drinking score

### TasteProfile
Source: Derived from ratings + quiz + AI description; saved to Supabase `user_profiles`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | archetype id or UUID for custom |
| `name` | string | e.g., "The Bold & Brooding" |
| `description` | string | flavor/style description |
| `palate` | object | { body, tannin, sweetness, acidity } each 0–100 |
| `ratingsByBucket` | object | { "loved": [wineId1, ...], ... } |
| `inferenceConfidence` | number (0–1) | how confident the profile is |
| `flavorCharacter` | string \| optional | "fruity" \| "savory" \| "balanced" |
| `hasAiSignal` | boolean | whether AI description contributed |

### ScanRecord (Supabase `scans` table)

| Field | Type |
|-------|------|
| `id` | UUID |
| `user_id` | UUID |
| `created_at` | timestamp |
| `photo_path` | string (optional) |
| `wine_count` | number |
| `buying_for` | "me" \| "group" \| "gift" (optional) |
| `location_label` | string (optional) |
| `place_id` | string (optional) |
| `place_address` | string (optional) |
| `place_lat` | number (optional) |
| `place_lng` | number (optional) |

### ScanWine (Supabase `scan_wines` table)

| Field | Type |
|-------|------|
| `id` | UUID |
| `scan_id` | UUID |
| `user_id` | UUID |
| `position` | number (0-indexed) |
| `wine` | JSON (full Wine object, denormalized) |

### RatingBucket (`mockData.js RATING_BUCKETS`)

| id | weight | matchDelta |
|----|--------|-----------|
| loved | high | +35 |
| liked | medium | +15 |
| ok | zero | 0 |
| disliked | negative | -15 |
| hated | strong negative | -35 |

### GuidedQuizNode (`guidedQuizTree.js`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | unique node id |
| `level` | number | 1–5 |
| `question` | string | |
| `type` | "single" \| "multi" | |
| `options` | array | each has { id, label, hint?, palate?, flavor?, notSure?, next? } |
| `next` | string \| function \| null | for multi-select nodes |

### WineCatalogRow (Supabase `wine_catalog`)

| Field | Type |
|-------|------|
| `id` | number |
| `name`, `winery`, `variety`, `region`, `country` | string |
| `vintage` | number |
| `description` | string |
| `points` | number |
| `price` | number |
| `body`, `tannin`, `sweetness`, `acidity` | number (0–100) |
| `color` | string |
| `image_url` | string \| null |
| `image_fetched_at` | timestamp \| null |

---

## 4. Scoring & Matching Logic

### A. Raw Match Score (`matchEngine.js`)

```
dist = |wine.body - profile.body| × 2
      + |wine.tannin - profile.tannin| × 2
      + |wine.sweetness - profile.sweetness| × 1
      + |wine.acidity - profile.acidity| × 1

rawScore = 100 - (dist / 600) × 100   // clamped 0–100
```

Then apply **bucket delta** if wine is in user's rated buckets:
- loved: +35, liked: +15, ok: 0, disliked: -15, hated: -35

Final raw: `Math.max(0, Math.min(100, rawScore + bucketDelta))`

### B. Confidence-Adjusted Match

Three penalty factors blend the score toward neutral (50):

| Condition | Confidence multiplier |
|-----------|----------------------|
| Profile confidence < 0.4 | × 0.65 |
| Profile confidence 0.4–0.95 | × 0.82 |
| Critic rating < 87 | × 0.84 |
| Critic rating 87–89 | × 0.91 |
| Price < $12 | × 0.84 |
| Price $12–19 | × 0.91 |

```
adjustedScore = rawScore × conf + 50 × (1 - conf)
```

Returns: `{ score, rawScore, isLow, reason, confidence }`

### C. Approachability Score (`approachabilityEngine.js`)

```
raw = 100 - (tannin - sweetness × 0.5) × 0.6
clamped = Math.max(0, Math.min(100, raw))
score = Math.max(1, Math.min(5, Math.ceil(clamped / 20)))
```

Returns 1–5 (1 = challenging, 5 = approachable).

### D. Match Explanation & Mismatch

**explainMatch**: Compares wine palate to user profile per axis.
- Aligned (delta ≤ 12): positive bullet
- Off-taste (delta ≥ 28): caveat bullet
- Headlines vary: "Close fit", "Close with one tweak", "Different — try if exploring"

**explainMismatch**:
- severity `high`: delta ≥ 40 — "Probably not your wine"
- severity `medium`: delta 28–39 — "A stretch — go in eyes open"
- severity `low`: delta 18–27 — "Mostly aligned, with one minor caveat"
- severity `none`: clean match

### E. Hero Picks (`heroPicksEngine.js`)

From any wine list, select up to 3 non-overlapping heroes:

**topPick**:
- With profile: `match × 0.7 + (rating/100) × 20 + (confidence/100) × 10`
- Without profile: `(rating || 60) × 0.6 + (confidence/100) × 40`

**bestValue** (if ≥2 wines):
- `(rating / price) × 50 + valueBoost`
- valueBoost = 25 if isValue, else 0

**crowdPleaser** (if ≥3 wines):
- `rating × 0.5 + crowdBoost + approachabilityScore × 0.4`
- crowdBoost = 30 if isCrowd, else 0

### F. Match Tag Thresholds (UI)

| Score | Tag | Color |
|-------|-----|-------|
| ≥90 | "Top pick" | forest500 |
| 65–89 | (none) | — |
| 40–64 | "Stretch" | ochre500 |
| <50 | "Off-taste" | scarlet500 |

FitBar color:
- ≥80: lime
- ≥60: forest
- ≥40: ochre
- <40: scarlet

---

## 5. API Endpoints

### POST /api/scan

**Input:** `{ image: string (base64), mimeType?: string }`

**Process:** Claude Sonnet vision → stream wine array.

**Output:** Array of Wine objects (name, vintage, grape, region, price, confidence, rating, palate axes, tasting, pairings, retailers, isValue, isCrowd).

**Error:** Returns `{ __stream_error__: true }` or empty array on failure; client recovers by extracting partial JSON.

### POST /api/enrich

**Input:** `{ wines: Array<{ id, name, vintage }> }`

**Process:** Claude Haiku looks up correct grape/region from knowledge base.

**Output:** `{ enrichments: Array<{ id, grape, region }> }` — null for uncertain fields.

### POST /api/describe-palate

**Input:** `{ description: string }`

**Process:** Claude Haiku with `tool_choice` → extract_palate.

**Output:** `{ palate: { body, tannin, sweetness, acidity }, confidence, coachingNote, vocabulary }`

### POST /api/locate-bottle

**Input:** `{ photoUrl, wineName, vintage, region, grape }`

**Process:** Claude Sonnet vision reads label text on shelf photo, finds matching bottle by name.

**Output (found):** `{ found: true, bbox: { x, y, w, h } }` (normalized 0–1 coordinates)

**Output (not found):** `{ found: false, bbox: null }`

### GET /api/wine-image?name=...&catalog_id=...

**Process:**
1. If catalog_id + image_url exists → return cached URL.
2. If image_fetched_at set but image_url null → return null (cached miss, no retry).
3. Otherwise → SerpAPI Google Images search → cache result in `wine_catalog`.

**Output:** `{ imageUrl: string | null }`

---

## 6. What the App Does NOT Do

- **No in-app purchasing**: No links to retailer checkout; only informs where wines are typically sold.
- **No real-time inventory lookup**: Does not check actual stock or location-specific availability.
- **No place search**: `searchPlaces()`, `getPlaceDetails()`, `findNearbyPlaces()` all return `{ error: 'not_configured' }` — integration not wired.
- **No social features**: No comments, reviews, sharing, following, or community profiles.
- **No barcode scanning**: Vision-based (label text), not UPC lookup.
- **No wine club / subscription management**.
- **No import/export to Vivino, Cellar Tracker, or other wine apps**.
- **No offline mode**: Requires internet for vision API and Supabase sync.
- **No food-to-wine reverse search**: Pairings are static per wine, not queryable as "what wine goes with salmon?"
- **No multi-language support**: English only; no i18n.
- **No advanced profile analytics**: ProfileScreen stats (top regions, grapes, gaps, shifts) are currently hardcoded sample arrays — not computed from real user data.

---

## 7. Edge Cases

### Vision & Scan Failures
- Blurry/dark/glare image → Claude returns low confidence or empty array → REASON_COPY prompts (retry, move closer, better light).
- Not a wine image → empty array or `not_a_wine_image` retake reason.
- Low confidence wine (< 75) → enrich via /api/enrich; on enrichment failure, keep scan result as-is.
- Streaming timeout: 120s limit; on exceed, throw error and show fallback.

### No Profile
- AnonResultsScreen used instead of PersonalizedResultsScreen.
- Sort defaults to "crowd" (isCrowd + rating desc).
- Match score unavailable; bar hidden.
- Wine detail shows approachability only; no match explanation.

### Low-Confidence Profile
- `inferenceConfidence < 0.4`: Match scores show with opacity reduction and "~" prefix.
- Score adjusted heavily toward 50 (neutral).

### Empty Scan
- Zero wines detected → throw "I could not identify a specific wine…" error → ScanningScreen shows error; user can retake.

### Missing Wine Fields
- Missing price/rating/tasting/pairings → those sections hidden.
- Missing palate axes → match score defaults to 50; approachability defaults to 3.
- Missing image → placeholder bottle graphic.

### Auth State
- Sign in while viewing guest content → tasteProfile hydrates from DB; no navigation change.
- Sign out while on auth-only screen → navigate('home').
- pendingAfterAuth → after sign-in, resume pending screen.

### Concurrent Operations
- Rate wine while scan is streaming → saves independently, no race condition.
- Tap back while scan is streaming → AbortController.abort() cancels fetch; state not updated.

### Supabase Failures
- Catalog query fails → `searchWineCatalog` returns empty array; fallback to mockData wines only.
- Scan save fails → activeScan remains null; user can still browse in-memory wines (no history record).
- Profile load fails → tasteProfile stays null; guest experience.

### Palate Inference Edge Cases
- No ratings → neutral baseline { body:50, sweetness:30, tannin:40, acidity:55 }, confidence = 0.
- One rating → heavily weighted but soft prior (priorWeight = 1.5) keeps score from extreme swings.
- All "ok" ratings → zero contribution; palate doesn't move from baseline; confidence = 0.
- Conflicting signals → averages out; confidence grows with count.

### Filter & Sort Stability
- Filter reduces to 0 results → "No wines match your filters" with reset button.
- Sort by match without profile → falls back to sort by rating.
- Filter by certification on wines with no certifications data → only wines with explicit certifications shown.

### Guided Quiz
- `shouldShowAdvanced()` gate: requires entry-level confidence + 4+ confident total answers (not "not sure" on level 1). If not met, quiz ends early.
- `notSure` option on single-choice → empty palate delta; advances anyway.
- Multi-select with no options picked → "Continue" button disabled.

### History & Scan Review
- Delete scan → deletes Supabase row + photo + scan_wines; local state updates.
- Edit scan location → PlacePicker (or free-text) → updates Supabase.

### Shortlist Persistence
- Add wine to shortlist without auth → localStorage only.
- Sign in → localStorage shortlist does NOT auto-sync to Supabase.
- Sign out → localStorage shortlist remains.

### Image URL Caching
- First access → fetch via /api/wine-image; SerpAPI queried; result cached in wine_catalog.
- Subsequent accesses → cache hit (no re-query).
- No image found → `image_url = null`, `image_fetched_at = now` → never re-queried.

---

## 8. Acceptance Criteria

### Scanning
- **Given** a user uploads a photo of a wine list, **when** processed, **then** every clearly visible wine is extracted with name, vintage, grape, region, and price (confidence ≥75 per item).
- **Given** a scanned wine is missing grape or region, **when** enrich is called, **then** Claude Haiku returns the correct grape/region or null (never a guess).
- **Given** a scan completes with ≥3 wines and user is authenticated, **then** the scan is saved to Supabase with photo, wine list, buying_for, and location metadata.

### Taste Profiling
- **Given** a user rates wines loved/liked/hated, **when** profile is computed, **then** the inferred palate reflects the weighted average of those wines' axes, soft-prior-blended toward neutral.
- **Given** a user completes the guided quiz to its final node, **then** the quiz ends and a palate + archetype is compiled.
- **Given** a user submits a text description, **when** /api/describe-palate returns, **then** the profile contains 4 palate axes (0–100 each), confidence (0–1), and 2–4 vocabulary terms.

### Match Scoring
- **Given** a user profile { body:70, tannin:60, acidity:50, sweetness:20 } and a wine { body:72, tannin:55, acidity:48, sweetness:22 }, **then** raw match score is ~95–97.
- **Given** a wine with critic rating 87 and price <$12, **then** confidence-adjusted score is noticeably lower than raw (e.g., 70 raw → ~60 adjusted).
- **Given** a wine is in the user's "loved" bucket, **then** +35 is added to raw match score (capped at 100).

### Filtering
- **Given** filters { priceMin:20, priceMax:50, colors:["red"] }, **then** only red wines priced $20–50 are returned.
- **Given** filter on "organic" certification, **then** wines without an explicit certifications array containing "organic" are excluded.

### Sorting
- **Given** sort mode "match" with a taste profile, **then** wines appear descending by `computeMatch()` score.
- **Given** sort mode "crowd" without a profile, **then** `isCrowd` wines rank first by rating, then non-crowd wines by rating.

### Wine Detail
- **Given** active scan + authenticated user views WineDetailScreen, **when** ShelfSpotlight loads, **then** the original scan photo displays with a bounding box over the bottle (or "not found" state if unlocatable).
- **Given** user submits 5-star + "loved" rating, **then** rating saves to Supabase and wine is added to the user's "loved" bucket for future profile updates.

### Personalized Results
- **Given** user with profile views PersonalizedResultsScreen, **then** each wine shows match score 0–100 with color (green ≥80, forest 60–79, ochre 40–59, red <40) and tags as applicable.
- **Given** profile has inferenceConfidence < 0.4, **then** match scores display with reduced opacity and "~" prefix.

### History & Auth
- **Given** authenticated user completes a scan, **then** HistoryScreen shows the scan with photo thumbnail, date, location, and wine count.
- **Given** user deletes a scan from history, **then** the Supabase scan row, photo file, and all scan_wines entries are removed.

---

## 9. Accidental vs. Intentional Decisions

### Intentional

- **Two wine databases (mockData + catalog)**: Deliberate split — 50 curated wines guarantee high-quality match inputs; Supabase catalog for exploration at scale.
- **Soft prior in palate inference** (`priorWeight = 1.5`): Prevents single ratings from swinging profile to extremes. Stated intent in code.
- **Confidence-adjusted matching**: Three penalty factors (profile completeness, critic rating, price tier) deliberately reduce trust in edge-case recommendations.
- **Bucket-based rating system** (loved/liked/ok/disliked/hated with ±35 deltas): Nuanced signal per bucket, clearly designed.
- **Hero picks (3 roles)**: topPick / bestValue / crowdPleaser use distinct scoring formulas to surface variety.
- **Guided quiz branching via functions**: `next` as a function allows `shouldShowAdvanced()` gating — intentional flexibility.
- **Streaming scan response**: /api/scan streams to avoid Cloudflare Worker 30s timeout. Noted in code.
- **Lazy image fetch**: /api/wine-image uses SerpAPI + caches to avoid blocking scans.

### Likely Accidental / Incomplete

1. **Hardcoded sample data in ProfileScreen**: `SAMPLE_REGIONS`, `SAMPLE_GRAPES`, `SAMPLE_GAPS`, `SAMPLE_SHIFTS`, `SAMPLE_EVENTS` are static arrays — ProfileScreen shows them instead of computing from real user data. Feature infrastructure without live data.

2. **Place search stubs not connected**: `searchPlaces()`, `getPlaceDetails()`, `findNearbyPlaces()` return `{ error: 'not_configured' }`. PlacePicker component exists but the underlying service is never wired up.

3. **Duplicate file trees**: Both `/src/screens/` and `/src/ui/screens/` exist. `/src/screens/` contains older versions of PersonalizedResultsScreen, ScanningScreen, etc. `/src/ui/screens/` is the active code. The older tree appears to be a dead refactor remnant.

4. **`WINE_IMAGES` is empty**: `/src/core/data/wineImages.js` exports `WINE_IMAGES = {}`. The infrastructure for curated per-wine image URLs is there but no images are loaded.

5. **`buyingFor` / `scanIntent` collected but never used**: ScanningScreen collects these values and saves them to the `scans` Supabase table, but they have no downstream effect on filtering, sorting, or recommendations.

6. **`retakeReasons` in UI, never populated by API**: `REASON_COPY` in AnonResultsScreen maps reasons like `"too_blurry"` to user copy, but `/api/scan` never returns `retakeReasons` in its response. UI infrastructure without API support.

7. **Shortlist not synced to Supabase**: `useShortlist` saves to localStorage only. No auto-migration on sign-in. Wines added as a guest are orphaned on sign-in.

8. **`extraSearchWines` in mockData**: Famous wines (Château Margaux, Screaming Eagle, Penfolds Grange) listed without price/rating/pairings. Used only for palate rating search; not in results or hero picks. Placeholder set, not functional.

9. **`ScanReviewScreen` purpose unclear**: File exists, referenced in router, but its role overlaps confusingly with PersonalizedResultsScreen when resuming a past scan. Logic appears tangled.

10. **FitBar thresholds duplicated in 3+ files**: The 80/60/40 cutoffs are hardcoded inline in PersonalizedResultsScreen, AnonResultsScreen, and WineDetailScreen. Should be constants.

11. **Confidence formula `Math.min(1, confidentCount / 5)` in quiz engine**: The divisor `5` is arbitrary — no comment or documentation explaining the target number of questions. Likely a rough estimate.

12. **Theme object in two places**: Some components import `T` from `ui/theme/T.js` (token object); others import `theme` from `theme/theme.js` (older-style CSS vars?). Mid-migration state.

13. **`authMode` 'email' branch minimal**: `AuthScreen` has an `authMode` prop supporting 'full' | 'email', but the email-only path appears partially implemented. Google OAuth is the primary fully-functional path.

14. **`wineSearchDb` index in mockData**: Exported and used only in `palateInferenceEngine.js` to build a `wineById` lookup. Could be a utility function in the engine rather than mockData export.

15. **Wine ratings schema ambiguity**: `WineRatingRow` collects both `stars` (1–5) and `tasteMatch` (loved/liked/ok/disliked/hated). It's unclear whether stars feed into palate inference or are stored separately. The two scales are not clearly reconciled in the data model.

---

## 10. Architecture Summary

### Stack
- **React** + **TanStack Router** (file-based routing, Remix-style)
- **Supabase** (auth, PostgreSQL, storage)
- **Anthropic API** (server-side only — Claude Sonnet for vision, Haiku for enrichment/palate)
- **Cloudflare Workers** (deployment platform)
- **Inline styles** via `T.js` token object (no Tailwind, no CSS-in-JS library)

### Data Flow
```
Scan Image
  → /api/scan (Claude Sonnet vision)
  → Raw wine array
  → /api/enrich (Claude Haiku) [if low confidence]
  → findWineImage() [local curated set]
  → Supabase wine_catalog [lazy catalog match]
  → Result set

Taste Profile
  ← Wine ratings (buckets: loved/liked/ok/disliked/hated)
  ← Guided quiz answers (palate deltas per node)
  ← AI text description (/api/describe-palate)
  ← Archetype seed
  → Weighted blend → palate { body, tannin, sweetness, acidity }
  → inferenceConfidence

Match Score
  ← Wine palate axes
  ← User taste profile palate
  → Weighted Euclidean distance → rawScore
  → Bucket deltas → adjusted raw
  → Confidence penalties → final score 0–100
```

### State Management
- React hooks only (no Redux/Zustand)
- Supabase auth state via `useAuth` hook
- LocalStorage: scroll position, shortlist
- In-memory: `scannedWines`, `quizAnswers`, `tasteProfile` in `UncorkApp.jsx`

### Database Schema
```
auth.users             Supabase-managed
scans                  scan metadata + location + buying_for
scan_wines             denormalized wine JSON per scan row
wine_catalog           100k+ wines, searchable, lazy image cache
user_profiles          TasteProfile (partially used)
wine_ratings           star ratings + taste-match labels (implied, schema unclear)
```

### Completeness Estimate
~85% — Core scanning, matching, and profile-building work end-to-end. Half-finished: place search, shortlist Supabase sync, live profile stats, retake reasons, buying_for/scanIntent downstream logic.

---

_This spec was generated from a full read of all source files under `/src`. Last updated 2026-05-17._
