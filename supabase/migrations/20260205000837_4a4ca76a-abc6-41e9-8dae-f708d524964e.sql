-- Add seeds column to trend_candidates for tracking which seed phrases produced each candidate
ALTER TABLE trend_candidates
ADD COLUMN IF NOT EXISTS seeds jsonb DEFAULT '[]'::jsonb;

-- Add keyword_raw column if not exists
ALTER TABLE trend_candidates
ADD COLUMN IF NOT EXISTS keyword_raw text;

-- Populate keyword_raw from candidate_keyword for existing records
UPDATE trend_candidates
SET keyword_raw = candidate_keyword
WHERE keyword_raw IS NULL;

-- Add last_pytrends_meta column for storing pytrends metadata
ALTER TABLE trend_candidates
ADD COLUMN IF NOT EXISTS last_pytrends_meta jsonb DEFAULT '{}'::jsonb;

-- Add source_type column
ALTER TABLE trend_candidates
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'related_queries';