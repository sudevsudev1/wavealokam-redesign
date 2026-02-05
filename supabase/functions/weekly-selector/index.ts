// v2.0.0 - Forensic Trace + Telemetry
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// FORENSIC TRACE TYPES - Full Pipeline Visibility
// ============================================================================

// Relevance filter reason codes
type RelevanceFilterReason = 
  | 'GEO_IRRELEVANT' 
  | 'COMPETITOR_OR_BRAND' 
  | 'NON_TRAVEL_INTENT' 
  | 'TOO_GENERIC' 
  | 'NON_SERVICE_MATCH'
  | 'LOW_RELEVANCE_SCORE';

// Trend metrics status (tri-state)
type TrendMetricsStatus = 'OK' | 'UNAVAILABLE' | 'ERROR';

interface SeedExpansionResult {
  seed_term: string;
  seed_bucket: string;
  pytrends_method: string;
  timeframe: string;
  geo: string;
  raw_results: Array<{
    keyword: string;
    type: string;
    value: string | number;
    rank: number;
  }>;
  result_count: number;
}

interface NormalizationReport {
  rules_applied: string[];
  duplicates_detected: Array<{ keyword: string; count: number; from_seeds: string[] }>;
  deduped_pool_size: number;
}

interface RelevanceFilterReport {
  eliminated: Array<{ keyword: string; reason: RelevanceFilterReason; details?: string }>;
  reason_totals: Record<RelevanceFilterReason, number>;
  remaining_pool: string[];
}

interface RecencyExclusion {
  keyword: string;
  reason: 'recent_post' | 'recent_bucket' | 'serp_cache_reuse';
  post_slug?: string;
  published_at?: string;
  bucket?: string;
  last_used_at?: string;
  scored_at?: string;
}

interface RecencyReport {
  excluded_recent_posts: RecencyExclusion[];
  excluded_recent_bucket: RecencyExclusion[];
  cache_reuse_hits: Array<{ keyword: string; scored_at: string; cached_score: number }>;
  remaining_for_scoring: string[];
}

interface TrendMetricsResult {
  keyword_norm: string;
  interest_7d: number | null;
  interest_90d: number | null;
  interest_12m: number | null;
  momentum_7d: number | null;
  momentum_90d: number | null;
  seasonal_position: string | null;
  status: TrendMetricsStatus;
  error_message?: string;
  error_step?: string;
}

interface SerpScoringResult {
  keyword_norm: string;
  from_cache: boolean;
  cached_at?: string;
  intent_score: number;
  intent_explanation: string;
  rankability_score: number;
  rankability_explanation: string;
  gap_score: number;
  gap_explanation: string;
  local_score: number;
  local_explanation: string;
  total_score: number;
  top_domains?: string[];
}

interface FinalCandidateRow {
  keyword_norm: string;
  trend_7d: number | null;
  trend_90d: number | null;
  trend_12m: number | null;
  trend_status: TrendMetricsStatus;
  serp_score: number;
  cache_hit: boolean;
  why_not_chosen?: string;
}

interface ForensicTrace {
  // Section 1: Run Header
  run_id: string | null;
  triggered_by: 'cron' | 'manual_test';
  selector: 'weekly-selector' | 'seasonal-selector';
  time_started_utc: string;
  time_finished_utc?: string;
  environment: string;
  config_snapshot: {
    geo: string;
    timeframe: string;
    category: string;
    search_type: string;
    repetition_window_days: number;
    serp_cache_window_days: number;
  };
  
  // Section 2: Seed Expansion Output
  seed_expansion_results: SeedExpansionResult[];
  
  // Section 3: Normalization + Dedupe
  normalization_report: NormalizationReport;
  
  // Section 4: Relevance Filtering
  relevance_filter_report: RelevanceFilterReport;
  
  // Section 5: Recency Exclusions
  recency_report: RecencyReport;
  
  // Section 6: Trend Metrics Enrichment
  trend_metrics_results: TrendMetricsResult[];
  trend_api_calls_count: number;
  
  // Section 7: SERP Scoring
  serp_cache_hits_list: Array<{ keyword: string; scored_at: string; cached_score: number }>;
  serp_cache_misses_list: string[];
  dataforseo_api_calls_count: number;
  serp_scoring_results: SerpScoringResult[];
  
  // Section 8: Final Selection
  final_selection_table: FinalCandidateRow[];
  winner_keyword_norm: string | null;
  winner_score: number | null;
  winner_classification: string;
  winner_source_seed: string | null;
  winner_source_bucket: string | null;
  decision_rule: string;
  decision_path: string;
  
  // Fallback info
  fallback_used: 'none' | 'evergreen';
  fallback_reason: string | null;
}

interface CandidateInfo {
  keyword_norm: string;
  keyword_raw: string;
  pytrends_type: string;
  seen_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  relevance_score: number;
  source_seed: string | null;
  source_seed_bucket: string | null;
  source_method: string;
  trend_metrics_status: TrendMetricsStatus;
  interest_7d: number | null;
  interest_90d: number | null;
  interest_12m: number | null;
}

