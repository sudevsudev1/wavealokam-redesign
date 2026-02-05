import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize keyword for consistent cache lookups
function normalizeKeyword(keyword: string): string {
  if (!keyword) return "";
  let result = keyword.toLowerCase().trim();
  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ');
  // Strip leading/trailing punctuation
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
  'theguardian.com', 'nytimes.com', 'economictimes.com', 'indiatimes.com'
];

// Local relevance terms
const LOCAL_TERMS = [
  'varkala', 'edava', 'kappil', 'trivandrum', 'thiruvananthapuram', 'kerala',
  'surf lessons', 'boutique', 'beach stay', 'kayaking', 'backwater'
];

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
}

interface CachedScore {
  keyword: string;
  keyword_norm: string;
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
  serp_cache_hits_count: number;
  serp_api_calls_count: number;
  serp_scores_by_candidate: Array<{
    keyword_norm: string;
    total: number;
    intent: number;
    rankability: number;
    gap: number;
    local: number;
    from_cache: boolean;
  }>;
  winner_keyword_norm: string | null;
  winner_score: number | null;
  why_winner: string;
  fallback_used: 'none' | 'evergreen';
  fallback_reason: string | null;
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
  return 40; // Mostly weak sites
}

// Calculate content gap score (0-10)
function calculateContentGapScore(snippets: string[]): number {
  // Heuristic: if snippets are short or don't directly answer the query
  const avgLength = snippets.reduce((sum, s) => sum + (s?.length || 0), 0) / (snippets.length || 1);
  if (avgLength < 100) return 10; // Thin content
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

// Score a keyword using DataForSEO or SerpApi (only if not cached)
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
    console.log(`  Cache HIT for "${keywordNorm}" (scored ${cachedScores[0].created_at})`);
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
  
  let rankabilityScore = 20; // Default
  let contentGapScore = 5;   // Default
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
        
        // Store lightweight snapshot for debugging
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

// Get buckets used in last 28 days
async function getRecentBuckets(supabase: any): Promise<string[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 28);
  
  const { data } = await supabase
    .from('post_history')
    .select('bucket')
    .gte('publish_date', cutoffDate.toISOString().split('T')[0])
    .order('publish_date', { ascending: false });
  
  return data?.map((r: any) => r.bucket) || [];
}

// Select evergreen topic with bucket rotation
async function selectEvergreenFallback(
  supabase: any,
  dataForSeoLogin: string | undefined,
  dataForSeoPassword: string | undefined,
  usedKeywordNorms: Set<string> = new Set()
): Promise<{ payload: TopicPayload; scores: SerpScore[] } | null> {
  const recentBuckets = await getRecentBuckets(supabase);
  
  // Get all active evergreen topics
  const { data: topics } = await supabase
    .from('evergreen_topics')
    .select('*')
    .eq('is_active', true)
    .order('last_used_at', { ascending: true, nullsFirst: true });
  
  if (!topics || topics.length === 0) {
    console.error('No evergreen topics found');
    return null;
  }
  
  // Filter to topics from buckets not used in last 28 days AND keywords not used in last 90 days
  const eligibleTopics = topics.filter((t: any) => {
    const keywordNorm = t.keyword_norm || normalizeKeyword(t.primary_keyword);
    return !recentBuckets.includes(t.bucket) && !usedKeywordNorms.has(keywordNorm);
  });
  
  console.log(`Evergreen fallback: ${eligibleTopics.length} topics eligible (after 28-day bucket + 90-day keyword filter)`);
  
  // If no eligible topics, use least recently used
  const topicsToScore = eligibleTopics.length > 0 ? eligibleTopics.slice(0, 5) : topics.slice(0, 5);
  
  // Score the shortlist with SERP API (with cache reuse)
  let bestTopic = topicsToScore[0];
  let bestScore = 0;
  const scores: SerpScore[] = [];
  
  for (const topic of topicsToScore) {
    const keywordNorm = topic.keyword_norm || normalizeKeyword(topic.primary_keyword);
    const score = await scoreKeywordWithSerp(
      topic.primary_keyword,
      keywordNorm,
      supabase,
      dataForSeoLogin,
      dataForSeoPassword
    );
    
    scores.push(score);
    
    if (score.totalScore > bestScore) {
      bestScore = score.totalScore;
      bestTopic = topic;
    }
  }
  
  const titleIdeas = bestTopic.title_ideas as string[];
  const title = titleIdeas[Math.floor(Math.random() * titleIdeas.length)];
  
  // Map internal_link_focus to actual URLs
  const internalLinkMap: Record<string, { url: string; anchorSuggestion: string }> = {
    'surf': { url: '/#surf-school', anchorSuggestion: 'surf lessons in Varkala' },
    'rooms': { url: '/#rooms', anchorSuggestion: 'beach stay near Varkala' },
    'packages': { url: '/#activities', anchorSuggestion: 'activities and packages' },
    'contact': { url: '/#contact', anchorSuggestion: 'contact us' },
    'activities': { url: '/#activities', anchorSuggestion: 'kayaking and backwater activities' },
  };
  
  const primaryLink = internalLinkMap[bestTopic.internal_link_focus] || internalLinkMap['rooms'];
  const keywordNorm = bestTopic.keyword_norm || normalizeKeyword(bestTopic.primary_keyword);
  
  const cacheHits = scores.filter(s => s.fromCache).length;
  const cacheMisses = scores.filter(s => !s.fromCache).length;
  
  return {
    payload: {
      primaryKeyword: bestTopic.primary_keyword,
      workingTitle: title,
      secondaryKeywords: (bestTopic.seed_phrases as string[]).slice(0, 3),
      outlineHints: `Focus on practical information for ${bestTopic.primary_keyword}. Include beginner tips, local insights, and actionable advice.`,
      internalLinks: [
        { url: '/', anchorSuggestion: 'Wavealokam' },
        primaryLink,
      ],
      bucket: bestTopic.bucket,
      postType: 'weekly',
      selectionReasoning: `EVERGREEN FALLBACK: Selected from bucket "${bestTopic.bucket}" (not used in last 28 days). Primary keyword: "${bestTopic.primary_keyword}". SERP score: ${bestScore}/100.`,
      keywordNorm,
      classification: 'Evergreen Stable',
      candidatePoolCount: topicsToScore.length,
      serpCacheHits: cacheHits,
      serpApiCalls: cacheMisses,
    },
    scores,
  };
}

