-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new
--
-- Adds structured flavor intelligence to the wine catalog.
-- Safe to run after 002_wine_catalog.sql.

ALTER TABLE wine_catalog
  ADD COLUMN IF NOT EXISTS flavor_tags     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wine_style      TEXT[] NOT NULL DEFAULT '{conventional}',
  ADD COLUMN IF NOT EXISTS adventurousness SMALLINT NOT NULL DEFAULT 3;

-- GIN indexes for array containment queries (@>, <@, &&)
-- e.g. WHERE flavor_tags @> '{earth,mineral}'
--      WHERE wine_style @> '{natural}'
CREATE INDEX IF NOT EXISTS wine_catalog_flavor_gin
  ON wine_catalog USING GIN (flavor_tags);

CREATE INDEX IF NOT EXISTS wine_catalog_style_gin
  ON wine_catalog USING GIN (wine_style);

-- B-tree for range / ORDER BY adventurousness
CREATE INDEX IF NOT EXISTS wine_catalog_adventure_idx
  ON wine_catalog (adventurousness);
