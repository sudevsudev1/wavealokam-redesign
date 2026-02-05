import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize keyword for consistent cache lookups
function normalizeKeyword(keyword: string): string {
  if (!keyword) return "";
  let result = keyword.toLowerCase().trim();
  result = result.replace(/\s+/g, ' ');
  result = result.replace(/^[^\w\s]+|[^\w\s]+$/g, '');
  return result.trim();
}

// Intent modifiers for scoring
const INTENT_MODIFIERS = [
  'price', 'cost', 'package', 'booking', 'book', 'stay', 'resort', 'beach stay',
  'homestay', 'bed and breakfast', 'boutique stay', 'surf lessons', 'surf school',
  'beginner', 'private', 'near', 'best time', 'itinerary', 'how to reach',
  'things to do', 'family', 'couple', 'workation', 'wifi', 'calm', 'quiet', 'less crowded'
];

// Mega-authority domains to penalize
const MEGA_AUTHORITIES = [
  'booking.com', 'airbnb.com', 'makemytrip.com', 'tripadvisor.com', 'expedia.com',
  'agoda.com', 'goibibo.com', 'yatra.com', 'cleartrip.com', 'wikipedia.org',
  'lonelyplanet.com', 'cntraveller.in', 'nationalgeographic.com', 'bbc.com',
];

// Local relevance terms
const LOCAL_TERMS = [
  'varkala', 'edava', 'kappil', 'trivandrum', 'thiruvananthapuram', 'kerala',
  'surf lessons', 'boutique', 'beach stay', 'kayaking', 'backwater'
];

interface SeasonalTheme {
  id: string;
  theme_id: string;
  bucket: string;
  active_from_mmdd: string;
  active_to_mmdd: string;
  seed_phrases: string[];
  notes: string | null;
}

interface SerpScore {
  keyword: string;
  keywordNorm: string;
  intentScore: number;
  rankabilityScore: number;
  contentGapScore: number;
  localFitScore: number;
  totalScore: number;
  topDomains: string[];
  fromCache: boolean;
}

interface CandidateInfo {
  keyword_norm: string;
  pytrends_type: string;
  seen_count: number;
  last_seen_at: string;
  relevance_score: number;
  has_trend_data: boolean;
  interest_90d: number | null;
  interest_12m: number | null;
  theme_id: string;
}

interface CachedScore {
  keyword: string;
  intent_score: number;
  rankability_score: number;
  content_gap_score: number;
  local_fit_score: number;
  total_score: number;
  top_10_domains: string[];
  created_at: string;
}

interface TopicPayload {
  primaryKeyword: string;
  workingTitle: string;
  secondaryKeywords: string[];
  outlineHints: string;
  internalLinks: Array<{ url: string; anchorSuggestion: string }>;
  bucket: string;
  postType: 'weekly' | 'seasonal';
  themeId: string;
  selectionReasoning: string;
  keywordNorm: string;
  classification: string;
  candidatePoolCount: number;
  serpCacheHits: number;
  serpApiCalls: number;
}

interface AutomationRunLog {
  triggered_by: 'cron' | 'manual_test';
  selector_name: 'weekly' | 'seasonal';
  run_started_at: string;
  run_finished_at?: string;
  candidate_pool_count: number;
  candidate_list: CandidateInfo[];
  active_themes: string[];
  serp_cache_hits_count: number;
  serp_api_calls_count: number;
  serp_scores_by_candidate: Array<{
    keyword_norm: string;
    theme_id: string;
    total: number;
    intent: number;
    rankability: number;
    gap: number;
    local: number;
    from_cache: boolean;
  }>;
  winner_keyword_norm: string | null;
  winner_theme_id: string | null;
  winner_score: number | null;
  why_winner: string;
  fallback_used: 'none' | 'seed_phrase';
  fallback_reason: string | null;
}

// Check if a theme is active for the current date
function isThemeActive(theme: SeasonalTheme): boolean {
  const now = new Date();
  const currentMmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const fromDate = theme.active_from_mmdd;
  const toDate = theme.active_to_mmdd;
  
  // Handle year-crossing themes (e.g., 11-01 to 02-15)
  if (fromDate > toDate) {
    return currentMmdd >= fromDate || currentMmdd <= toDate;
  }
  
  return currentMmdd >= fromDate && currentMmdd <= toDate;
}

