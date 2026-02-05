import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Reset Selector State
 * 
 * Clears all caches and test data for clean testing of the blog automation pipeline.
 * Protected by BLOG_CRON_SECRET (reusing existing secret).
 * 
 * Query params:
 * - token: BLOG_CRON_SECRET for authentication
 * - include_test_posts: if "true", also delete blog_posts where title contains "[TEST]"
 * - dry_run: if "true", only report what would be deleted without actually deleting
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Validate secret token (reuse BLOG_CRON_SECRET)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const expectedToken = Deno.env.get('BLOG_CRON_SECRET');
    
    if (!token || token !== expectedToken) {
      console.error('Invalid or missing token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    const includeTestPosts = url.searchParams.get('include_test_posts') === 'true';
    const dryRun = url.searchParams.get('dry_run') === 'true';
    
    console.log(`Reset Selector State: Starting... (dry_run=${dryRun}, include_test_posts=${includeTestPosts})`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const report: {
      serp_scores_deleted: number;
      trend_candidates_deleted: number;
      automation_runs_deleted: number;
      post_history_deleted: number;
      test_blog_posts_deleted: number;
      dry_run: boolean;
      duration_ms: number;
    } = {
      serp_scores_deleted: 0,
      trend_candidates_deleted: 0,
      automation_runs_deleted: 0,
      post_history_deleted: 0,
      test_blog_posts_deleted: 0,
      dry_run: dryRun,
      duration_ms: 0,
    };
    
    // 1. Count and delete serp_scores (SERP cache)
    const { count: serpCount } = await supabase
      .from('serp_scores')
      .select('*', { count: 'exact', head: true });
    report.serp_scores_deleted = serpCount || 0;
    
    if (!dryRun && report.serp_scores_deleted > 0) {
      const { error } = await supabase.from('serp_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Error deleting serp_scores:', error);
      else console.log(`Deleted ${report.serp_scores_deleted} serp_scores rows`);
    }
    
    // 2. Count and delete trend_candidates (candidate pool)
    const { count: trendCount } = await supabase
      .from('trend_candidates')
      .select('*', { count: 'exact', head: true });
    report.trend_candidates_deleted = trendCount || 0;
    
    if (!dryRun && report.trend_candidates_deleted > 0) {
      const { error } = await supabase.from('trend_candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Error deleting trend_candidates:', error);
      else console.log(`Deleted ${report.trend_candidates_deleted} trend_candidates rows`);
    }
    
    // 3. Count and delete automation_runs (logs)
    const { count: runCount } = await supabase
      .from('automation_runs')
      .select('*', { count: 'exact', head: true });
    report.automation_runs_deleted = runCount || 0;
    
    if (!dryRun && report.automation_runs_deleted > 0) {
      const { error } = await supabase.from('automation_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Error deleting automation_runs:', error);
      else console.log(`Deleted ${report.automation_runs_deleted} automation_runs rows`);
    }
    
    // 4. Count and delete post_history (selection history)
    const { count: historyCount } = await supabase
      .from('post_history')
      .select('*', { count: 'exact', head: true });
    report.post_history_deleted = historyCount || 0;
    
    if (!dryRun && report.post_history_deleted > 0) {
      const { error } = await supabase.from('post_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Error deleting post_history:', error);
      else console.log(`Deleted ${report.post_history_deleted} post_history rows`);
    }
    
    // 5. Optionally delete test blog posts (titles containing [TEST])
    if (includeTestPosts) {
      const { count: testPostCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .ilike('title', '%[TEST]%');
      report.test_blog_posts_deleted = testPostCount || 0;
      
      if (!dryRun && report.test_blog_posts_deleted > 0) {
        const { error } = await supabase.from('blog_posts').delete().ilike('title', '%[TEST]%');
        if (error) console.error('Error deleting test blog_posts:', error);
        else console.log(`Deleted ${report.test_blog_posts_deleted} test blog_posts rows`);
      }
    }
    
    report.duration_ms = Date.now() - startTime;
    
    console.log('Reset complete:', report);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: dryRun ? 'Dry run complete - no data deleted' : 'Reset complete',
        report,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Reset Selector State error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
