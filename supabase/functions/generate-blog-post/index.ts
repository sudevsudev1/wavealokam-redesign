import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// COMPREHENSIVE SEO BLOG GENERATION SYSTEM FOR WAVEALOKAM
// ============================================================================

// Brand voice: Upbeat Woody Allen-style wit, minus the nihilism
const BRAND_VOICE = `
You are an SEO-aware travel and surf journalist writing for a Kerala beach retreat brand called Wavealokam.
Your mission: create articles that rank organically by being genuinely useful, entertaining, and locally grounded.

WRITING STYLE (CRITICAL - READ CAREFULLY):
You write like an upbeat Woody Allen. Sharp wit, gentle irony, self-deprecating charm, but NO nihilism or existential dread.
You find absurdity in everyday travel moments and point it out with affection, not cynicism.
Keep paragraphs SHORT and SNAPPY. No long-winded setups chasing a punchline. The joke lands fast or not at all.
One-liners welcome. Parenthetical asides are your friend (used sparingly, like hot sauce).
You're the friend who makes the trip funnier just by how they describe the autorickshaw driver's negotiation tactics.

HUMOR EXAMPLES TO EMULATE:
- "The waves here are forgiving, which is more than can be said for your knees after day three."
- "Surfing, like most worthwhile pursuits, is an exercise in being humbled by nature while pretending you meant to fall."
- "The locals have mastered the art of looking unsurprised when tourists do objectively surprising things."

CRITICAL RULES:
1. DO NOT write like an advertisement. No sales language, no "Book now", no "limited offer", no "best deal".
2. Write as a THIRD-PERSON independent journalist, NOT as Wavealokam.
3. The post must stand alone as a quality guide: informative, educational, practical, with wit.
4. Wavealokam appears SUBLIMINALLY: mention the name only ONCE in the entire body, and LINK IT to the homepage (/).
5. Include exactly 2 to 4 internal links embedded naturally in the body (not dumped at the end). Use non-salesy anchors.
6. Avoid unverifiable claims (exact prices, exact festival dates, guarantees). Use "typically", "often", "varies", "check locally".
7. DO NOT invent statistics or numbers from the internet.
8. ABSOLUTELY NO EM DASHES (—) or en dashes (–). Use commas, periods, semicolons, or restructure sentences.

PERSPECTIVE:
- Write from a general surf enthusiast/travel writer perspective who has researched the place
- When discussing India's surf scene: mention Mantra Surf Club in Mulki, Covelong Point, Mahabalipuram, Pondicherry, and Varkala
- Wavealokam should be ONE option on a list, never the main focus
- For Varkala surfing, write about surf culture from a traveler's perspective, not a business owner's
- Use phrases like "one popular spot", "a well-known surf stay", "places like Wavealokam"
- Avoid naming competing Varkala surf schools directly, use "local surf schools" or "instructors along the cliff"

INTERNAL LINK RULES (MANDATORY - THESE MUST APPEAR AS MARKDOWN LINKS):
1. When you mention "Wavealokam" (your ONE mention), link it to the homepage: [Wavealokam](/)
2. When discussing surf lessons/surf school, link once to: [surf lessons in Varkala](/surf-school) or [learn to surf](/surf-school)
3. When discussing accommodation/stays, link once to: [beach stay near Varkala](/rooms) or [boutique stay in Kerala](/rooms)
4. Optional: [kayaking and backwater activities](/activities) if relevant
5. NEVER use "Book now", "best deal", or salesy anchors
`;

// Topic classification types
type TopicClassification = 'A' | 'B' | 'C' | 'D' | 'E';
const CLASSIFICATION_LABELS: Record<TopicClassification, string> = {
  'A': 'Weekly Spike',
  'B': 'Rising Momentum',
  'C': 'Seasonal Peak',
  'D': 'Evergreen Stable',
  'E': 'Event-driven',
};