// Calculate intent score (0-40)
function calculateIntentScore(keyword: string): number {
  const kw = keyword.toLowerCase();
  let score = 0;
  for (const modifier of INTENT_MODIFIERS) {
    if (kw.includes(modifier)) {
      score += 10;
    }
  }
  return Math.min(score, 40);
}

// Calculate rankability from SERP results (0-40)
function calculateRankabilityScore(domains: string[]): number {
  const megaCount = domains.filter(d => 
    MEGA_AUTHORITIES.some(auth => d.includes(auth))
  ).length;
  
  if (megaCount >= 6) return 5;
  if (megaCount >= 4) return 15;
  if (megaCount >= 2) return 25;
  return 40;
}

// Calculate content gap score (0-10)
function calculateContentGapScore(snippets: string[]): number {
  const avgLength = snippets.reduce((sum, s) => sum + (s?.length || 0), 0) / (snippets.length || 1);
  if (avgLength < 100) return 10;
  if (avgLength < 150) return 5;
  return 0;
}

// Calculate local fit score (0-10)
function calculateLocalFitScore(keyword: string): number {
  const kw = keyword.toLowerCase();
  let score = 0;
  for (const term of LOCAL_TERMS) {
    if (kw.includes(term)) {
      score += 3;
    }
  }
  return Math.min(score, 10);
}

// Check if cached score is still valid (within 30 days)
function isCacheValid(cachedScore: CachedScore): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const createdAt = new Date(cachedScore.created_at);
  return createdAt >= thirtyDaysAgo;
}

