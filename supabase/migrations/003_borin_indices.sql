-- Migration 003: borin_indices table
-- Stores weekly Borin Index scores for each index code

CREATE TABLE IF NOT EXISTS borin_indices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start date NOT NULL,
  index_code text NOT NULL CHECK (index_code IN ('IPR','IIR','IREF','ICR','ICD','ILE','ICH','IPS','IGI')),
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  article_count integer DEFAULT 0,
  methodology text DEFAULT '',
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(week_start, index_code)
);

CREATE INDEX IF NOT EXISTS borin_indices_week_start_idx ON borin_indices(week_start DESC);

ALTER TABLE borin_indices ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all indices
CREATE POLICY "borin_indices_select_authenticated"
  ON borin_indices
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role can insert (bypasses RLS by default, policy shown for clarity)
CREATE POLICY "borin_indices_insert_service_role"
  ON borin_indices
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "borin_indices_update_service_role"
  ON borin_indices
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