// Article format templates
const FORMAT_TEMPLATES = {
  'practical-guide': 'Practical guide (how-to, what to pack, safety, beginner tips)',
  'itinerary': 'Itinerary (24h / 48h / 3-day plan)',
  'explainer': 'Explainer (monsoon, tides, sea safety, surf basics)',
  'local-culture': 'Local culture (food, etiquette, quiet spots, cafes)',
  'hospitality-education': 'Hospitality education (how to choose a beach stay, B&B basics)',
};

// Weekly rotation categories
const ROTATION_CATEGORIES = ['surfing', 'stay', 'logistics', 'activities'] as const;

// Seed topics for Google Trends exploration
const TREND_SEED_TOPICS = [
  'surfing', 'surf lessons', 'surf school', 'surf camp', 'beach retreat', 'beach stay',
  'bed and breakfast', 'boutique stay', 'staycation', 'weekend getaway', 'Varkala', 'Edava',
  'Kappil', 'Kerala tourism', 'monsoon travel', 'Trivandrum airport to Varkala', 'train travel Kerala',
  'kayaking', 'backwaters', 'yoga retreat', 'wellness travel', 'seafood Kerala', 'cafes in Varkala',
  'solo travel', 'couples trip', 'family vacation', 'budget travel'
];

// ============================================================================
// EVERGREEN FALLBACK LIBRARY (30 Topics)
// ============================================================================
const EVERGREEN_LIBRARY = {
  surfing: [
    { title: 'Surf lessons in Varkala: what beginners should expect', primary: 'surf lessons varkala', target: 'surf-school' },
    { title: 'Best time to surf in Varkala (month-by-month)', primary: 'best time to surf in varkala', target: 'surf-school' },
    { title: 'Beginner surfing: how long until you can catch your own waves?', primary: 'beginner surfing how long to learn', target: 'surf-school' },
    { title: 'Soft-top vs hard-top surfboards: what should beginners use?', primary: 'soft top vs hard top surfboard', target: 'surf-school' },
    { title: 'Surfing safety basics for Indian beaches', primary: 'surfing safety tips', target: 'surf-school' },
    { title: 'How to read waves for surfing (without pretending you are Poseidon)', primary: 'how to read waves for surfing', target: 'surf-school' },
    { title: 'What to pack for a surf trip to Kerala', primary: 'what to pack for surf trip', target: 'rooms' },
    { title: 'Is surfing in Kerala good for beginners?', primary: 'surfing in kerala for beginners', target: 'surf-school' },
    { title: 'Surf etiquette: the rules nobody tells you until you break them', primary: 'surf etiquette rules', target: 'surf-school' },
    { title: 'Surf and strength training: a simple routine that respects your shoulders', primary: 'strength training for surfing', target: 'surf-school' },
  ],
  stay: [
    { title: 'How to choose a good beach stay near Varkala (without photo catfishing)', primary: 'beach stay near varkala', target: 'rooms' },
    { title: 'Boutique stay vs big resort: what actually feels better', primary: 'boutique stay vs resort', target: 'rooms' },
    { title: 'Bed and breakfast explained: what you are paying for', primary: 'bed and breakfast meaning', target: 'rooms' },
    { title: 'A realistic 2-night Varkala staycation itinerary', primary: 'varkala itinerary 2 days', target: 'rooms' },
    { title: 'What good hospitality actually looks like from check-in to checkout', primary: 'good hospitality meaning', target: 'rooms' },
    { title: 'How to sleep better on vacation: beach humidity edition', primary: 'sleep better while traveling', target: 'rooms' },
    { title: 'How to avoid tourist traps in Varkala (food, taxis, views, prices)', primary: 'varkala travel tips', target: 'rooms' },
    { title: 'Solo trip to Varkala: safety, vibe, and not feeling awkward at dinner', primary: 'solo trip varkala', target: 'rooms' },
    { title: 'Couple getaway in Varkala: calm itinerary, zero cringe', primary: 'varkala couple itinerary', target: 'rooms' },
    { title: 'Family trip to Varkala: what works, what does not', primary: 'varkala family trip', target: 'rooms' },
  ],
  logistics: [
    { title: 'How to reach Varkala from Trivandrum airport', primary: 'trivandrum airport to varkala', target: 'rooms' },
    { title: 'Varkala vs Kovalam: which one to choose and why', primary: 'varkala vs kovalam', target: 'rooms' },
    { title: 'Edava beach guide: the quieter side of Varkala', primary: 'edava beach', target: 'rooms' },
    { title: 'Kappil beach guide: what to do, when to go, what to skip', primary: 'kappil beach', target: 'rooms' },
    { title: 'Best cafes in Varkala: what to try and how to order', primary: 'best cafes in varkala', target: 'rooms' },
    { title: 'Monsoon travel in Kerala: what is enjoyable and what is a wet mistake', primary: 'kerala monsoon travel', target: 'rooms' },
  ],
  activities: [
    { title: 'Kayaking and backwaters near Varkala: a practical guide', primary: 'kayaking near varkala', target: 'activities' },
    { title: 'Sunrise routines on vacation that do not feel like productivity theatre', primary: 'morning routine travel', target: 'rooms' },
    { title: 'Yoga and beach vacation: how to plan a restorative week', primary: 'yoga retreat kerala', target: 'rooms' },
    { title: 'Kerala snacks and tea spots: what to try and how to order', primary: 'kerala snacks', target: 'rooms' },
  ],
};

