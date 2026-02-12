
-- Create table for storing scraped guest reviews
CREATE TABLE public.guest_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'google',
  reviewer_name TEXT,
  rating NUMERIC(2,1),
  review_text TEXT NOT NULL,
  review_date TEXT,
  language TEXT DEFAULT 'en',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  review_hash TEXT UNIQUE NOT NULL
);

-- Enable RLS
ALTER TABLE public.guest_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for the chat function to query
CREATE POLICY "Anyone can read guest reviews"
ON public.guest_reviews
FOR SELECT
USING (true);

-- Service role for insert/update/delete (scraper)
CREATE POLICY "Service role full access to guest_reviews"
ON public.guest_reviews
FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Index for efficient querying
CREATE INDEX idx_guest_reviews_featured ON public.guest_reviews (is_featured, rating DESC);
CREATE INDEX idx_guest_reviews_platform ON public.guest_reviews (platform);
