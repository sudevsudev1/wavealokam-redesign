
-- Enable RLS on chat_visitors
ALTER TABLE public.chat_visitors ENABLE ROW LEVEL SECURITY;

-- Only service role can access chat_visitors (contains PII)
CREATE POLICY "Service role full access to chat_visitors"
ON public.chat_visitors
FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);
