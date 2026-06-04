-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new

-- Persists whether a scan was a physical shelf or a menu/list.
-- Required so ShelfSpotlight survives reopening scans from history.
-- Existing rows default to 'list' (safe — we can't know retroactively).

ALTER TABLE scans ADD COLUMN IF NOT EXISTS scan_type text NOT NULL DEFAULT 'list';