interface SerpScore {
  keyword: string;
  keywordNorm: string;
  intentScore: number;
  intentExplanation: string;
  rankabilityScore: number;
  rankabilityExplanation: string;
  contentGapScore: number;
  gapExplanation: string;
  localFitScore: number;
  localExplanation: string;
  totalScore: number;
  topDomains: string[];
  fromCache: boolean;
  cachedAt?: string;
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
}

// ============================================================================
// NORMALIZATION & HELPERS
// ============================================================================

function normalizeKeyword(keyword: string): string {
  if (!keyword) return "";
  let result = keyword.toLowerCase().trim();
  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ');
  // Strip leading/trailing punctuation
  result = result.replace(/^[^\w\s]+|[^\w\s]+$/g, '');
  // Remove curly quotes
  result = result.replace(/['']/g, "'").replace(/[""]/g, '"');
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

// Irrelevance patterns for filtering
const IRRELEVANCE_PATTERNS = {
  GEO_IRRELEVANT: ['vietnam', 'thailand', 'bali', 'philippines', 'sri lanka surf', 'maldives', 'goa surf', 'mumbai'],
  COMPETITOR_OR_BRAND: ['cafe pranaa', 'zostel', 'hostelworld', 'oyo', 'treebo'],
  NON_TRAVEL_INTENT: ['celebrity', 'movie', 'news', 'politics', 'cricket', 'ipl', 'election'],
  TOO_GENERIC: ['weather', 'climate', 'temperature', 'news today', 'latest'],
  NON_SERVICE_MATCH: ['jobs', 'careers', 'salary', 'recruitment', 'internship', 'real estate', 'property'],
};

// Seed buckets
const SEED_BUCKETS: Record<string, string[]> = {
  Surfing: ['surf', 'surfing', 'wave', 'surf lessons', 'surf school', 'surf camp'],
  Stay: ['stay', 'resort', 'hotel', 'homestay', 'accommodation', 'bed and breakfast', 'boutique'],
  Varkala: ['varkala', 'cliff', 'edava', 'kappil'],
  Activities: ['kayak', 'yoga', 'ayurveda', 'massage', 'backwater', 'activity'],
  Food: ['food', 'restaurant', 'cafe', 'seafood', 'toddy'],
  Kerala: ['kerala', 'trivandrum', 'itinerary', 'travel guide', 'weekend'],
};

function inferSeedBucket(keyword: string, seedKeyword: string | null): string {
  const combined = (keyword + ' ' + (seedKeyword || '')).toLowerCase();
  for (const [bucket, terms] of Object.entries(SEED_BUCKETS)) {
    if (terms.some(t => combined.includes(t))) {
      return bucket;
    }
  }
  return 'General';
}

function inferSourceMethod(candidate: any): string {
  const sourceType = candidate.source_type || candidate.query_type;
  if (sourceType === 'rising') return 'pytrends_related_queries';
  if (sourceType === 'top') return 'pytrends_related_queries';
  if (sourceType === 'related_topics') return 'pytrends_related_topics';
  if (sourceType === 'seed_phrase') return 'seasonal_theme_expansion';
  return 'pytrends_related_queries';
}

function checkRelevanceFilter(keyword: string): { passed: boolean; reason?: RelevanceFilterReason; details?: string } {
  const kw = keyword.toLowerCase();
  
  for (const pattern of IRRELEVANCE_PATTERNS.GEO_IRRELEVANT) {
    if (kw.includes(pattern)) return { passed: false, reason: 'GEO_IRRELEVANT', details: `Contains "${pattern}"` };
  }
  for (const pattern of IRRELEVANCE_PATTERNS.COMPETITOR_OR_BRAND) {
    if (kw.includes(pattern)) return { passed: false, reason: 'COMPETITOR_OR_BRAND', details: `Contains "${pattern}"` };
  }
  for (const pattern of IRRELEVANCE_PATTERNS.NON_TRAVEL_INTENT) {
    if (kw.includes(pattern)) return { passed: false, reason: 'NON_TRAVEL_INTENT', details: `Contains "${pattern}"` };
  }
  for (const pattern of IRRELEVANCE_PATTERNS.TOO_GENERIC) {
    if (kw === pattern || (kw.length < 10 && kw.includes(pattern))) return { passed: false, reason: 'TOO_GENERIC', details: `Matches "${pattern}"` };
  }
  for (const pattern of IRRELEVANCE_PATTERNS.NON_SERVICE_MATCH) {
    if (kw.includes(pattern)) return { passed: false, reason: 'NON_SERVICE_MATCH', details: `Contains "${pattern}"` };
  }
  
  return { passed: true };
}

// ============================================================================
// SERP SCORING
// ============================================================================

function calculateIntentScore(keyword: string): { score: number; explanation: string } {
  const kw = keyword.toLowerCase();
  let score = 0;
  const matches: string[] = [];
  for (const modifier of INTENT_MODIFIERS) {
    if (kw.includes(modifier)) {
      score += 10;
      matches.push(modifier);
    }
  }
  score = Math.min(score, 40);
  const explanation = matches.length > 0 
    ? `Matched modifiers: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? ` (+${matches.length - 3} more)` : ''}`
    : 'No high-intent modifiers detected';
  return { score, explanation };
}

function calculateRankabilityScore(domains: string[]): { score: number; explanation: string } {
  const megaCount = domains.filter(d => 
    MEGA_AUTHORITIES.some(auth => d.includes(auth))
  ).length;
  
  let score: number;
  let explanation: string;
  
  if (megaCount >= 6) {
    score = 5;
    explanation = `SERP dominated by ${megaCount} mega-authorities (booking.com, tripadvisor, etc.)`;
  } else if (megaCount >= 4) {
    score = 15;
    explanation = `${megaCount} mega-authorities in top 10, moderate competition`;
  } else if (megaCount >= 2) {
    score = 25;
    explanation = `Only ${megaCount} mega-authorities, good opportunity`;
  } else {
    score = 40;
    explanation = `Minimal mega-authority presence (${megaCount}), excellent rankability`;
  }
  
  return { score, explanation };
}

function calculateContentGapScore(snippets: string[]): { score: number; explanation: string } {
  const avgLength = snippets.reduce((sum, s) => sum + (s?.length || 0), 0) / (snippets.length || 1);
  
  if (avgLength < 100) {
    return { score: 10, explanation: `Thin content detected (avg ${Math.round(avgLength)} chars), big gap opportunity` };
  }
  if (avgLength < 150) {
    return { score: 5, explanation: `Moderate content (avg ${Math.round(avgLength)} chars), some gap` };
  }
  return { score: 0, explanation: `Dense existing content (avg ${Math.round(avgLength)} chars), minimal gap` };
}

function calculateLocalFitScore(keyword: string): { score: number; explanation: string } {
  const kw = keyword.toLowerCase();
  let score = 0;
  const matches: string[] = [];
  for (const term of LOCAL_TERMS) {
    if (kw.includes(term)) {
      score += 3;
      matches.push(term);
    }
  }
  score = Math.min(score, 10);
  const explanation = matches.length > 0
    ? `Local terms: ${matches.join(', ')}`
    : 'No explicit local terms (generic query)';
  return { score, explanation };
}

function isCacheValid(createdAt: string, windowDays: number = 30): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  return new Date(createdAt) >= cutoff;
}