// Score a keyword using DataForSEO (with 30-day cache reuse)
async function scoreKeywordWithSerp(
  keyword: string,
  keywordNorm: string,
  supabase: any,
  dataForSeoLogin: string | undefined,
  dataForSeoPassword: string | undefined
): Promise<SerpScore> {
  // First check cache (30-day validity)
  const { data: cachedScores } = await supabase
    .from('serp_scores')
    .select('*')
    .eq('keyword', keywordNorm)
    .eq('provider', 'dataforseo')
    .eq('locale', 'IN-en')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (cachedScores && cachedScores.length > 0 && isCacheValid(cachedScores[0])) {
    console.log(`  Cache HIT for "${keywordNorm}"`);
    const cached = cachedScores[0];
    return {
      keyword,
      keywordNorm,
      intentScore: cached.intent_score,
      rankabilityScore: cached.rankability_score,
      contentGapScore: cached.content_gap_score,
      localFitScore: cached.local_fit_score,
      totalScore: cached.total_score,
      topDomains: cached.top_10_domains || [],
      fromCache: true,
    };
  }
  
  console.log(`  Cache MISS for "${keywordNorm}" - calling SERP API`);
  
  const intentScore = calculateIntentScore(keyword);
  const localFitScore = calculateLocalFitScore(keyword);
  
  let rankabilityScore = 20;
  let contentGapScore = 5;
  let topDomains: string[] = [];
  let serpSnapshot: any = null;
  
  // Try DataForSEO first
  if (dataForSeoLogin && dataForSeoPassword) {
    try {
      const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${dataForSeoLogin}:${dataForSeoPassword}`),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          keyword: keyword,
          location_name: 'India',
          language_name: 'English',
          depth: 10,
        }]),
      });
      
      if (response.ok) {
        const data = await response.json();
        const results = data?.tasks?.[0]?.result?.[0]?.items || [];
        topDomains = results.slice(0, 10).map((r: any) => r.domain || '');
        const snippets = results.slice(0, 10).map((r: any) => r.description || '');
        
        rankabilityScore = calculateRankabilityScore(topDomains);
        contentGapScore = calculateContentGapScore(snippets);
        
        serpSnapshot = results.slice(0, 10).map((r: any) => ({
          domain: r.domain,
          title: r.title?.substring(0, 100),
        }));
      }
    } catch (error) {
      console.error('DataForSEO error:', error);
    }
  }
  
  const totalScore = intentScore + rankabilityScore + contentGapScore + localFitScore;
  
  // Cache the new score (upsert)
  try {
    await supabase.from('serp_scores').upsert({
      keyword: keywordNorm,
      provider: 'dataforseo',
      locale: 'IN-en',
      intent_score: intentScore,
      rankability_score: rankabilityScore,
      content_gap_score: contentGapScore,
      local_fit_score: localFitScore,
      total_score: totalScore,
      top_10_domains: topDomains,
      raw_serp_data: serpSnapshot,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'keyword,provider,locale' });
  } catch (e) {
    console.error('Failed to cache SERP score:', e);
  }
  
  return {
    keyword,
    keywordNorm,
    intentScore,
    rankabilityScore,
    contentGapScore,
    localFitScore,
    totalScore,
    topDomains,
    fromCache: false,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const runStartedAt = new Date().toISOString();
  let runLog: AutomationRunLog = {
    triggered_by: 'cron',
    selector_name: 'seasonal',
    run_started_at: runStartedAt,
    candidate_pool_count: 0,
    candidate_list: [],
    active_themes: [],
    serp_cache_hits_count: 0,
    serp_api_calls_count: 0,
    serp_scores_by_candidate: [],
    winner_keyword_norm: null,
    winner_theme_id: null,
    winner_score: null,
    why_winner: '',
    fallback_used: 'none',
    fallback_reason: null,
  };

  try {
    // Check if triggered manually
    const url = new URL(req.url);
    if (url.searchParams.get('test') === 'true' || url.searchParams.get('manual') === 'true') {
      runLog.triggered_by = 'manual_test';
    }
    
    console.log('Seasonal Selector: Starting...');
    console.log(`Triggered by: ${runLog.triggered_by}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dataForSeoLogin = Deno.env.get('DATAFORSEO_LOGIN');
    const dataForSeoPassword = Deno.env.get('DATAFORSEO_PASSWORD');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create initial automation run record
    const { data: runRecord } = await supabase
      .from('automation_runs')
      .insert({
        run_type: 'seasonal_selector',
        status: 'started',
        started_at: runStartedAt,
      })
      .select()
      .single();
    
    const runId = runRecord?.id;
    
    // Step 1: Get active seasonal themes
    const { data: allThemes } = await supabase
      .from('seasonal_calendar')
      .select('*')
      .eq('is_active', true);
    
    const activeThemes = (allThemes || []).filter(isThemeActive) as SeasonalTheme[];
    runLog.active_themes = activeThemes.map(t => t.theme_id);
    
    console.log(`Found ${activeThemes.length} active seasonal themes: ${runLog.active_themes.join(', ')}`);
    
    if (activeThemes.length === 0) {
      // No active themes - skip this Wednesday
      runLog.run_finished_at = new Date().toISOString();
      runLog.why_winner = 'Skipped: No active seasonal themes for current date';
      
      await supabase
        .from('automation_runs')
        .update({
          status: 'skipped',
          completed_at: runLog.run_finished_at,
          log_data: runLog,
        })
        .eq('id', runId);
      
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'No active seasonal themes',
          runLog,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Step 2: Get trend candidates matching seasonal theme seed phrases
    type CandidateWithScore = { theme: SeasonalTheme; keyword: string; keywordNorm: string; score: SerpScore; candidateInfo: CandidateInfo };
    let allCandidates: CandidateWithScore[] = [];
    const scoredNorms = new Set<string>();
    
    for (const theme of activeThemes) {
      const seedPhrases = theme.seed_phrases as string[];
      
      // Look for candidates in trend_candidates from last 7 days that match this theme's seed phrases
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: trendCandidates } = await supabase
        .from('trend_candidates')
        .select('*')
        .eq('is_relevant', true)
        .gte('relevance_score', 20)
        .gte('last_seen_at', sevenDaysAgo.toISOString())
        .order('relevance_score', { ascending: false })
        .limit(10);
      
      // Filter trend candidates to those matching theme seed phrases
      const matchingCandidates = (trendCandidates || []).filter(c => {
        const candidateKw = (c.candidate_keyword || '').toLowerCase();
        return seedPhrases.some(seed => candidateKw.includes(seed.toLowerCase()) || seed.toLowerCase().includes(candidateKw));
      });
      
      // Use matching candidates or fall back to seed phrases directly
      const keywordsToScore = matchingCandidates.length > 0
        ? matchingCandidates.map(c => ({ 
            raw: c.candidate_keyword, 
            norm: c.keyword_norm || normalizeKeyword(c.candidate_keyword),
            fromTrend: true,
            trendData: c,
          }))
        : seedPhrases.slice(0, 5).map(s => ({ 
            raw: s, 
            norm: normalizeKeyword(s),
            fromTrend: false,
            trendData: null,
          }));
      
      for (const { raw: keyword, norm: keywordNorm, fromTrend, trendData } of keywordsToScore) {
        // Skip if already scored this norm
        if (scoredNorms.has(keywordNorm)) continue;
        scoredNorms.add(keywordNorm);
        
        const score = await scoreKeywordWithSerp(
          keyword,
          keywordNorm,
          supabase,
          dataForSeoLogin,
          dataForSeoPassword
        );
        
        if (score.fromCache) {
          runLog.serp_cache_hits_count++;
        } else {
          runLog.serp_api_calls_count++;
        }
        
        const candidateInfo: CandidateInfo = {
          keyword_norm: keywordNorm,
          pytrends_type: trendData?.query_type || 'seed_phrase',
          seen_count: trendData?.seen_count || 0,
          last_seen_at: trendData?.last_seen_at || '',
          relevance_score: trendData?.relevance_score || 0,
          has_trend_data: fromTrend && (trendData?.interest_90d !== null || trendData?.interest_12m !== null),
          interest_90d: trendData?.interest_90d || null,
          interest_12m: trendData?.interest_12m || null,
          theme_id: theme.theme_id,
        };
        
        runLog.candidate_list.push(candidateInfo);
        runLog.serp_scores_by_candidate.push({
          keyword_norm: keywordNorm,
          theme_id: theme.theme_id,
          total: score.totalScore,
          intent: score.intentScore,
          rankability: score.rankabilityScore,
          gap: score.contentGapScore,
          local: score.localFitScore,
          from_cache: score.fromCache,
        });
        
        allCandidates.push({ theme, keyword, keywordNorm, score, candidateInfo });
      }
    }
    
    runLog.candidate_pool_count = allCandidates.length;
    console.log(`SERP scoring: ${runLog.serp_cache_hits_count} cache hits, ${runLog.serp_api_calls_count} API calls`);
    
    // Step 3: Select highest scoring candidate across all active themes
    allCandidates.sort((a, b) => b.score.totalScore - a.score.totalScore);
    
    if (allCandidates.length === 0) {
      // Fallback: use first active theme's first seed phrase
      const fallbackTheme = activeThemes[0];
      const fallbackKeyword = (fallbackTheme.seed_phrases as string[])[0];
      const fallbackNorm = normalizeKeyword(fallbackKeyword);
      
      runLog.fallback_used = 'seed_phrase';
      runLog.fallback_reason = 'No trend candidates matched seasonal themes; using first seed phrase';
      
      allCandidates.push({
        theme: fallbackTheme,
        keyword: fallbackKeyword,
        keywordNorm: fallbackNorm,
        score: {
          keyword: fallbackKeyword,
          keywordNorm: fallbackNorm,
          intentScore: calculateIntentScore(fallbackKeyword),
          rankabilityScore: 20,
          contentGapScore: 5,
          localFitScore: calculateLocalFitScore(fallbackKeyword),
          totalScore: 35,
          topDomains: [],
          fromCache: false,
        },
        candidateInfo: {
          keyword_norm: fallbackNorm,
          pytrends_type: 'seed_phrase',
          seen_count: 0,
          last_seen_at: '',
          relevance_score: 0,
          has_trend_data: false,
          interest_90d: null,
          interest_12m: null,
          theme_id: fallbackTheme.theme_id,
        },
      });
    }
    
    const winner = allCandidates[0];
    
    // Determine classification
    let classification = 'Seasonal Theme';
    if (winner.candidateInfo.has_trend_data) {
      if (winner.candidateInfo.pytrends_type === 'rising') {
        classification = 'Seasonal + Rising Momentum';
      } else if (winner.candidateInfo.interest_90d && winner.candidateInfo.interest_90d > 50) {
        classification = 'Seasonal + Weekly Spike';
      }
    } else if (!winner.candidateInfo.has_trend_data && winner.candidateInfo.pytrends_type === 'seed_phrase') {
      classification = 'Seasonal Theme (no trend data)';
    }
    
    runLog.winner_keyword_norm = winner.keywordNorm;
    runLog.winner_theme_id = winner.theme.theme_id;
    runLog.winner_score = winner.score.totalScore;
    runLog.why_winner = `Highest SERP score (${winner.score.totalScore}/100) among ${allCandidates.length} candidates for theme "${winner.theme.theme_id}". Intent: ${winner.score.intentScore}/40, Rankability: ${winner.score.rankabilityScore}/40, Gap: ${winner.score.contentGapScore}/10, Local: ${winner.score.localFitScore}/10.`;
    
    // Step 4: Build topic payload
    const selectedPayload: TopicPayload = {
      primaryKeyword: winner.keyword,
      workingTitle: `${winner.keyword.charAt(0).toUpperCase() + winner.keyword.slice(1)}: What You Need to Know`,
      secondaryKeywords: allCandidates.slice(1, 4).map(c => c.keyword),
      outlineHints: `Seasonal content for ${winner.theme.theme_id}. Focus on ${winner.keyword}. Theme notes: ${winner.theme.notes || 'N/A'}`,
      internalLinks: [
        { url: '/', anchorSuggestion: 'Wavealokam' },
        { url: '/#rooms', anchorSuggestion: 'beach stay near Varkala' },
      ],
      bucket: winner.theme.bucket,
      postType: 'seasonal',
      themeId: winner.theme.theme_id,
      selectionReasoning: `SEASONAL SELECTION (${winner.theme.theme_id}): Keyword "${winner.keyword}" scored ${winner.score.totalScore}/100. Classification: ${classification}. Active theme window: ${winner.theme.active_from_mmdd} to ${winner.theme.active_to_mmdd}. Evaluated ${allCandidates.length} candidates. SERP cache: ${runLog.serp_cache_hits_count} hits, ${runLog.serp_api_calls_count} API calls.`,
      keywordNorm: winner.keywordNorm,
      classification,
      candidatePoolCount: allCandidates.length,
      serpCacheHits: runLog.serp_cache_hits_count,
      serpApiCalls: runLog.serp_api_calls_count,
    };
    
    console.log(`Selected seasonal topic: ${selectedPayload.primaryKeyword}`);
    
    // Step 5: Call the existing blog generator
    const blogGeneratorUrl = `${supabaseUrl}/functions/v1/generate-blog-post`;
    
    const generateResponse = await fetch(blogGeneratorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        topic: selectedPayload,
        trigger: 'seasonal_selector',
        runMetadata: runLog,
      }),
    });
    
    const generateResult = await generateResponse.json();
    
    if (!generateResponse.ok) {
      throw new Error(generateResult.error || 'Blog generation failed');
    }
    
    // Step 6: Record in post_history
    await supabase.from('post_history').insert({
      publish_date: new Date().toISOString().split('T')[0],
      publish_day: 'wednesday',
      post_type: 'seasonal',
      theme_id: winner.theme.theme_id,
      primary_keyword: selectedPayload.primaryKeyword,
      keyword_norm: selectedPayload.keywordNorm,
      bucket: selectedPayload.bucket,
      title: generateResult.post?.title || selectedPayload.workingTitle,
      url: generateResult.post?.slug ? `/blog/${generateResult.post.slug}` : null,
      blog_post_id: generateResult.post?.id || null,
      selection_meta: {
        reasoning: selectedPayload.selectionReasoning,
        topScores: allCandidates.slice(0, 5).map(c => ({
          keyword_norm: c.keywordNorm,
          theme_id: c.theme.theme_id,
          total: c.score.totalScore,
          intent: c.score.intentScore,
          rankability: c.score.rankabilityScore,
          gap: c.score.contentGapScore,
          local: c.score.localFitScore,
        })),
        candidatesEvaluated: allCandidates.length,
        activeThemes: runLog.active_themes,
        cacheHits: runLog.serp_cache_hits_count,
        cacheMisses: runLog.serp_api_calls_count,
        classification,
      },
    });
    
    // Finalize run log
    runLog.run_finished_at = new Date().toISOString();
    
    // Update automation run with full log data
    await supabase
      .from('automation_runs')
      .update({
        status: 'success',
        selected_keyword: selectedPayload.primaryKeyword,
        selected_bucket: selectedPayload.bucket,
        candidates_found: allCandidates.length,
        completed_at: runLog.run_finished_at,
        log_data: runLog,
      })
      .eq('id', runId);
    
    return new Response(
      JSON.stringify({
        success: true,
        topic: selectedPayload.primaryKeyword,
        bucket: selectedPayload.bucket,
        themeId: winner.theme.theme_id,
        post: generateResult.post,
        runLog,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Seasonal Selector error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    runLog.run_finished_at = new Date().toISOString();
    
    return new Response(
      JSON.stringify({ error: errorMessage, runLog }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
