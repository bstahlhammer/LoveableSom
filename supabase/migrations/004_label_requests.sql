-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new

-- Tracks user-flagged wines that are missing bottle labels.
-- The enrichment pipeline (enrich-labels.mjs) processes 'pending' rows weekly.

CREATE TABLE IF NOT EXISTS label_requests (
  id                    BIGSERIAL PRIMARY KEY,
  catalog_id            BIGINT REFERENCES wine_catalog(id) ON DELETE CASCADE,
  wine_name             TEXT NOT NULL,
  requested_by          UUID REFERENCES auth.users(id),
  requested_at          TIMESTAMPTZ DEFAULT NOW(),
  status                TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'matched' | 'no_match' | 'skipped'
  matched_at            TIMESTAMPTZ,
  winesensed_vintage_id TEXT
);

-- One open request per wine — don't pile up duplicates
CREATE UNIQUE INDEX IF NOT EXISTS label_requests_catalog_pending_idx
  ON label_requests (catalog_id)
  WHERE status = 'pending';

-- Fast lookup for the enrichment script
CREATE INDEX IF NOT EXISTS label_requests_status_idx ON label_requests (status);

-- Alcohol percentage from WineSensed (not in the Kaggle source)
ALTER TABLE wine_catalog ADD COLUMN IF NOT EXISTS alcohol NUMERIC(4,1);

-- RLS
ALTER TABLE label_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert label requests"
  ON label_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Users can read their own label requests"
  ON label_requests FOR SELECT
  USING (auth.uid() = requested_by);
