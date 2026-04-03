-- W34: Add borin_index_tags column to processed_news
-- Deterministic index tags based on category mapping
-- Tags: IIR, IREF, IMP, ICD, ICR, IGE, ICN, IAN, IPR

ALTER TABLE processed_news ADD COLUMN IF NOT EXISTS borin_index_tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_processed_borin_tags ON processed_news USING gin(borin_index_tags);