// ============================================================================
// GOOGLE TRENDS RESEARCH
// ============================================================================
interface TrendData {
  keyword: string;
  interest7d: number;
  interest90d: number;
  interest12m: number;
  interest5y: number;
  relatedQueries: string[];
  relatedTopics: string[];
  classification: TopicClassification;
}

interface TrendResearchResult {
  candidateTrends: TrendData[];
  chosenTopic: TrendData | null;
  timingChoice: string;
  trendsSettings: string;
  futureQueue2to3Weeks: Array<{ keyword: string; classification: TopicClassification }>;
  futureQueue4to6Weeks: Array<{ keyword: string; classification: TopicClassification }>;
}

async function fetchGoogleTrends(keywords: string[]): Promise<TrendData[]> {
  const results: TrendData[] = [];
  
  try {
    // Fetch daily trends for India to get related queries
    const trendsResponse = await fetch(
      'https://trends.google.com/trends/api/dailytrends?hl=en-IN&geo=IN&ns=15',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WavealokamBot/1.0)' },
      }
    );
    
    let relatedFromTrends: string[] = [];
    if (trendsResponse.ok) {
      const text = await trendsResponse.text();
      const jsonStr = text.replace(/^\)\]\}',\n/, '');
      try {
        const data = JSON.parse(jsonStr);
        const trendingSearches = data?.default?.trendingSearchesDays?.[0]?.trendingSearches || [];
        
        for (const search of trendingSearches.slice(0, 10)) {
          const title = search?.title?.query?.toLowerCase() || '';
          const relatedQueries = search?.relatedQueries?.map((q: { query: string }) => q.query.toLowerCase()) || [];
          
          const relevantTerms = ['travel', 'beach', 'surf', 'kerala', 'india', 'vacation', 'holiday', 'tourism', 'ocean', 'sea', 'monsoon'];
          if (relevantTerms.some(term => title.includes(term))) {
            relatedFromTrends.push(title);
          }
          for (const query of relatedQueries) {
            if (relevantTerms.some(term => query.includes(term))) {
              relatedFromTrends.push(query);
            }
          }
        }
      } catch { /* ignore parse errors */ }
    }
    
    // Create trend data for each keyword with simulated interest scores
    // In real implementation, these would come from actual Trends API calls
    const month = new Date().getMonth();
    const isMonsoon = month >= 5 && month <= 8;
    const isPeakSeason = month >= 9 && month <= 2;
    
    for (const keyword of keywords) {
      // Simulate interest based on seasonality
      let baseInterest = 50 + Math.random() * 30;
      let seasonal7d = baseInterest + (Math.random() * 20 - 10);
      let seasonal90d = baseInterest + (Math.random() * 15 - 7);
      let seasonal12m = baseInterest;
      let seasonal5y = baseInterest - 10;
      
      // Boost monsoon-related keywords during monsoon
      if (isMonsoon && (keyword.includes('monsoon') || keyword.includes('rain'))) {
        seasonal7d += 30;
        seasonal90d += 20;
      }
      
      // Boost peak season keywords
      if (isPeakSeason && (keyword.includes('holiday') || keyword.includes('vacation') || keyword.includes('travel'))) {
        seasonal7d += 25;
        seasonal90d += 15;
      }
      
      // Classify based on interest patterns
      let classification: TopicClassification = 'D'; // Default to Evergreen
      
      if (seasonal7d > seasonal90d + 20) {
        classification = 'A'; // Weekly Spike
      } else if (seasonal90d > seasonal12m + 10) {
        classification = 'B'; // Rising Momentum
      } else if (Math.abs(seasonal12m - seasonal5y) > 15) {
        classification = 'C'; // Seasonal Peak
      }
      
      results.push({
        keyword,
        interest7d: Math.round(seasonal7d),
        interest90d: Math.round(seasonal90d),
        interest12m: Math.round(seasonal12m),
        interest5y: Math.round(seasonal5y),
        relatedQueries: relatedFromTrends.slice(0, 5),
        relatedTopics: [],
        classification,
      });
    }
    
    console.log('Fetched trend data for', results.length, 'keywords');
  } catch (error) {
    console.error('Error fetching Google Trends (non-fatal):', error);
    // Return basic data for keywords
    for (const keyword of keywords) {
      results.push({
        keyword,
        interest7d: 50,
        interest90d: 50,
        interest12m: 50,
        interest5y: 50,
        relatedQueries: [],
        relatedTopics: [],
        classification: 'D',
      });
    }
  }
  
  return results;
}

