-- True Press V4 — own_articles table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/sql/new

CREATE TABLE IF NOT EXISTS own_articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topic text NOT NULL,
  headline text NOT NULL,
  lede text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  sources text[] DEFAULT '{}',
  category text DEFAULT 'Geral',
  author_ai text DEFAULT 'TruePress AI',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE own_articles ENABLE ROW LEVEL SECURITY;

-- Anon: read published only
CREATE POLICY "anon_read_published" ON own_articles
  FOR SELECT USING (status = 'published');

-- Service role: all operations
CREATE POLICY "service_all" ON own_articles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_own_articles_updated_at
  BEFORE UPDATE ON own_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for ordering
CREATE INDEX IF NOT EXISTS own_articles_created_at_idx ON own_articles (created_at DESC);
CREATE INDEX IF NOT EXISTS own_articles_status_idx ON own_articles (status);
