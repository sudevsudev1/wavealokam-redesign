
-- Fix chat_insights
DROP POLICY IF EXISTS "Service role full access" ON public.chat_insights;
CREATE POLICY "Service role full access" ON public.chat_insights
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Fix emotion_gaps
DROP POLICY IF EXISTS "Service role full access" ON public.emotion_gaps;
CREATE POLICY "Service role full access" ON public.emotion_gaps
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Fix chat_directives
DROP POLICY IF EXISTS "Service role full access on chat_directives" ON public.chat_directives;
CREATE POLICY "Service role full access on chat_directives" ON public.chat_directives
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
