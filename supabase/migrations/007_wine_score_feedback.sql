-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new

-- Captures user judgement on how accurately the app scored a wine.
-- One record per user per wine (enforced by application logic).

CREATE TABLE IF NOT EXISTS wine_score_feedback (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wine_catalog_id   BIGINT      REFERENCES wine_catalog(id) ON DELETE SET NULL,
  wine_name         TEXT        NOT NULL,
  taste_fit_score   INT,
  we_points         INT,
  accuracy          TEXT        NOT NULL CHECK (accuracy IN ('nailed_it', 'pretty_close', 'missed_it')),
  note              TEXT,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wine_score_feedback_user_idx     ON wine_score_feedback (user_id);
CREATE INDEX IF NOT EXISTS wine_score_feedback_catalog_idx  ON wine_score_feedback (wine_catalog_id);

ALTER TABLE wine_score_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own score feedback"
  ON wine_score_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own score feedback"
  ON wine_score_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own score feedback"
  ON wine_score_feedback FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can read all score feedback"
  ON wine_score_feedback FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'bstahlhammer@gmail.com');
