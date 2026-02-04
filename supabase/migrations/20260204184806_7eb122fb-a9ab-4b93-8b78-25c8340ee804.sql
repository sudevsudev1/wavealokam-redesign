-- ============================================================================
-- AUTOMATED BLOG TOPIC SELECTION SYSTEM - DATABASE TABLES
-- ============================================================================

-- Table: post_history - Tracks all published posts to prevent repeats
CREATE TABLE public.post_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  publish_date DATE NOT NULL,
  publish_day TEXT NOT NULL CHECK (publish_day IN ('sunday', 'wednesday')),
  post_type TEXT NOT NULL CHECK (post_type IN ('weekly', 'seasonal')),
  theme_id TEXT,
  primary_keyword TEXT NOT NULL,
  bucket TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  blog_post_id UUID REFERENCES public.blog_posts(id),
  selection_meta JSONB DEFAULT '{}'::jsonb
);

-- Table: trend_candidates - Stores pytrends results from GitHub Action
CREATE TABLE public.trend_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  seed_keyword TEXT NOT NULL,
  candidate_keyword TEXT NOT NULL,
  query_type TEXT NOT NULL CHECK (query_type IN ('top', 'rising')),
  source TEXT NOT NULL CHECK (source IN ('related_queries', 'related_topics')),
  interest_90d INTEGER,
  interest_12m INTEGER,
  geo TEXT NOT NULL DEFAULT 'IN',
  raw_data JSONB DEFAULT '{}'::jsonb,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  is_relevant BOOLEAN,
  relevance_score INTEGER
);

-- Table: serp_scores - Stores SERP API scoring results
CREATE TABLE public.serp_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  keyword TEXT NOT NULL,
  intent_score INTEGER NOT NULL DEFAULT 0,
  rankability_score INTEGER NOT NULL DEFAULT 0,
  content_gap_score INTEGER NOT NULL DEFAULT 0,
  local_fit_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  top_10_domains JSONB DEFAULT '[]'::jsonb,
  raw_serp_data JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Table: seasonal_calendar - Stores seasonal theme configurations
CREATE TABLE public.seasonal_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id TEXT NOT NULL UNIQUE,
  bucket TEXT NOT NULL,
  active_from_mmdd TEXT NOT NULL,
  active_to_mmdd TEXT NOT NULL,
  seed_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: evergreen_topics - Stores evergreen topic library
CREATE TABLE public.evergreen_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket TEXT NOT NULL,
  primary_keyword TEXT NOT NULL,
  title_ideas JSONB NOT NULL DEFAULT '[]'::jsonb,
  seed_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
  internal_link_focus TEXT NOT NULL CHECK (internal_link_focus IN ('rooms', 'surf', 'packages', 'contact')),
  last_used_at TIMESTAMP WITH TIME ZONE,
  use_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: automation_runs - Tracks automation executions for debugging
CREATE TABLE public.automation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  run_type TEXT NOT NULL CHECK (run_type IN ('weekly', 'seasonal', 'pytrends')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  candidates_found INTEGER DEFAULT 0,
  selected_keyword TEXT,
  selected_bucket TEXT,
  log_data JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.post_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serp_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evergreen_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role has full access (automation runs as service role)
CREATE POLICY "Service role full access to post_history"
  ON public.post_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to trend_candidates"
  ON public.trend_candidates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to serp_scores"
  ON public.serp_scores FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to seasonal_calendar"
  ON public.seasonal_calendar FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to evergreen_topics"
  ON public.evergreen_topics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to automation_runs"
  ON public.automation_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Public read access for calendar and topics (for potential future admin UI)
CREATE POLICY "Public read seasonal_calendar"
  ON public.seasonal_calendar FOR SELECT
  USING (true);

CREATE POLICY "Public read evergreen_topics"
  ON public.evergreen_topics FOR SELECT
  USING (true);

-- Indexes for performance
CREATE INDEX idx_post_history_bucket_date ON public.post_history(bucket, publish_date DESC);
CREATE INDEX idx_post_history_publish_date ON public.post_history(publish_date DESC);
CREATE INDEX idx_trend_candidates_processed ON public.trend_candidates(is_processed, created_at DESC);
CREATE INDEX idx_serp_scores_keyword ON public.serp_scores(keyword);
CREATE INDEX idx_serp_scores_expires ON public.serp_scores(expires_at);
CREATE INDEX idx_evergreen_topics_bucket ON public.evergreen_topics(bucket, last_used_at);
CREATE INDEX idx_automation_runs_type_date ON public.automation_runs(run_type, created_at DESC);