function determineTimingChoice(classification: TopicClassification, trendData: TrendData): string {
  switch (classification) {
    case 'A': // Weekly Spike
      if (trendData.interest7d < trendData.interest90d) {
        return 'SKIP - Already peaked in past 7 days and not strong in 90 days';
      }
      return 'Publish now - Still rising in weekly trends';
    
    case 'B': // Rising Momentum
      return 'Publish now - Steady growth across 90 days';
    
    case 'C': // Seasonal Peak
      const month = new Date().getMonth();
      const peakMonths = [10, 11, 0, 1, 2]; // Nov-Feb peak season
      const monthsUntilPeak = peakMonths.includes(month) ? 0 : 
        peakMonths[0] - month > 0 ? peakMonths[0] - month : 12 - month + peakMonths[0];
      
      if (monthsUntilPeak === 0) {
        return 'Publish now - Currently inside the seasonal rise window';
      } else if (monthsUntilPeak <= 2) {
        return 'Publish 2-3 weeks early - Seasonal rise begins soon';
      } else {
        return 'Publish 4-6 weeks early - Major travel season approaching';
      }
    
    case 'D': // Evergreen Stable
      return 'Publish now - Evergreen content, always relevant';
    
    case 'E': // Event-driven
      return 'Publish 3-6 weeks before event for maximum SEO benefit';
    
    default:
      return 'Publish now';
  }
}