// Classify trend candidate based on pytrends data
function classifyTrendCandidate(candidate: any): string {
  const interest90d = candidate.interest_90d;
  const interest12m = candidate.interest_12m;
  const queryType = candidate.query_type;
  
  // Check if we have actual trend data
  const hasTrendData = interest90d !== null || interest12m !== null;
  
  if (!hasTrendData) {
    return 'Trend data unavailable';
  }
  
  // Classification based on pytrends signals
  if (queryType === 'rising' || (interest90d && interest90d > 70)) {
    return 'Rising Momentum';
  }
  
  if (queryType === 'top' && interest90d && interest90d > 50) {
    return 'Weekly Spike';
  }
  
  if (interest12m && interest12m > interest90d) {
    return 'Seasonal Peak';
  }
  
  return 'Evergreen Stable';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const runStartedAt = new Date().toISOString();
  let runLog: AutomationRunLog = {
    triggered_by: 'cron',
    selector_name: 'weekly',
    run_started_at: runStartedAt,
    candidate_pool_count: 0,
    candidate_list: [],
    serp_cache_hits_count: 0,
    serp_api_calls_count: 0,
    serp_scores_by_candidate: [],
    winner_keyword_norm: null,
    winner_score: null,
    why_winner: '',
    fallback_used: 'none',
    fallback_reason: null,
  };

  try {
    // Check if triggered manually (via query param)
    const url = new URL(req.url);
    if (url.searchParams.get('test') === 'true' || url.searchParams.get('manual') === 'true') {
      runLog.triggered_by = 'manual_test';
    }
    
    console.log('Weekly Selector: Starting...');
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
        run_type: 'weekly_selector',
        status: 'started',
        started_at: runStartedAt,
      })
      .select()
      .single();
    
    const runId = runRecord?.id;
    
    // Step 0: Check keywords used in last 90 days to avoid duplicates
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data: recentKeywords } = await supabase
      .from('post_history')
      .select('keyword_norm')
      .gte('publish_date', ninetyDaysAgo.toISOString().split('T')[0]);
    
    const usedKeywordNorms = new Set((recentKeywords || []).map((r: any) => r.keyword_norm).filter(Boolean));
    console.log(`Keywords used in last 90 days: ${usedKeywordNorms.size}`);
    
    // Step 1: Get trend candidates from last 7 days (regardless of is_processed)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: candidates } = await supabase
      .from('trend_candidates')
      .select('*')
      .eq('is_relevant', true)
      .gte('relevance_score', 30)
      .gte('last_seen_at', sevenDaysAgo.toISOString())
      .order('relevance_score', { ascending: false })
      .limit(20);
    
    console.log(`Found ${candidates?.length || 0} trend candidates`);
    
    // Filter out candidates whose keyword_norm was used in last 90 days
    const eligibleCandidates = (candidates || []).filter((c: any) => {
      const norm = c.keyword_norm || normalizeKeyword(c.candidate_keyword);
      return !usedKeywordNorms.has(norm);
    });
    
    console.log(`Eligible candidates after 90-day filter: ${eligibleCandidates.length}`);
    
    // Dedupe by keyword_norm
    const seenNorms = new Set<string>();
    const dedupedCandidates: any[] = [];
    for (const candidate of eligibleCandidates.slice(0, 15)) {
      const keywordNorm = candidate.keyword_norm || normalizeKeyword(candidate.candidate_keyword);
      if (!seenNorms.has(keywordNorm)) {
        seenNorms.add(keywordNorm);
        dedupedCandidates.push({ ...candidate, keywordNorm });
      }
    }
    
    // Build candidate info list for logging
    runLog.candidate_list = dedupedCandidates.map((c: any) => ({
      keyword_norm: c.keywordNorm || normalizeKeyword(c.candidate_keyword),
      pytrends_type: c.query_type || 'unknown',
      seen_count: c.seen_count || 1,
      last_seen_at: c.last_seen_at || c.created_at,
      relevance_score: c.relevance_score || 0,
      has_trend_data: c.interest_90d !== null || c.interest_12m !== null,
      interest_90d: c.interest_90d,
      interest_12m: c.interest_12m,
    }));
    runLog.candidate_pool_count = dedupedCandidates.length;
    
    let selectedPayload: TopicPayload | null = null;
    let topScores: SerpScore[] = [];
    
    if (dedupedCandidates.length > 0) {
      // Score candidates with SERP API
      for (const candidate of dedupedCandidates.slice(0, 10)) {
        const keywordNorm = candidate.keywordNorm;
        
        const score = await scoreKeywordWithSerp(
          candidate.candidate_keyword,
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
        
        topScores.push(score);
        
        // Log SERP score for this candidate
        runLog.serp_scores_by_candidate.push({
          keyword_norm: keywordNorm,
          total: score.totalScore,
          intent: score.intentScore,
          rankability: score.rankabilityScore,
          gap: score.contentGapScore,
          local: score.localFitScore,
          from_cache: score.fromCache,
        });
      }
      
      console.log(`SERP scoring: ${runLog.serp_cache_hits_count} cache hits, ${runLog.serp_api_calls_count} API calls`);
      
      // Select highest scoring candidate
      topScores.sort((a, b) => b.totalScore - a.totalScore);
      const winner = topScores[0];
      
      if (winner && winner.totalScore >= 30) {
        const winnerNorm = winner.keywordNorm;
        
        // Find the original candidate to get classification
        const winnerCandidate = dedupedCandidates.find(c => c.keywordNorm === winnerNorm);
        const classification = winnerCandidate ? classifyTrendCandidate(winnerCandidate) : 'Trend data unavailable';
        
        runLog.winner_keyword_norm = winnerNorm;
        runLog.winner_score = winner.totalScore;
        runLog.why_winner = `Highest SERP score (${winner.totalScore}/100) among ${dedupedCandidates.length} candidates. Intent: ${winner.intentScore}/40, Rankability: ${winner.rankabilityScore}/40, Gap: ${winner.contentGapScore}/10, Local: ${winner.localFitScore}/10.`;
        runLog.fallback_used = 'none';
        
        // Map to topic payload
        selectedPayload = {
          primaryKeyword: winner.keyword,
          workingTitle: `${winner.keyword.charAt(0).toUpperCase() + winner.keyword.slice(1)}: A Practical Guide`,
          secondaryKeywords: topScores.slice(1, 4).map(s => s.keyword),
          outlineHints: `Focus on ${winner.keyword}. High intent score (${winner.intentScore}/40), good rankability (${winner.rankabilityScore}/40).`,
          internalLinks: [
            { url: '/', anchorSuggestion: 'Wavealokam' },
            { url: winner.keyword.includes('surf') ? '/#surf-school' : '/#rooms', 
              anchorSuggestion: winner.keyword.includes('surf') ? 'surf lessons in Varkala' : 'beach stay near Varkala' },
          ],
          bucket: winner.keyword.includes('surf') ? 'TREND_SURF' : 
                  winner.keyword.includes('stay') ? 'TREND_STAY' : 'TREND_GENERAL',
          postType: 'weekly',
          selectionReasoning: `TREND-BASED SELECTION: Keyword "${winner.keyword}" scored ${winner.totalScore}/100 (Intent: ${winner.intentScore}, Rankability: ${winner.rankabilityScore}, Gap: ${winner.contentGapScore}, Local: ${winner.localFitScore}). Classification: ${classification}. Evaluated ${dedupedCandidates.length} candidates. SERP cache: ${runLog.serp_cache_hits_count} hits, ${runLog.serp_api_calls_count} API calls.`,
          keywordNorm: winnerNorm,
          classification,
          candidatePoolCount: dedupedCandidates.length,
          serpCacheHits: runLog.serp_cache_hits_count,
          serpApiCalls: runLog.serp_api_calls_count,
        };
      }
    }
    
    // Step 4: Fallback to evergreen if no valid trend candidate
    if (!selectedPayload) {
      console.log('No valid trend candidates, falling back to evergreen...');
      runLog.fallback_used = 'evergreen';
      runLog.fallback_reason = dedupedCandidates.length === 0 
        ? 'No trend candidates found in last 7 days (after 90-day keyword filter)'
        : `${dedupedCandidates.length} candidates found but none scored >= 30`;
      
      const evergreenResult = await selectEvergreenFallback(supabase, dataForSeoLogin, dataForSeoPassword, usedKeywordNorms);
      
      if (evergreenResult) {
        selectedPayload = evergreenResult.payload;
        topScores = evergreenResult.scores;
        
        runLog.serp_cache_hits_count += evergreenResult.scores.filter(s => s.fromCache).length;
        runLog.serp_api_calls_count += evergreenResult.scores.filter(s => !s.fromCache).length;
        
        // Add evergreen scores to log
        for (const score of evergreenResult.scores) {
          runLog.serp_scores_by_candidate.push({
            keyword_norm: score.keywordNorm,
            total: score.totalScore,
            intent: score.intentScore,
            rankability: score.rankabilityScore,
            gap: score.contentGapScore,
            local: score.localFitScore,
            from_cache: score.fromCache,
          });
        }
        
        runLog.winner_keyword_norm = selectedPayload.keywordNorm;
        runLog.winner_score = topScores.find(s => s.keywordNorm === selectedPayload?.keywordNorm)?.totalScore || 0;
        runLog.why_winner = `Evergreen fallback: ${selectedPayload.bucket}. ${runLog.fallback_reason}`;
      }
    }
    
    if (!selectedPayload) {
      throw new Error('Failed to select any topic');
    }
    
    console.log(`Selected topic: ${selectedPayload.primaryKeyword}`);
    
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
        trigger: 'weekly_selector',
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
      publish_day: 'sunday',
      post_type: 'weekly',
      primary_keyword: selectedPayload.primaryKeyword,
      keyword_norm: selectedPayload.keywordNorm,
      bucket: selectedPayload.bucket,
      title: generateResult.post?.title || selectedPayload.workingTitle,
      url: generateResult.post?.slug ? `/blog/${generateResult.post.slug}` : null,
      blog_post_id: generateResult.post?.id || null,
      selection_meta: {
        reasoning: selectedPayload.selectionReasoning,
        topScores: topScores.slice(0, 5).map(s => ({
          keyword_norm: s.keywordNorm,
          total: s.totalScore,
          intent: s.intentScore,
          rankability: s.rankabilityScore,
          gap: s.contentGapScore,
          local: s.localFitScore,
        })),
        candidatesEvaluated: runLog.candidate_pool_count,
        cacheHits: runLog.serp_cache_hits_count,
        cacheMisses: runLog.serp_api_calls_count,
        classification: selectedPayload.classification,
        fallbackUsed: runLog.fallback_used,
      },
    });
    
    // Update evergreen topic usage if used
    if (runLog.fallback_used === 'evergreen') {
      await supabase
        .from('evergreen_topics')
        .update({ 
          use_count: supabase.rpc('increment_use_count'), 
          last_used_at: new Date().toISOString() 
        })
        .eq('primary_keyword', selectedPayload.primaryKeyword);
    }
    
    // Finalize run log
    runLog.run_finished_at = new Date().toISOString();
    
    // Update automation run with full log data
    await supabase
      .from('automation_runs')
      .update({
        status: 'success',
        selected_keyword: selectedPayload.primaryKeyword,
        selected_bucket: selectedPayload.bucket,
        candidates_found: runLog.candidate_pool_count,
        completed_at: runLog.run_finished_at,
        log_data: runLog,
      })
      .eq('id', runId);
    
    return new Response(
      JSON.stringify({
        success: true,
        topic: selectedPayload.primaryKeyword,
        bucket: selectedPayload.bucket,
        post: generateResult.post,
        runLog,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Weekly Selector error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    runLog.run_finished_at = new Date().toISOString();
    
    return new Response(
      JSON.stringify({ error: errorMessage, runLog }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
