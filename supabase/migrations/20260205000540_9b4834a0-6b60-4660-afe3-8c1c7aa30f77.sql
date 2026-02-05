-- Add new columns to trend_candidates for proper deduplication
ALTER TABLE trend_candidates 
ADD COLUMN IF NOT EXISTS keyword_norm text,
ADD COLUMN IF NOT EXISTS first_seen_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS seen_count integer DEFAULT 1;

-- Populate keyword_norm from existing candidate_keyword (normalized)
UPDATE trend_candidates 
SET keyword_norm = LOWER(TRIM(REGEXP_REPLACE(candidate_keyword, '\s+', ' ', 'g')))
WHERE keyword_norm IS NULL;

-- Create unique index on keyword_norm for upsert behavior
CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_candidates_keyword_norm 
ON trend_candidates (keyword_norm);

-- Add scored_at column to serp_scores if not exists (use created_at as fallback)
-- The expires_at already exists, we'll use that for cache validity

-- Add keyword_norm to serp_scores for consistent lookups
ALTER TABLE serp_scores
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'dataforseo',
ADD COLUMN IF NOT EXISTS locale text DEFAULT 'IN-en';

-- Create unique index for cache lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_serp_scores_cache_key 
ON serp_scores (keyword, provider, locale);

-- Add keyword_norm to evergreen_topics
ALTER TABLE evergreen_topics
ADD COLUMN IF NOT EXISTS keyword_norm text;

-- Populate keyword_norm in evergreen_topics
UPDATE evergreen_topics
SET keyword_norm = LOWER(TRIM(REGEXP_REPLACE(primary_keyword, '\s+', ' ', 'g')))
WHERE keyword_norm IS NULL;

-- Add keyword_norm to post_history
ALTER TABLE post_history
ADD COLUMN IF NOT EXISTS keyword_norm text;

-- Populate keyword_norm in post_history
UPDATE post_history
SET keyword_norm = LOWER(TRIM(REGEXP_REPLACE(primary_keyword, '\s+', ' ', 'g')))
WHERE keyword_norm IS NULL;