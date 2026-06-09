# Spec 016 — Web Wine Lookup & Enrichment

## Problem

When a wine is scanned but not found in the Kaggle catalog, the app falls back to asking Claude what it knows from training data. This fails for:
- Wines released after Claude's knowledge cutoff
- Small-production or regional wines Claude never learned well
- Any wine where Claude returns `found=false`

Additionally, wines "found" by Claude are supposed to be cached in `wine_catalog` for future lookups, but the insert is silently failing because the `source` column doesn't exist in the schema. Every unknown wine hits the Claude API on every scan.

## Goals

1. Perform real web searches against credible wine sites when a wine isn't in the catalog
2. Parse search results with Claude to extract structured palate + metadata
3. Store enriched wines in `wine_catalog` with provenance tracking, so future scans are instant
4. Fix the broken catalog insert for AI-looked-up wines

## Non-Goals

- Bulk re-enriching the existing Kaggle catalog
- Scraping wine sites directly (search snippets only)
- Building a proprietary wine database
- UI changes to show data source to user (Phase 2)

## User-Facing Behavior

No visible change. The scan flow already shows a loading state while `find-wine` runs. From the user's perspective, more wines return data instead of showing incomplete info.

## Architecture

### Current flow (steps 1–3)
1. Catalog exact match (ILIKE on name)
2. Catalog FTS (PostgreSQL websearch)
3. Claude AI lookup (training data memory) → insert with `source: 'ai'` (currently broken)

### New flow (steps 1–4)
1. Catalog exact match (unchanged)
2. Catalog FTS (unchanged)
3. **NEW: SerpAPI web search** against credible wine sites
   - Query: `"${name}" ${vintage ?? ''} wine` restricted to `winemag.com`, `wine-searcher.com`, `vivino.com`
   - Claude parses returned snippets → structured wine data
   - Insert with `source: 'web'`
4. Claude AI lookup (fallback if SerpAPI returns nothing useful)
   - Insert with `source: 'ai'`

### Credible sources
| Domain | Data strength |
|--------|--------------|
| `winemag.com` | Critic scores, tasting notes, region, grape |
| `wine-searcher.com` | Pricing, region, grape variety, producer |
| `vivino.com` | Community ratings, grape, region |

## Schema Changes

**Migration 010** — add `source` column to `wine_catalog`:
```sql
ALTER TABLE wine_catalog
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'kaggle';
```

Values: `'kaggle'` (original import), `'web'` (SerpAPI enriched), `'ai'` (Claude training data).

No data migration needed — existing rows correctly default to `'kaggle'`.

## Implementation

### `src/routes/api/find-wine.ts`

Between step 2 (FTS) and step 3 (Claude AI), add:

```
3a. SerpAPI web search
  - If SERPAPI_KEY is set, call SerpAPI with engine=google
  - Query targets winemag.com, wine-searcher.com, vivino.com
  - Collect up to 3 organic result snippets
  - Pass snippets to Claude Haiku with the wine_info tool (same schema as current step 3)
  - Prompt emphasizes: "extract from these search results only, do not invent data"
  - If Claude returns found=true with snippet-sourced data → insert with source='web', return
  - If SerpAPI key missing or returns 0 relevant results → fall through to step 3b

3b. Claude AI lookup (existing behavior, now labeled source='ai')
```

### `supabase/migrations/010_wine_catalog_source.sql`

```sql
ALTER TABLE wine_catalog
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'kaggle';
```

## Edge Cases

- **SerpAPI rate limit / timeout**: fall through to Claude AI; never block the user
- **Snippets too thin to parse**: Claude returns `found=false`; fall through to Claude AI
- **Duplicate insert**: existing `UNIQUE` index on `title` column prevents dupes — but AI-inserted wines don't set `title`. Add name+vintage uniqueness guard in the insert logic (check by `name` ILIKE + `vintage` before inserting)
- **Wrong wine from web search**: possible but the same risk exists with Claude AI. Web search is expected to be more accurate for real wines.
- **Wine not found anywhere**: returns `{ wine: null, source: 'not_found' }` as today

## Acceptance Criteria

- [ ] A wine not in the Kaggle catalog but on Wine Enthusiast (e.g., a 2023 vintage) returns palate data from web search
- [ ] That wine now appears in `wine_catalog` with `source = 'web'`
- [ ] A second scan of the same wine hits the catalog and returns in <100ms (no API calls)
- [ ] Claude AI fallback still works when SerpAPI is unavailable or returns nothing
- [ ] No wines with `source = 'ai'` are inserted with duplicate names (name+vintage guard)
- [ ] Wines from the Kaggle import still return with `source = 'kaggle'`