async function scoreKeywordWithSerp(
  keyword: string,
  keywordNorm: string,
  supabase: any,
  dataForSeoLogin: string | undefined,
  dataForSeoPassword: string | undefined,
  trace: ForensicTrace
): Promise<SerpScore> {
  // Check cache first
  const { data: cachedScores } = await supabase
    .from('serp_scores')
    .select('*')
    .eq('keyword', keywordNorm)
    .eq('provider', 'dataforseo')
    .eq('locale', 'IN-en')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (cachedScores && cachedScores.length > 0 && isCacheValid(cachedScores[0].created_at)) {
    const cached = cachedScores[0];
    console.log(`  Cache HIT for "${keywordNorm}" (scored ${cached.created_at})`);
    
    trace.serp_cache_hits_list.push({
      keyword: keywordNorm,
      scored_at: cached.created_at,
      cached_score: cached.total_score,
    });
    
    return {
      keyword,
      keywordNorm,
      intentScore: cached.intent_score,
      intentExplanation: 'Cached',
      rankabilityScore: cached.rankability_score,
      rankabilityExplanation: 'Cached',
      contentGapScore: cached.content_gap_score,
      gapExplanation: 'Cached',
      localFitScore: cached.local_fit_score,
      localExplanation: 'Cached',
      totalScore: cached.total_score,
      topDomains: cached.top_10_domains || [],
      fromCache: true,
      cachedAt: cached.created_at,
    };
  }
  
  console.log(`  Cache MISS for "${keywordNorm}" - calling SERP API`);
  trace.serp_cache_misses_list.push(keywordNorm);
  
  const intentResult = calculateIntentScore(keyword);
  const localResult = calculateLocalFitScore(keyword);
  
  let rankabilityResult = { score: 20, explanation: 'Default (API not called)' };
  let gapResult = { score: 5, explanation: 'Default (API not called)' };
  let topDomains: string[] = [];
  let serpSnapshot: any = null;
  
  // Call DataForSEO if credentials available
  if (dataForSeoLogin && dataForSeoPassword) {
    try {
      trace.dataforseo_api_calls_count++;
      
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
        
        rankabilityResult = calculateRankabilityScore(topDomains);
        gapResult = calculateContentGapScore(snippets);
        
        serpSnapshot = results.slice(0, 10).map((r: any) => ({
          domain: r.domain,
          title: r.title?.substring(0, 100),
        }));
      }
    } catch (error) {
      console.error('DataForSEO error:', error);
      rankabilityResult.explanation = `API error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }
  }
  
  const totalScore = intentResult.score + rankabilityResult.score + gapResult.score + localResult.score;
  
  // Cache the new score
  try {
    await supabase.from('serp_scores').upsert({
      keyword: keywordNorm,
      provider: 'dataforseo',
      locale: 'IN-en',
      intent_score: intentResult.score,
      rankability_score: rankabilityResult.score,
      content_gap_score: gapResult.score,
      local_fit_score: localResult.score,
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
    intentScore: intentResult.score,
    intentExplanation: intentResult.explanation,
    rankabilityScore: rankabilityResult.score,
    rankabilityExplanation: rankabilityResult.explanation,
    contentGapScore: gapResult.score,
    gapExplanation: gapResult.explanation,
    localFitScore: localResult.score,
    localExplanation: localResult.explanation,
    totalScore,
    topDomains,
    fromCache: false,
  };
}

// ============================================================================
// TREND METRICS CLASSIFICATION
// ============================================================================

function classifyTrendCandidate(trendStatus: TrendMetricsStatus, queryType: string, interest90d: number | null, interest12m: number | null): string {
  // If no trend data, cannot claim momentum/spike
  if (trendStatus !== 'OK') {
    return 'Trend data unavailable';
  }
  
  if (queryType === 'rising' || (interest90d && interest90d > 70)) {
    return 'Rising Momentum';
  }
  
  if (queryType === 'top' && interest90d && interest90d > 50) {
    return 'Weekly Spike';
  }
  
  if (interest12m && interest90d && interest12m > interest90d) {
    return 'Seasonal Peak';
  }
  
  return 'Evergreen Stable';
}

// ============================================================================
// EVERGREEN FALLBACK
// ============================================================================

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

async function selectEvergreenFallback(
  supabase: any,
  dataForSeoLogin: string | undefined,
  dataForSeoPassword: string | undefined,
  usedKeywordNorms: Set<string>,
  trace: ForensicTrace
): Promise<{ payload: TopicPayload; scores: SerpScore[]; candidateList: CandidateInfo[] } | null> {
  const recentBuckets = await getRecentBuckets(supabase);
  
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
  
  console.log(`Evergreen fallback: ${eligibleTopics.length} topics eligible`);
  
  const topicsToScore = eligibleTopics.length > 0 ? eligibleTopics.slice(0, 5) : topics.slice(0, 5);
  
  let bestTopic = topicsToScore[0];
  let bestScore = 0;
  const scores: SerpScore[] = [];
  const candidateList: CandidateInfo[] = [];
  
  for (const topic of topicsToScore) {
    const keywordNorm = topic.keyword_norm || normalizeKeyword(topic.primary_keyword);
    const score = await scoreKeywordWithSerp(
      topic.primary_keyword,
      keywordNorm,
      supabase,
      dataForSeoLogin,
      dataForSeoPassword,
      trace
    );
    
    scores.push(score);
    
    candidateList.push({
      keyword_norm: keywordNorm,
      keyword_raw: topic.primary_keyword,
      pytrends_type: 'evergreen',
      seen_count: topic.use_count || 0,
      first_seen_at: topic.created_at,
      last_seen_at: topic.last_used_at,
      relevance_score: 100,
      source_seed: topic.primary_keyword,
      source_seed_bucket: topic.bucket,
      source_method: 'evergreen_library',
      trend_metrics_status: 'UNAVAILABLE',
      interest_7d: null,
      interest_90d: null,
      interest_12m: null,
    });
    
    // Add to final selection table
    trace.final_selection_table.push({
      keyword_norm: keywordNorm,
      trend_7d: null,
      trend_90d: null,
      trend_12m: null,
      trend_status: 'UNAVAILABLE',
      serp_score: score.totalScore,
      cache_hit: score.fromCache,
    });
    
    // Add to SERP scoring results
    trace.serp_scoring_results.push({
      keyword_norm: keywordNorm,
      from_cache: score.fromCache,
      cached_at: score.cachedAt,
      intent_score: score.intentScore,
      intent_explanation: score.intentExplanation,
      rankability_score: score.rankabilityScore,
      rankability_explanation: score.rankabilityExplanation,
      gap_score: score.contentGapScore,
      gap_explanation: score.gapExplanation,
      local_score: score.localFitScore,
      local_explanation: score.localExplanation,
      total_score: score.totalScore,
      top_domains: score.topDomains,
    });
    
    if (score.totalScore > bestScore) {
      bestScore = score.totalScore;
      bestTopic = topic;
    }
  }
  
  const titleIdeas = bestTopic.title_ideas as string[];
  const title = titleIdeas[Math.floor(Math.random() * titleIdeas.length)];
  
  const internalLinkMap: Record<string, { url: string; anchorSuggestion: string }> = {
    'surf': { url: '/#surf-school', anchorSuggestion: 'surf lessons in Varkala' },
    'rooms': { url: '/#rooms', anchorSuggestion: 'beach stay near Varkala' },
    'packages': { url: '/#activities', anchorSuggestion: 'activities and packages' },
    'contact': { url: '/#contact', anchorSuggestion: 'contact us' },
    'activities': { url: '/#activities', anchorSuggestion: 'kayaking and backwater activities' },
  };
  
  const primaryLink = internalLinkMap[bestTopic.internal_link_focus] || internalLinkMap['rooms'];
  const keywordNorm = bestTopic.keyword_norm || normalizeKeyword(bestTopic.primary_keyword);
  
  return {
    payload: {
      primaryKeyword: bestTopic.primary_keyword,
      workingTitle: title,
      secondaryKeywords: (bestTopic.seed_phrases as string[]).slice(0, 3),
      outlineHints: `Focus on practical information for ${bestTopic.primary_keyword}.`,
      internalLinks: [
        { url: '/', anchorSuggestion: 'Wavealokam' },
        primaryLink,
      ],
      bucket: bestTopic.bucket,
      postType: 'weekly',
      selectionReasoning: `EVERGREEN FALLBACK: Bucket "${bestTopic.bucket}". SERP score: ${bestScore}/100.`,
      keywordNorm,
      classification: 'Evergreen Stable',
    },
    scores,
    candidateList,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const runStartedAt = new Date().toISOString();
  
  // Initialize forensic trace
  const trace: ForensicTrace = {
    run_id: null,
    triggered_by: 'cron',
    selector: 'weekly-selector',
    time_started_utc: runStartedAt,
    environment: 'prod',
    config_snapshot: {
      geo: 'IN',
      timeframe: 'last_7_days',
      category: 'Travel',
      search_type: 'related_queries',
      repetition_window_days: 90,
      serp_cache_window_days: 30,
    },
    seed_expansion_results: [],
    normalization_report: {
      rules_applied: ['lowercase', 'trim', 'collapse_spaces', 'strip_punctuation', 'normalize_quotes'],
      duplicates_detected: [],
      deduped_pool_size: 0,
    },
    relevance_filter_report: {
      eliminated: [],
      reason_totals: {
        GEO_IRRELEVANT: 0,
        COMPETITOR_OR_BRAND: 0,
        NON_TRAVEL_INTENT: 0,
        TOO_GENERIC: 0,
        NON_SERVICE_MATCH: 0,
        LOW_RELEVANCE_SCORE: 0,
      },
      remaining_pool: [],
    },
    recency_report: {
      excluded_recent_posts: [],
      excluded_recent_bucket: [],
      cache_reuse_hits: [],
      remaining_for_scoring: [],
    },
    trend_metrics_results: [],
    trend_api_calls_count: 0,
    serp_cache_hits_list: [],
    serp_cache_misses_list: [],
    dataforseo_api_calls_count: 0,
    serp_scoring_results: [],
    final_selection_table: [],
    winner_keyword_norm: null,
    winner_score: null,
    winner_classification: 'Unknown',
    winner_source_seed: null,
    winner_source_bucket: null,
    decision_rule: '',
    decision_path: '',
    fallback_used: 'none',
    fallback_reason: null,
  };

  try {
    // Check trigger type
    const url = new URL(req.url);
    if (url.searchParams.get('test') === 'true' || url.searchParams.get('manual') === 'true') {
      trace.triggered_by = 'manual_test';
    }
    
    console.log('Weekly Selector: Starting...');
    console.log(`Triggered by: ${trace.triggered_by}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dataForSeoLogin = Deno.env.get('DATAFORSEO_LOGIN');
    const dataForSeoPassword = Deno.env.get('DATAFORSEO_PASSWORD');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create automation run record
    const { data: runRecord, error: runInsertError } = await supabase
      .from('automation_runs')
      .insert({
        run_type: 'weekly',
        status: 'started',
        started_at: runStartedAt,
      })
      .select()
      .single();
    
    if (runInsertError) {
      console.error('Failed to create automation_runs record:', runInsertError);
    }
    
    trace.run_id = runRecord?.id || null;
    console.log(`Automation run created with ID: ${trace.run_id || 'FAILED'}`);
    
    // STEP 0: Get keywords used in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data: recentPosts } = await supabase
      .from('post_history')
      .select('keyword_norm, title, publish_date, url')
      .gte('publish_date', ninetyDaysAgo.toISOString().split('T')[0]);
    
    const usedKeywordNorms = new Set<string>();
    const recentPostsMap = new Map<string, { title: string; publish_date: string; url: string }>();
    for (const p of recentPosts || []) {
      if (p.keyword_norm) {
        usedKeywordNorms.add(p.keyword_norm);
        recentPostsMap.set(p.keyword_norm, { title: p.title, publish_date: p.publish_date, url: p.url });
      }
    }
    console.log(`Keywords used in last 90 days: ${usedKeywordNorms.size}`);
    
    // STEP 1: Get ALL trend candidates from last 60 days (for full trace)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: allCandidates } = await supabase
      .from('trend_candidates')
      .select('*')
      .gte('last_seen_at', sixtyDaysAgo.toISOString())
      .order('last_seen_at', { ascending: false })
      .limit(100);
    
    console.log(`Fetched ${allCandidates?.length || 0} candidates from last 60 days`);
    
    // Build seed expansion trace (group by seed_keyword)
    const seedGroups = new Map<string, any[]>();
    for (const c of allCandidates || []) {
      const seed = c.seed_keyword || 'unknown';
      if (!seedGroups.has(seed)) seedGroups.set(seed, []);
      seedGroups.get(seed)!.push(c);
    }
    
    for (const [seed, candidates] of seedGroups) {
      trace.seed_expansion_results.push({
        seed_term: seed,
        seed_bucket: inferSeedBucket('', seed),
        pytrends_method: candidates[0]?.source_type || 'related_queries',
        timeframe: 'today 3-m',
        geo: 'IN',
        raw_results: candidates.slice(0, 10).map((c, i) => ({
          keyword: c.candidate_keyword,
          type: c.query_type || 'unknown',
          value: c.relevance_score || 0,
          rank: i + 1,
        })),
        result_count: candidates.length,
      });
    }
    
    // STEP 2: Normalization + Dedupe
    const normMap = new Map<string, { count: number; seeds: Set<string>; raw: string }>();
    for (const c of allCandidates || []) {
      const norm = normalizeKeyword(c.candidate_keyword);
      if (!norm) continue;
      
      if (normMap.has(norm)) {
        const entry = normMap.get(norm)!;
        entry.count++;
        entry.seeds.add(c.seed_keyword || 'unknown');
      } else {
        normMap.set(norm, { count: 1, seeds: new Set([c.seed_keyword || 'unknown']), raw: c.candidate_keyword });
      }
    }
    
    // Record duplicates
    for (const [norm, data] of normMap) {
      if (data.count > 1) {
        trace.normalization_report.duplicates_detected.push({
          keyword: norm,
          count: data.count,
          from_seeds: Array.from(data.seeds),
        });
      }
    }
    trace.normalization_report.deduped_pool_size = normMap.size;
    
    // STEP 3: Relevance filtering
    const postRelevanceFilter: string[] = [];
    for (const [norm, data] of normMap) {
      const filterResult = checkRelevanceFilter(norm);
      if (!filterResult.passed) {
        trace.relevance_filter_report.eliminated.push({
          keyword: norm,
          reason: filterResult.reason!,
          details: filterResult.details,
        });
        trace.relevance_filter_report.reason_totals[filterResult.reason!]++;
      } else {
        postRelevanceFilter.push(norm);
      }
    }
    trace.relevance_filter_report.remaining_pool = postRelevanceFilter;
    
    // Also filter by relevance_score from DB
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: relevantCandidates } = await supabase
      .from('trend_candidates')
      .select('*')
      .eq('is_relevant', true)
      .gte('relevance_score', 30)
      .gte('last_seen_at', sevenDaysAgo.toISOString())
      .order('relevance_score', { ascending: false })
      .limit(20);
    
    console.log(`Relevant candidates from DB (score >= 30): ${relevantCandidates?.length || 0}`);
    
    // STEP 4: Recency/Repetition exclusions
    const eligibleForScoring: any[] = [];
    
    for (const c of relevantCandidates || []) {
      const norm = c.keyword_norm || normalizeKeyword(c.candidate_keyword);
      
      // Check if already published
      if (usedKeywordNorms.has(norm)) {
        const postInfo = recentPostsMap.get(norm);
        trace.recency_report.excluded_recent_posts.push({
          keyword: norm,
          reason: 'recent_post',
          post_slug: postInfo?.url || 'unknown',
          published_at: postInfo?.publish_date,
        });
        continue;
      }
      
      eligibleForScoring.push({ ...c, keywordNorm: norm });
    }
    
    // Dedupe eligible candidates
    const seenNorms = new Set<string>();
    const dedupedCandidates: any[] = [];
    for (const c of eligibleForScoring) {
      if (!seenNorms.has(c.keywordNorm)) {
        seenNorms.add(c.keywordNorm);
        dedupedCandidates.push(c);
      }
    }
    
    trace.recency_report.remaining_for_scoring = dedupedCandidates.map(c => c.keywordNorm);
    console.log(`After recency filter: ${dedupedCandidates.length} candidates for scoring`);
    
    // STEP 5: Trend Metrics (from stored data - pytrends runs daily)
    const candidateInfoList: CandidateInfo[] = [];
    
    for (const c of dedupedCandidates) {
      const has90d = c.interest_90d !== null && c.interest_90d !== undefined;
      const has12m = c.interest_12m !== null && c.interest_12m !== undefined;
      let trendStatus: TrendMetricsStatus = 'UNAVAILABLE';
      
      if (has90d || has12m) trendStatus = 'OK';
      if (c.last_pytrends_meta?.error) trendStatus = 'ERROR';
      
      const info: CandidateInfo = {
        keyword_norm: c.keywordNorm,
        keyword_raw: c.candidate_keyword,
        pytrends_type: c.query_type || 'unknown',
        seen_count: c.seen_count || 1,
        first_seen_at: c.first_seen_at,
        last_seen_at: c.last_seen_at,
        relevance_score: c.relevance_score || 0,
        source_seed: c.seed_keyword,
        source_seed_bucket: inferSeedBucket(c.candidate_keyword, c.seed_keyword),
        source_method: inferSourceMethod(c),
        trend_metrics_status: trendStatus,
        interest_7d: c.interest_7d ?? null,
        interest_90d: c.interest_90d ?? null,
        interest_12m: c.interest_12m ?? null,
      };
      
      candidateInfoList.push(info);
      
      // Add to trend metrics results
      trace.trend_metrics_results.push({
        keyword_norm: c.keywordNorm,
        interest_7d: c.interest_7d ?? null,
        interest_90d: c.interest_90d ?? null,
        interest_12m: c.interest_12m ?? null,
        momentum_7d: null, // Would require additional pytrends call
        momentum_90d: null,
        seasonal_position: null,
        status: trendStatus,
        error_message: c.last_pytrends_meta?.error,
        error_step: c.last_pytrends_meta?.error_step,
      });
    }
    
    // STEP 6: SERP Scoring
    let selectedPayload: TopicPayload | null = null;
    const topScores: SerpScore[] = [];
    let decisionPath = `daily_collection(pytrends:${seedGroups.size}_seeds) -> weekly_selector(dedupe:${trace.normalization_report.deduped_pool_size}) -> relevance_filter(${trace.relevance_filter_report.remaining_pool.length}) -> recency_filter(${dedupedCandidates.length})`;
    
    if (dedupedCandidates.length > 0) {
      decisionPath += ` -> serp_scoring`;
      
      // Score up to 10 candidates
      for (const candidate of dedupedCandidates.slice(0, 10)) {
        const score = await scoreKeywordWithSerp(
          candidate.candidate_keyword,
          candidate.keywordNorm,
          supabase,
          dataForSeoLogin,
          dataForSeoPassword,
          trace
        );
        
        topScores.push(score);
        
        // Add to SERP scoring results
        trace.serp_scoring_results.push({
          keyword_norm: candidate.keywordNorm,
          from_cache: score.fromCache,
          cached_at: score.cachedAt,
          intent_score: score.intentScore,
          intent_explanation: score.intentExplanation,
          rankability_score: score.rankabilityScore,
          rankability_explanation: score.rankabilityExplanation,
          gap_score: score.contentGapScore,
          gap_explanation: score.gapExplanation,
          local_score: score.localFitScore,
          local_explanation: score.localExplanation,
          total_score: score.totalScore,
          top_domains: score.topDomains,
        });
        
        // Get candidate info for classification
        const candInfo = candidateInfoList.find(ci => ci.keyword_norm === candidate.keywordNorm);
        
        // Add to final selection table
        trace.final_selection_table.push({
          keyword_norm: candidate.keywordNorm,
          trend_7d: candInfo?.interest_7d ?? null,
          trend_90d: candInfo?.interest_90d ?? null,
          trend_12m: candInfo?.interest_12m ?? null,
          trend_status: candInfo?.trend_metrics_status || 'UNAVAILABLE',
          serp_score: score.totalScore,
          cache_hit: score.fromCache,
        });
      }
      
      decisionPath += `(${trace.serp_cache_hits_list.length}_cached/${trace.serp_cache_misses_list.length}_new)`;
      
      console.log(`SERP: ${trace.serp_cache_hits_list.length} cache hits, ${trace.serp_cache_misses_list.length} misses, ${trace.dataforseo_api_calls_count} API calls`);
      
      // Select winner (highest SERP score)
      topScores.sort((a, b) => b.totalScore - a.totalScore);
      
      // Mark non-winners with reason
      for (let i = 0; i < trace.final_selection_table.length; i++) {
        const row = trace.final_selection_table[i];
        const sortedIndex = topScores.findIndex(s => s.keywordNorm === row.keyword_norm);
        if (sortedIndex > 0) {
          const higherScore = topScores[0].totalScore;
          row.why_not_chosen = `SERP score ${row.serp_score} < winner ${higherScore}`;
        }
      }
      
      const winner = topScores[0];
      
      if (winner && winner.totalScore >= 30) {
        const winnerNorm = winner.keywordNorm;
        const winnerCandidate = dedupedCandidates.find(c => c.keywordNorm === winnerNorm);
        const winnerInfo = candidateInfoList.find(ci => ci.keyword_norm === winnerNorm);
        const trendStatus = winnerInfo?.trend_metrics_status || 'UNAVAILABLE';
        const classification = classifyTrendCandidate(
          trendStatus,
          winnerCandidate?.query_type || 'unknown',
          winnerInfo?.interest_90d ?? null,
          winnerInfo?.interest_12m ?? null
        );
        
        trace.winner_keyword_norm = winnerNorm;
        trace.winner_score = winner.totalScore;
        trace.winner_classification = classification;
        trace.winner_source_seed = winnerInfo?.source_seed || null;
        trace.winner_source_bucket = winnerInfo?.source_seed_bucket || null;
        
        // Decision rule based on trend status
        if (trendStatus !== 'OK') {
          trace.decision_rule = `Picked highest SERP score (${winner.totalScore}/100) among ${dedupedCandidates.length} candidates. Trend metrics ${trendStatus}, selected purely by SERP score.`;
          decisionPath += ` -> trend_enrichment(SKIPPED:${trendStatus}) -> winner(${winnerNorm}:${winner.totalScore})`;
        } else {
          trace.decision_rule = `Picked highest SERP score (${winner.totalScore}/100) with trend status OK. Classification: ${classification}.`;
          decisionPath += ` -> trend_enrichment(OK) -> winner(${winnerNorm}:${winner.totalScore})`;
        }
        
        trace.decision_path = decisionPath;
        trace.fallback_used = 'none';
        
        // Build topic payload
        selectedPayload = {
          primaryKeyword: winner.keyword,
          workingTitle: `${winner.keyword.charAt(0).toUpperCase() + winner.keyword.slice(1)}: A Practical Guide`,
          secondaryKeywords: topScores.slice(1, 4).map(s => s.keyword),
          outlineHints: `Focus on ${winner.keyword}. Intent: ${winner.intentScore}/40, Rankability: ${winner.rankabilityScore}/40.`,
          internalLinks: [
            { url: '/', anchorSuggestion: 'Wavealokam' },
            { url: winner.keyword.includes('surf') ? '/#surf-school' : '/#rooms', 
              anchorSuggestion: winner.keyword.includes('surf') ? 'surf lessons in Varkala' : 'beach stay near Varkala' },
          ],
          bucket: winnerInfo?.source_seed_bucket || 'TREND_GENERAL',
          postType: 'weekly',
          selectionReasoning: `TREND-BASED: "${winner.keyword}" scored ${winner.totalScore}/100 (I:${winner.intentScore} R:${winner.rankabilityScore} G:${winner.contentGapScore} L:${winner.localFitScore}). Classification: ${classification}. Pool: ${dedupedCandidates.length} candidates.`,
          keywordNorm: winnerNorm,
          classification,
        };
      }
    }
    
    // FALLBACK to evergreen if no valid trend candidate
    if (!selectedPayload) {
      console.log('No valid trend candidates, falling back to evergreen...');
      trace.fallback_used = 'evergreen';
      trace.fallback_reason = dedupedCandidates.length === 0 
        ? 'No trend candidates found after filtering'
        : `${dedupedCandidates.length} candidates found but none scored >= 30`;
      
      decisionPath += ` -> no_valid_winner -> evergreen_fallback`;
      
      const evergreenResult = await selectEvergreenFallback(
        supabase, dataForSeoLogin, dataForSeoPassword, usedKeywordNorms, trace
      );
      
      if (evergreenResult) {
        selectedPayload = evergreenResult.payload;
        
        // Update trace with evergreen winner
        const evergreenWinner = evergreenResult.scores.reduce((a, b) => a.totalScore > b.totalScore ? a : b);
        trace.winner_keyword_norm = evergreenWinner.keywordNorm;
        trace.winner_score = evergreenWinner.totalScore;
        trace.winner_classification = 'Evergreen Stable';
        trace.winner_source_seed = evergreenResult.candidateList[0]?.source_seed || null;
        trace.winner_source_bucket = evergreenResult.candidateList[0]?.source_seed_bucket || null;
        trace.decision_rule = `Evergreen fallback: Selected from bucket with highest SERP score (${evergreenWinner.totalScore}/100).`;
        decisionPath += ` -> serp_scoring -> winner(${evergreenWinner.keywordNorm}:${evergreenWinner.totalScore})`;
        trace.decision_path = decisionPath;
      }
    }
    
    if (!selectedPayload) {
      throw new Error('Failed to select any topic');
    }
    
    trace.time_finished_utc = new Date().toISOString();
    
    console.log(`Selected topic: ${selectedPayload.primaryKeyword}`);
    
    // Call blog generator
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
        forensicTrace: trace,
      }),
    });
    
    const generateResult = await generateResponse.json();
    
    if (!generateResponse.ok) {
      throw new Error(generateResult.error || 'Blog generation failed');
    }
    
    // Record in post_history
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
        decision_path: trace.decision_path,
        classification: trace.winner_classification,
        serp_score: trace.winner_score,
        fallback_used: trace.fallback_used,
        candidates_evaluated: dedupedCandidates.length,
        cache_hits: trace.serp_cache_hits_list.length,
        cache_misses: trace.serp_cache_misses_list.length,
        dataforseo_calls: trace.dataforseo_api_calls_count,
      },
    });
    
    // Update automation run
    if (trace.run_id) {
      await supabase
        .from('automation_runs')
        .update({
          status: 'success',
          selected_keyword: selectedPayload.primaryKeyword,
          selected_bucket: selectedPayload.bucket,
          candidates_found: dedupedCandidates.length,
          completed_at: trace.time_finished_utc,
          log_data: trace,
        })
        .eq('id', trace.run_id);
      
      console.log(`Automation run ${trace.run_id} updated`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        topic: selectedPayload.primaryKeyword,
        bucket: selectedPayload.bucket,
        post: generateResult.post,
        forensicTrace: trace,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Weekly Selector error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    trace.time_finished_utc = new Date().toISOString();
    
    // Update automation run with error
    if (trace.run_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      await supabase
        .from('automation_runs')
        .update({
          status: 'error',
          error_message: errorMessage,
          completed_at: trace.time_finished_utc,
          log_data: trace,
        })
        .eq('id', trace.run_id);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage, forensicTrace: trace }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