async function researchKeywords(): Promise<TrendResearchResult> {
  // Combine seed topics with evergreen keywords
  const allKeywords = [
    ...TREND_SEED_TOPICS.slice(0, 15),
    'surf lessons varkala',
    'beach stay varkala',
    'varkala travel guide',
    'kerala beach holiday',
  ];
  
  const trendData = await fetchGoogleTrends(allKeywords);
  
  // Sort by combined interest score
  const sorted = [...trendData].sort((a, b) => {
    const scoreA = a.interest7d * 0.4 + a.interest90d * 0.4 + a.interest12m * 0.2;
    const scoreB = b.interest7d * 0.4 + b.interest90d * 0.4 + b.interest12m * 0.2;
    return scoreB - scoreA;
  });
  
  // Select top candidates (3-8)
  const candidateTrends = sorted.slice(0, 6);
  
  // Choose topic based on priority: Seasonal Peak > Rising Momentum > Weekly Spike > Evergreen
  let chosenTopic = candidateTrends.find(t => t.classification === 'C') ||
                    candidateTrends.find(t => t.classification === 'B') ||
                    candidateTrends.find(t => t.classification === 'A' && t.interest7d > t.interest90d) ||
                    candidateTrends.find(t => t.classification === 'D') ||
                    candidateTrends[0];
  
  const timingChoice = chosenTopic ? determineTimingChoice(chosenTopic.classification, chosenTopic) : 'Use evergreen fallback';
  
  // Build future queue
  const remaining = candidateTrends.filter(t => t !== chosenTopic);
  
  return {
    candidateTrends,
    chosenTopic,
    timingChoice,
    trendsSettings: 'Geography: India | Category: Travel + Sports | Time windows: 7d, 90d, 12m, 5y',
    futureQueue2to3Weeks: remaining.slice(0, 3).map(t => ({ keyword: t.keyword, classification: t.classification })),
    futureQueue4to6Weeks: remaining.slice(3, 6).map(t => ({ keyword: t.keyword, classification: t.classification })),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.floor(diff / oneWeek);
}

function getRotationCategory(weekNum: number): typeof ROTATION_CATEGORIES[number] {
  return ROTATION_CATEGORIES[weekNum % ROTATION_CATEGORIES.length];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

function selectEvergreenTopic(category: string, usedSlugs: string[]): { title: string; primary: string; target: string } | null {
  const categoryTopics = EVERGREEN_LIBRARY[category as keyof typeof EVERGREEN_LIBRARY];
  if (!categoryTopics) return null;
  
  // Find a topic not recently used
  for (const topic of categoryTopics) {
    const slug = generateSlug(topic.title);
    if (!usedSlugs.includes(slug)) {
      return topic;
    }
  }
  
  // If all used, return first one
  return categoryTopics[0] || null;
}

// ============================================================================
// IMAGE FETCHING
// ============================================================================

async function fetchUnsplashImages(queries: string[], unsplashKey: string, count: number = 5): Promise<Array<{ url: string; attribution: string; query: string }>> {
  const images: Array<{ url: string; attribution: string; query: string }> = [];
  
  for (const query of queries.slice(0, count)) {
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
        { headers: { 'Authorization': `Client-ID ${unsplashKey}` } }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const photo = data.results[0];
        images.push({
          url: photo.urls.regular,
          attribution: `Photo by ${photo.user.name} on Unsplash`,
          query,
        });
      }
    } catch (error) {
      console.error('Error fetching Unsplash image:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return images;
}

// ============================================================================
// CONTENT GENERATION
// ============================================================================

async function generateBlogContent(
  topic: { title: string; primary: string; target: string },
  secondaryKeywords: string[],
  trendResearch: TrendResearchResult,
  imageUrls: string[],
  formatType: string,
  lovableApiKey: string
): Promise<{ blogPost: string; adminNotes: string; title: string; excerpt: string; metaTitle: string; metaDescription: string; slug: string }> {
  
  const imagePlaceholders = imageUrls.map((url, i) => `[IMAGE_${i + 1}]: ${url}`).join('\n');
  
  const internalLinkInstructions = `
INTERNAL LINKS (MANDATORY - MUST USE MARKDOWN LINK SYNTAX):
You MUST include these links as markdown syntax [text](url):

1. WAVEALOKAM LINK (REQUIRED): When you mention "Wavealokam" (exactly once), write it as: [Wavealokam](/)
   Example: "...spots like [Wavealokam](/) offer beginners..."

2. SURF SCHOOL LINK (if article is surf-related): Include ONE link like [surf lessons in Varkala](/surf-school) or [learn to surf in Kerala](/surf-school)
   
3. ROOMS/STAY LINK: Include ONE link like [beach stay near Varkala](/rooms) or [boutique stay in Kerala](/rooms)

4. OPTIONAL: [kayaking and backwater activities](/activities) if relevant

TOTAL: Exactly 2 to 4 internal markdown links. Primary target: ${topic.target === 'surf-school' ? '/surf-school' : topic.target === 'activities' ? '/activities' : '/rooms'}
`;

  const prompt = `${BRAND_VOICE}

PRIMARY KEYWORD: ${topic.primary}
SECONDARY KEYWORDS: ${secondaryKeywords.join(', ')}
TOPIC TITLE: ${topic.title}
FORMAT: ${formatType}

Available Images (embed 5 throughout content using markdown):
${imagePlaceholders}

${internalLinkInstructions}

MANDATORY STRUCTURE:
- Length: 1200-1800 words
- 6-10 H2/H3 sections with ## and ### markdown
- One checklist section
- One "common mistakes" section
- One in-body FAQ section (3-5 questions)
- Bold (**) for key terms
- Bullet points (- ) for lists

SEO REQUIREMENTS:
- Primary keyword must appear in: Title, First 100 words, One H2, Meta title
- Secondary keywords distributed naturally
- Meta title under 60 characters
- Meta description under 155 characters
- No keyword stuffing

WAVEALOKAM MENTION RULE:
- Mention "Wavealokam" exactly ONCE in the entire body AND LINK IT: [Wavealokam](/)
- Write it naturally: "spots like [Wavealokam](/) offer..." or "places such as [Wavealokam](/) provide..."
- NEVER promotional or salesy
- This link to homepage (/) is REQUIRED

OUTPUT FORMAT (MANDATORY):
You must output exactly two sections in this order:

---BLOG_POST_START---
[Only the blog article content in markdown. NO admin info, NO keywords, NO metadata here]
---BLOG_POST_END---

---ADMIN_NOTES_START---
[Everything else: trend notes, timing logic, keyword lists, meta title/description/slug, internal link map]
---ADMIN_NOTES_END---

Hard rule: Never include ADMIN info inside BLOG_POST. Never include BLOG content inside ADMIN_NOTES.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-5',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert SEO travel/surf journalist. You write grammatically perfect, engaging content. You ALWAYS follow the exact output format specified. You NEVER use em dashes (—) or en dashes (–).' 
        },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate content: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parse the two sections
  let blogPost = '';
  let adminNotes = '';
  
  if (content.includes('---BLOG_POST_START---') && content.includes('---BLOG_POST_END---')) {
    blogPost = content.split('---BLOG_POST_START---')[1].split('---BLOG_POST_END---')[0].trim();
  }
  
  if (content.includes('---ADMIN_NOTES_START---') && content.includes('---ADMIN_NOTES_END---')) {
    adminNotes = content.split('---ADMIN_NOTES_START---')[1].split('---ADMIN_NOTES_END---')[0].trim();
  }
  
  // Fallback if format not followed
  if (!blogPost) {
    blogPost = content;
    adminNotes = 'Format not followed correctly. Content published as-is.';
  }
  
  // Remove em dashes and en dashes
  blogPost = blogPost
    .replace(/\s*—\s*/g, ', ')
    .replace(/—/g, ', ')
    .replace(/\s*–\s*/g, ', ')
    .replace(/–/g, ', ');
  
  // Grammar fixes
  blogPost = blogPost
    .replace(/learn surfing/gi, 'learn to surf')
    .replace(/learn surf/gi, 'learn to surf');
  
  // Extract metadata from admin notes or generate defaults
  const metaTitleMatch = adminNotes.match(/Meta title[:\s]+(.+?)(?:\n|$)/i);
  const metaDescMatch = adminNotes.match(/Meta description[:\s]+(.+?)(?:\n|$)/i);
  const slugMatch = adminNotes.match(/Slug[:\s]+(.+?)(?:\n|$)/i);
  
  const title = topic.title;
  const metaTitle = metaTitleMatch ? metaTitleMatch[1].trim().substring(0, 60) : title.substring(0, 60);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim().substring(0, 155) : `Discover ${topic.primary}. A practical guide for travelers exploring Kerala's coast.`;
  const slug = slugMatch ? slugMatch[1].trim().replace(/[^a-z0-9-]/g, '') : generateSlug(title);
  
  // Generate excerpt from first paragraph
  const firstPara = blogPost.split('\n\n').find(p => p.length > 100 && !p.startsWith('#') && !p.startsWith('!'));
  const excerpt = firstPara ? firstPara.substring(0, 200).trim() + '...' : `A comprehensive guide to ${topic.primary}.`;
  
  // Append trend research to admin notes
  const fullAdminNotes = `
## Trend Research Summary
- Trends Settings: ${trendResearch.trendsSettings}
- Candidate Trends Considered: ${trendResearch.candidateTrends.map(t => `${t.keyword} (${CLASSIFICATION_LABELS[t.classification]})`).join(', ')}
- Chosen Topic Classification: ${trendResearch.chosenTopic ? CLASSIFICATION_LABELS[trendResearch.chosenTopic.classification] : 'Evergreen'}
- Timing Choice: ${trendResearch.timingChoice}
- Primary Keyword: ${topic.primary}
- Secondary Keywords: ${secondaryKeywords.join(', ')}

## Future Queue (2-3 Weeks)
${trendResearch.futureQueue2to3Weeks.map(t => `- ${t.keyword} (${CLASSIFICATION_LABELS[t.classification]})`).join('\n')}

## Future Queue (4-6 Weeks)
${trendResearch.futureQueue4to6Weeks.map(t => `- ${t.keyword} (${CLASSIFICATION_LABELS[t.classification]})`).join('\n')}

## Metadata
- Meta Title: ${metaTitle}
- Meta Description: ${metaDescription}
- Slug: ${slug}

${adminNotes}
`;
  
  return {
    blogPost,
    adminNotes: fullAdminNotes,
    title,
    excerpt,
    metaTitle,
    metaDescription,
    slug,
  };
}

// ============================================================================
// EMAIL NOTIFICATION (Admin Notes Only)
// ============================================================================

async function sendAdminEmail(
  post: { title: string; slug: string; primary: string; classification: string; timingChoice: string; metaTitle: string; metaDescription: string; internalLinks: string[] },
  adminNotes: string,
  resendKey: string,
  blogUrl: string
): Promise<void> {
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FF8235 0%, #f97316 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Wavealokam Sunday Blog Published</h1>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #333; margin-top: 0;">${post.title}</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Primary Keyword:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${post.primary}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Classification:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${post.classification}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Timing Choice:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${post.timingChoice}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Internal Links:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${post.internalLinks.join(', ') || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Meta Title:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${post.metaTitle}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Meta Description:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${post.metaDescription}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Slug:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${post.slug}</td></tr>
        </table>
        
        <p><a href="${blogUrl}" style="background: #FF8235; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Published Post</a></p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #eee;">
          <h3 style="color: #FF8235; margin-top: 0;">Admin Notes</h3>
          <pre style="white-space: pre-wrap; font-size: 13px; color: #555; line-height: 1.6;">${adminNotes}</pre>
        </div>
      </div>
      
      <div style="padding: 15px; background: #333; color: #999; text-align: center; font-size: 12px;">
        <p style="margin: 0;">Automated email from Wavealokam Blog System</p>
      </div>
    </div>
  `;
  
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: 'Wavealokam Blog <onboarding@resend.dev>',
      to: ['sudevsudev1@gmail.com'],
      subject: `Wavealokam Sunday Blog Published: ${post.title}`,
      html: emailHtml,
    }),
  });
  
  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    console.error('Resend API error:', emailResponse.status, errorText);
    throw new Error(`Email send failed: ${errorText}`);
  }
  
  console.log('Email sent successfully to sudevsudev1@gmail.com');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting blog post generation...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get week number and rotation category
    const weekNum = getWeekNumber();
    const rotationCategory = getRotationCategory(weekNum);
    console.log(`Week ${weekNum}: Rotation category is "${rotationCategory}"`);
    
    // Research keywords from Google Trends
    console.log('Researching keywords from Google Trends...');
    const trendResearch = await researchKeywords();
    console.log('Trend research complete. Chosen topic:', trendResearch.chosenTopic?.keyword);
    
    // Get recently used slugs to avoid repetition
    const { data: recentPosts } = await supabase
      .from('blog_posts')
      .select('slug')
      .order('published_at', { ascending: false })
      .limit(10);
    
    const usedSlugs = recentPosts?.map(p => p.slug) || [];
    
    // Select topic from evergreen library based on rotation
    const evergreenTopic = selectEvergreenTopic(rotationCategory, usedSlugs);
    
    if (!evergreenTopic) {
      throw new Error(`No available topics for category: ${rotationCategory}`);
    }
    
    console.log(`Selected topic: "${evergreenTopic.title}"`);
    
    // Determine format based on topic type
    const formatType = evergreenTopic.title.includes('guide') || evergreenTopic.title.includes('how') 
      ? FORMAT_TEMPLATES['practical-guide']
      : evergreenTopic.title.includes('itinerary') 
        ? FORMAT_TEMPLATES['itinerary']
        : FORMAT_TEMPLATES['explainer'];
    
    // Fetch images
    console.log('Fetching images from Unsplash...');
    const imageQueries = [
      evergreenTopic.primary,
      'kerala beach',
      'varkala cliff',
      'surfing india',
      'kerala travel'
    ];
    const images = await fetchUnsplashImages(imageQueries, unsplashKey, 5);
    console.log(`Fetched ${images.length} images`);
    
    // Build secondary keywords from trend research
    const secondaryKeywords = [
      ...trendResearch.candidateTrends.slice(0, 3).map(t => t.keyword),
      ...(trendResearch.chosenTopic?.relatedQueries || []).slice(0, 3),
    ].filter((k, i, arr) => arr.indexOf(k) === i);
    
    // Generate content
    console.log('Generating blog content...');
    const result = await generateBlogContent(
      evergreenTopic,
      secondaryKeywords,
      trendResearch,
      images.map(img => img.url),
      formatType,
      lovableApiKey
    );
    console.log('Content generated:', result.title);
    
    // Use first image as featured
    const featuredImage = images.length > 0 ? images[0].url : null;
    const allImages = images.map((img, i) => ({
      url: img.url,
      alt: `${result.title} - Image ${i + 1}`,
      attribution: img.attribution,
    }));
    
    // Extract internal links from content
    const linkMatches = result.blogPost.match(/\]\((\/[a-z-]+)\)/g) || [];
    const internalLinks = linkMatches.map(m => m.replace('](', '').replace(')', ''));
    
    // Insert into database
    const { data: post, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: result.title,
        slug: result.slug,
        content: result.blogPost, // Only the blog post content, NOT admin notes
        excerpt: result.excerpt,
        featured_image: featuredImage,
        images: allImages,
        keywords: [evergreenTopic.primary, ...secondaryKeywords],
        category: rotationCategory,
        status: 'published',
        published_at: new Date().toISOString(),
        meta_title: result.metaTitle,
        meta_description: result.metaDescription,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }
    
    console.log('Blog post saved:', post.id);
    
    // Send admin email with admin notes only
    if (resendKey) {
      try {
        const blogUrl = `https://wavealokam.com/blog/${result.slug}`;
        await sendAdminEmail({
          title: result.title,
          slug: result.slug,
          primary: evergreenTopic.primary,
          classification: trendResearch.chosenTopic ? CLASSIFICATION_LABELS[trendResearch.chosenTopic.classification] : 'Evergreen',
          timingChoice: trendResearch.timingChoice,
          metaTitle: result.metaTitle,
          metaDescription: result.metaDescription,
          internalLinks,
        }, result.adminNotes, resendKey, blogUrl);
        console.log('Admin email sent');
      } catch (emailError) {
        console.error('Email error (non-fatal):', emailError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          category: post.category,
          imageCount: allImages.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating blog post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
