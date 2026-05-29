-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new

CREATE TABLE IF NOT EXISTS wine_catalog (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,          -- raw title from Kaggle (for deduplication)
  name        TEXT NOT NULL,          -- clean display name: "{winery} {designation_or_variety}"
  winery      TEXT,
  vintage     SMALLINT,
  variety     TEXT,
  designation TEXT,                   -- sub-label / cuvée name from Kaggle
  region      TEXT,                   -- region_1 from Kaggle
  province    TEXT,
  country     TEXT,
  description TEXT,                   -- Wine Enthusiast tasting note
  points      SMALLINT,               -- critic score 80-100
  price       NUMERIC(8,2),
  -- Palate axes 0-100 (inferred from grape variety rules + description keywords)
  body        SMALLINT NOT NULL DEFAULT 60,
  tannin      SMALLINT NOT NULL DEFAULT 40,
  sweetness   SMALLINT NOT NULL DEFAULT 20,
  acidity     SMALLINT NOT NULL DEFAULT 60,
  -- Wine color (for placeholder icon tinting)
  color       TEXT NOT NULL DEFAULT 'red',  -- 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert'
  -- Image (filled lazily when a user first encounters this wine)
  image_url   TEXT,
  image_fetched_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Deduplicate on exact title
CREATE UNIQUE INDEX IF NOT EXISTS wine_catalog_title_idx ON wine_catalog (title);

-- Full-text search across name + winery + variety
CREATE INDEX IF NOT EXISTS wine_catalog_fts_idx ON wine_catalog
  USING GIN (to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(winery, '') || ' ' ||
    coalesce(variety, '') || ' ' ||
    coalesce(designation, '')
  ));

-- Fast prefix / exact lookups
CREATE INDEX IF NOT EXISTS wine_catalog_name_lower_idx ON wine_catalog (lower(name));
CREATE INDEX IF NOT EXISTS wine_catalog_variety_idx    ON wine_catalog (variety);
CREATE INDEX IF NOT EXISTS wine_catalog_country_idx    ON wine_catalog (country);

-- Anyone can read the catalog (public wine data)
ALTER TABLE wine_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wine catalog"
  ON wine_catalog FOR SELECT USING (true);
