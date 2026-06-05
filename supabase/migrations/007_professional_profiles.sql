-- Migration 004: professional_profiles table
-- Stores professional profile data per user for personalized briefings

CREATE TABLE IF NOT EXISTS professional_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profession text NOT NULL CHECK (profession IN ('medico','advogado','contador','engenheiro','agro','outro')),
  specialty text DEFAULT '',
  location text DEFAULT '',
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "professional_profiles_select_own"
  ON professional_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "professional_profiles_insert_own"
  ON professional_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "professional_profiles_update_own"
  ON professional_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_professional_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER professional_profiles_updated_at
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_professional_profiles_updated_at();
