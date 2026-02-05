import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Health check endpoint (no auth required)
  if (req.method === 'GET' && !url.searchParams.has('token')) {
    return new Response(
      JSON.stringify({ ok: true, function: 'reset-selector-state', version: 'v2' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  try {
    // Validate secret token
    const token = url.searchParams.get('token');
    const expectedToken = Deno.env.get('WAVEALOKAM_SELECTOR_RESET_SECRET_V2');
    
    if (!token || token !== expectedToken) {
      console.error('Invalid or missing token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const mode = url.searchParams.get('mode') || 'soft';
    const dryRun = url.searchParams.get('dry_run') === 'true';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Reset selector state: mode=${mode}, dry_run=${dryRun}`);

    const results: Record<string, any> = { mode, dry_run: dryRun };

    // Debug snapshot - just return counts
    if (mode === 'debug_snapshot') {
      const [candidates, serpScores, automationRuns, postHistory] = await Promise.all([
        supabase.from('trend_candidates').select('id', { count: 'exact', head: true }),
        supabase.from('serp_scores').select('id', { count: 'exact', head: true }),
        supabase.from('automation_runs').select('id', { count: 'exact', head: true }),
        supabase.from('post_history').select('id', { count: 'exact', head: true }),
      ]);

      return new Response(
        JSON.stringify({
          ok: true,
          mode: 'debug_snapshot',
          counts: {
            trend_candidates: candidates.count || 0,
            serp_scores: serpScores.count || 0,
            automation_runs: automationRuns.count || 0,
            post_history: postHistory.count || 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculate date thresholds
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (mode === 'soft' || mode === 'candidates_only') {
      // Delete recent candidates (last 30 days)
      if (dryRun) {
        const { count } = await supabase
          .from('trend_candidates')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());
        results.trend_candidates_to_delete = count || 0;
      } else {
        const { error, count } = await supabase
          .from('trend_candidates')
          .delete()
          .gte('created_at', thirtyDaysAgo.toISOString());
        results.trend_candidates_deleted = count || 0;
        if (error) results.trend_candidates_error = error.message;
      }
    }

    if (mode === 'soft' || mode === 'serp_only') {
      // Delete recent SERP scores (last 30 days)
      if (dryRun) {
        const { count } = await supabase
          .from('serp_scores')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());
        results.serp_scores_to_delete = count || 0;
      } else {
        const { error, count } = await supabase
          .from('serp_scores')
          .delete()
          .gte('created_at', thirtyDaysAgo.toISOString());
        results.serp_scores_deleted = count || 0;
        if (error) results.serp_scores_error = error.message;
      }
    }

    if (mode === 'hard') {
      // Delete ALL automation-sourced data
      if (dryRun) {
        const [candidates, serpScores, automationRuns] = await Promise.all([
          supabase.from('trend_candidates').select('id', { count: 'exact', head: true }),
          supabase.from('serp_scores').select('id', { count: 'exact', head: true }),
          supabase.from('automation_runs').select('id', { count: 'exact', head: true }),
        ]);
        results.trend_candidates_to_delete = candidates.count || 0;
        results.serp_scores_to_delete = serpScores.count || 0;
        results.automation_runs_to_delete = automationRuns.count || 0;
      } else {
        const [candidatesResult, serpResult, runsResult] = await Promise.all([
          supabase.from('trend_candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('serp_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('automation_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        ]);
        results.trend_candidates_deleted = 'all';
        results.serp_scores_deleted = 'all';
        results.automation_runs_deleted = 'all';
        if (candidatesResult.error) results.trend_candidates_error = candidatesResult.error.message;
        if (serpResult.error) results.serp_scores_error = serpResult.error.message;
        if (runsResult.error) results.automation_runs_error = runsResult.error.message;
      }
    }

    console.log('Reset complete:', results);

    return new Response(
      JSON.stringify({ ok: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Reset selector state error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
