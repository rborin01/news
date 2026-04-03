-- W35: Allow anon key to read all non-archived own_articles and soft-delete (archive)
-- Purpose: Friday Dashboard (friday.rodrigoborin.com) uses anon key to list and manage articles
-- Run in: Supabase SQL Editor for project sfnvctljxidzueoutnxv

-- Drop restrictive policy (allows only published)
DROP POLICY IF EXISTS "anon_read_published" ON own_articles;

-- Anon can read all non-archived articles (published + draft)
CREATE POLICY "anon_read_non_archived" ON own_articles
  FOR SELECT USING (status IS DISTINCT FROM 'archived');

-- Anon can soft-delete (archive) — UPDATE status only
CREATE POLICY "anon_archive" ON own_articles
  FOR UPDATE USING (true) WITH CHECK (true);
