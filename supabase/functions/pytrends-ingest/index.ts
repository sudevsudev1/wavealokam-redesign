import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 interface TrendCandidate {
   keyword_raw: string;
   keyword_norm: string;
   seed_keyword: string;
   source: string;
   source_type?: string;
   query_type: string;
   is_relevant: boolean;
   relevance_score?: number;
   seeds?: string[];
   last_pytrends_meta?: Record<string, unknown>;
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     // Authenticate with BLOG_CRON_SECRET from header
     const token = req.headers.get('x-cron-secret');
     const expectedToken = Deno.env.get('WAVEALOKAM_BLOG_CRON_SECRET_V2');
     
     if (!token || token !== expectedToken) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), {
         status: 401,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const { candidates, prune_before_days } = await req.json() as {
       candidates: TrendCandidate[];
       prune_before_days?: number;
     };
 
     if (!candidates || !Array.isArray(candidates)) {
       return new Response(JSON.stringify({ error: 'Missing candidates array' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     console.log(`Received ${candidates.length} candidates for ingestion`);
 
     // Prune old candidates if requested (default 60 days)
     const pruneDays = prune_before_days || 60;
     const cutoffDate = new Date();
     cutoffDate.setDate(cutoffDate.getDate() - pruneDays);
     
     const { error: pruneError } = await supabase
       .from('trend_candidates')
       .delete()
       .lt('last_seen_at', cutoffDate.toISOString());
     
     if (pruneError) {
       console.warn('Prune warning:', pruneError.message);
     }
 
     const now = new Date().toISOString();
     let upserted = 0;
     let errors = 0;
 
     // Process each candidate with UPSERT logic
     for (const candidate of candidates) {
       // Check if exists by keyword_norm (UNIQUE constraint)
       const { data: existing } = await supabase
         .from('trend_candidates')
         .select('id, seen_count, seeds')
         .eq('keyword_norm', candidate.keyword_norm)
         .maybeSingle();
 
       if (existing) {
         // UPDATE existing record - merge seeds and increment seen_count
         const newSeenCount = (existing.seen_count || 0) + 1;
         const existingSeeds = existing.seeds || [];
         const mergedSeeds = [...new Set([...existingSeeds, ...(candidate.seeds || [])])];
 
         const { error: updateError } = await supabase
           .from('trend_candidates')
           .update({
             last_seen_at: now,
             seen_count: newSeenCount,
             seeds: mergedSeeds,
             last_pytrends_meta: candidate.last_pytrends_meta,
             relevance_score: candidate.relevance_score,
           })
           .eq('id', existing.id);
         
         if (updateError) {
           console.error(`Update error for ${candidate.keyword_norm}:`, updateError.message);
           errors++;
           continue;
         }
       } else {
         // INSERT new record
         const { error: insertError } = await supabase
           .from('trend_candidates')
           .insert({
             keyword_raw: candidate.keyword_raw,
             keyword_norm: candidate.keyword_norm,
             candidate_keyword: candidate.keyword_raw,
             seed_keyword: candidate.seed_keyword,
             source: candidate.source,
             source_type: candidate.source_type || 'related_queries',
             query_type: candidate.query_type,
             is_relevant: candidate.is_relevant,
             relevance_score: candidate.relevance_score,
             first_seen_at: now,
             last_seen_at: now,
             seen_count: 1,
             seeds: candidate.seeds || [],
             last_pytrends_meta: candidate.last_pytrends_meta,
           });
         
         if (insertError) {
           console.error(`Insert error for ${candidate.keyword_norm}:`, insertError.message);
           errors++;
           continue;
         }
       }
       upserted++;
     }
 
     console.log(`Ingestion complete: ${upserted} upserted, ${errors} errors`);
 
     return new Response(JSON.stringify({
       success: true,
       upserted,
       errors,
       pruned_before: cutoffDate.toISOString(),
     }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
 
   } catch (error) {
     console.error('Ingestion error:', error);
     const message = error instanceof Error ? error.message : 'Unknown error';
     return new Response(JSON.stringify({ error: message }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });