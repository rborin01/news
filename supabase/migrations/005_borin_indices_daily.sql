-- ============================================================================
-- W35: borin_indices_daily — daily snapshot of Borin Index metrics
-- Depends on: W34 migration 003_borin_index_tags.sql (processed_news.borin_index_tags)
-- ============================================================================

CREATE TABLE IF NOT EXISTS borin_indices_daily (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  index_code text NOT NULL CHECK (index_code IN ('IIR','IREF','ICR','IGE','ICN','IAN','IMP','ICD','IPR')),
  article_count integer DEFAULT 0,
  avg_score_rodrigo numeric(5,2),
  avg_score_brasil numeric(5,2),
  top_articles uuid[],
  sentiment_label text CHECK (sentiment_label IN ('positive','negative','neutral','mixed')),
  snapshot_at timestamptz DEFAULT now(),
  UNIQUE (date, index_code)
);

-- RLS: enable + anon SELECT
ALTER TABLE borin_indices_daily ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'borin_indices_daily' AND policyname = 'anon_read'
  ) THEN
    EXECUTE 'CREATE POLICY "anon_read" ON borin_indices_daily FOR SELECT USING (true)';
  END IF;
END $$;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_borin_daily_date ON borin_indices_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_borin_daily_code ON borin_indices_daily(index_code);
