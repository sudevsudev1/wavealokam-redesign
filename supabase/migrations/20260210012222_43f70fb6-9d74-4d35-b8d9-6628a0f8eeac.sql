
-- Store anonymized conversation insights for progressive learning
CREATE TABLE public.chat_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  intent TEXT NOT NULL,
  question_pattern TEXT NOT NULL,
  best_answer TEXT,
  follow_up_topics TEXT[],
  language TEXT DEFAULT 'en',
  occurrence_count INTEGER DEFAULT 1,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_chat_insights_topic ON public.chat_insights (topic);
CREATE INDEX idx_chat_insights_occurrence ON public.chat_insights (occurrence_count DESC);

-- No RLS needed - only accessed by edge functions (service role)
ALTER TABLE public.chat_insights ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) full access
CREATE POLICY "Service role full access" ON public.chat_insights
  FOR ALL USING (true) WITH CHECK (true);
