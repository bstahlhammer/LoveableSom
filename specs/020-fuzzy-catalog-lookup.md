# Spec 020 — Fuzzy Catalog Lookup (pg_trgm)

## Problem
`lookupWineCatalog` uses two strategies: exact `ilike` then full-text search. Both are sensitive to word order and missing tokens. OCR frequently transposes words or abbreviates ("Caymus Cab Sauv Special Selection" vs. the DB row "Caymus Special Selection Cabernet Sauvignon"). These misses fall through to the AI enrichment pass (`/api/find-wine`), which is slower, consumes quota, and produces less reliable palate data than the curated catalog.

## Goals
- Recover catalog matches for names that fail exact and FTS but are clearly the same wine.
- Keep median lookup latency under 300 ms.
- No change to how catalog rows are mapped to wine objects.

## Non-Goals
- Correcting OCR errors (that is Spec 021).
- Full-text ranking improvements.
- Changes to the Supabase RLS policies.

## Behavior

### Third lookup pass — trigram similarity
After exact `ilike` and FTS both return null, perform a third query using PostgreSQL `pg_trgm` similarity:

```sql
SELECT * FROM wine_catalog
WHERE similarity(name, :query) > 0.35
ORDER BY similarity(name, :query) DESC
LIMIT 1;
```

The threshold `0.35` is calibrated to recover word-order mismatches and minor abbreviations while rejecting obviously different wines. It should be a named constant so it can be tuned without a code change.

### Implementation path
- `pg_trgm` is a PostgreSQL extension. Enable it in Supabase with `CREATE EXTENSION IF NOT EXISTS pg_trgm;` (run once in the SQL editor).
- Create a GiST index: `CREATE INDEX wine_catalog_name_trgm ON wine_catalog USING gist (name gist_trgm_ops);` — required for performance at 100k rows.
- The Supabase JS client cannot call `similarity()` directly via the query builder. Use `supabase.rpc('wine_catalog_fuzzy_lookup', { query, threshold })` with a Postgres function wrapper:

```sql
CREATE OR REPLACE FUNCTION wine_catalog_fuzzy_lookup(query text, threshold float DEFAULT 0.35)
RETURNS SETOF wine_catalog
LANGUAGE sql STABLE
AS $$
  SELECT * FROM wine_catalog
  WHERE similarity(name, query) > threshold
  ORDER BY similarity(name, query) DESC
  LIMIT 1;
$$;
```

### Fallthrough order
1. Exact `ilike` — current behavior, unchanged.
2. FTS `websearch` — current behavior, unchanged.
3. **NEW** — trigram fuzzy via `wine_catalog_fuzzy_lookup` RPC.
4. Return null → AI enrichment pass takes over.

### When to skip the fuzzy pass
- If the normalized name is fewer than 6 characters — short names produce too many false positives with trigram similarity.
- If either exact or FTS already returned a result.

## Edge Cases
- RPC not yet deployed (extension or function missing): catch the error, log a warning, and continue to null — do not throw.
- Threshold produces two wines with identical similarity scores: Postgres `ORDER BY similarity DESC LIMIT 1` is non-deterministic in that case; acceptable.
- Very long OCR strings (>80 chars): similarity degrades gracefully; the threshold will naturally reject bad matches.

## Acceptance Criteria
- `lookupWineCatalog("Caymus Cab Sauv Special Selection")` resolves to the "Caymus Special Selection Cabernet Sauvignon" catalog row.
- `lookupWineCatalog("Opus 1 Napa")` resolves to "Opus One" (similarity > 0.35).
- `lookupWineCatalog("xyz123 not a wine")` returns null (below threshold, no false match).
- Median lookup time for the fuzzy pass alone (when triggered) ≤ 200 ms on the Supabase free tier.
- Existing exact and FTS matches are not affected — fuzzy is only called on double-miss.

## SQL to Run Before Deploying
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS wine_catalog_name_trgm ON wine_catalog USING gist (name gist_trgm_ops);
CREATE OR REPLACE FUNCTION wine_catalog_fuzzy_lookup(query text, threshold float DEFAULT 0.35)
RETURNS SETOF wine_catalog LANGUAGE sql STABLE AS $$
  SELECT * FROM wine_catalog
  WHERE similarity(name, query) > threshold
  ORDER BY similarity(name, query) DESC
  LIMIT 1;
$$;
```

## Files to Change
- `src/core/api.js` — `lookupWineCatalog` function: add third pass after existing FTS block.
