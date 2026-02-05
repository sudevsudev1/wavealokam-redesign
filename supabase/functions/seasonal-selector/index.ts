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
  intentScore: number;
  rankabilityScore: number;
  contentGapScore: number;
  localFitScore: number;
  totalScore: number;
  topDomains: string[];
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
      intentScore: cached.intent_score,
      rankabilityScore: cached.rankability_score,
      contentGapScore: cached.content_gap_score,
      localFitScore: cached.local_fit_score,
      totalScore: cached.total_score,
      topDomains: cached.top_10_domains || [],
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
    intentScore,
    rankabilityScore,
    contentGapScore,
    localFitScore,
    totalScore,
    topDomains,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Seasonal Selector: Starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dataForSeoLogin = Deno.env.get('DATAFORSEO_LOGIN');
    const dataForSeoPassword = Deno.env.get('DATAFORSEO_PASSWORD');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Log automation run
    const { data: runLog } = await supabase
      .from('automation_runs')
      .insert({
        run_type: 'seasonal_selector',
        status: 'started',
      })
      .select()
      .single();
    
    const runId = runLog?.id;
    
    // Step 1: Get active seasonal themes
    const { data: allThemes } = await supabase
      .from('seasonal_calendar')
      .select('*')
      .eq('is_active', true);
    
    const activeThemes = (allThemes || []).filter(isThemeActive);
    
    console.log(`Found ${activeThemes.length} active seasonal themes`);
    
    if (activeThemes.length === 0) {
      // No active themes - skip this Wednesday
      await supabase
        .from('automation_runs')
        .update({
          status: 'skipped',
          completed_at: new Date().toISOString(),
          log_data: { reason: 'No active seasonal themes for current date' },
        })
        .eq('id', runId);
      
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'No active seasonal themes',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Step 2: Get trend candidates matching seasonal theme seed phrases
    let allCandidates: Array<{ theme: SeasonalTheme; keyword: string; keywordNorm: string; score: SerpScore }> = [];
    const scoredNorms = new Set<string>();
    let cacheHits = 0;
    let cacheMisses = 0;
    
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
        ? matchingCandidates.map(c => ({ raw: c.candidate_keyword, norm: c.keyword_norm || normalizeKeyword(c.candidate_keyword) }))
        : seedPhrases.slice(0, 5).map(s => ({ raw: s, norm: normalizeKeyword(s) }));
      
      for (const { raw: keyword, norm: keywordNorm } of keywordsToScore) {
        // Skip if already scored this norm
        if (scoredNorms.has(keywordNorm)) continue;
        scoredNorms.add(keywordNorm);
        
        // Check cache status for logging
        const cachedCheck = await supabase
          .from('serp_scores')
          .select('created_at')
          .eq('keyword', keywordNorm)
          .eq('provider', 'dataforseo')
          .eq('locale', 'IN-en')
          .limit(1);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (cachedCheck.data?.[0] && new Date(cachedCheck.data[0].created_at) >= thirtyDaysAgo) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
        
        const score = await scoreKeywordWithSerp(
          keyword,
          keywordNorm,
          supabase,
          dataForSeoLogin,
          dataForSeoPassword
        );
        
        allCandidates.push({ theme, keyword, keywordNorm, score });
      }
    }
    
    console.log(`SERP scoring: ${cacheHits} cache hits, ${cacheMisses} API calls`);
    
    // Step 3: Select highest scoring candidate across all active themes
    allCandidates.sort((a, b) => b.score.totalScore - a.score.totalScore);
    
    if (allCandidates.length === 0) {
      // Fallback: use first active theme's first seed phrase
      const fallbackTheme = activeThemes[0];
      const fallbackKeyword = (fallbackTheme.seed_phrases as string[])[0];
      const fallbackNorm = normalizeKeyword(fallbackKeyword);
      
      allCandidates.push({
        theme: fallbackTheme,
        keyword: fallbackKeyword,
        keywordNorm: fallbackNorm,
        score: {
          keyword: fallbackKeyword,
          intentScore: calculateIntentScore(fallbackKeyword),
          rankabilityScore: 20,
          contentGapScore: 5,
          localFitScore: calculateLocalFitScore(fallbackKeyword),
          totalScore: 35,
          topDomains: [],
        },
      });
    }
    
    const winner = allCandidates[0];
    
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
      selectionReasoning: `SEASONAL SELECTION (${winner.theme.theme_id}): Keyword "${winner.keyword}" scored ${winner.score.totalScore}/100. Active theme window: ${winner.theme.active_from_mmdd} to ${winner.theme.active_to_mmdd}. Evaluated ${allCandidates.length} candidates. SERP cache: ${cacheHits} hits, ${cacheMisses} API calls.`,
      keywordNorm: winner.keywordNorm,
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
        topScores: allCandidates.slice(0, 5).map(c => c.score),
        candidatesEvaluated: allCandidates.length,
        activeThemes: activeThemes.map(t => t.theme_id),
        cacheHits,
        cacheMisses,
      },
    });
    
    // Update automation run
    await supabase
      .from('automation_runs')
      .update({
        status: 'success',
        selected_keyword: selectedPayload.primaryKeyword,
        selected_bucket: selectedPayload.bucket,
        candidates_found: allCandidates.length,
        completed_at: new Date().toISOString(),
        log_data: {
          selectionReasoning: selectedPayload.selectionReasoning,
          themeId: winner.theme.theme_id,
          blogPostId: generateResult.post?.id,
        },
      })
      .eq('id', runId);
    
    return new Response(
      JSON.stringify({
        success: true,
        topic: selectedPayload.primaryKeyword,
        bucket: selectedPayload.bucket,
        themeId: winner.theme.theme_id,
        post: generateResult.post,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Seasonal Selector error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
