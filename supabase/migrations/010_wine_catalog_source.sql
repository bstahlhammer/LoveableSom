-- Adds provenance tracking to wine_catalog.
-- 'kaggle'  = original Kaggle/Wine Enthusiast import (most reliable)
-- 'web'     = enriched from SerpAPI web search against credible wine sites
-- 'ai'      = derived from Claude training data memory (least reliable)

ALTER TABLE wine_catalog
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'kaggle';
