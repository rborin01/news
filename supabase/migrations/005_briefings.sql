-- Migration 005: briefings table
-- Stores AI-generated briefings per user

CREATE TABLE IF NOT EXISTS briefings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  profession text,
  specialty text,
  articles jsonb DEFAULT '[]',
  analysis text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','done','error')),
  error_msg text
);

CREATE INDEX IF NOT EXISTS briefings_user_generated_idx ON briefings(user_id, generated_at DESC);

ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

-- Users can read their own briefings
CREATE POLICY "briefings_select_own"
  ON briefings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own briefings
CREATE POLICY "briefings_insert_own"
  ON briefings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own briefings (e.g. status transitions)
CREATE POLICY "briefings_update_own"
  ON briefings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can update briefings (for backend workers writing analysis/status)
CREATE POLICY "briefings_update_service_role"
  ON briefings
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
