import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Wavealokam brand voice guidelines - UPDATED with third-person perspective
const BRAND_VOICE = `
You are writing as an independent travel/surf journalist covering Kerala and India's surf scene.
You are NOT writing for Wavealokam or as Wavealokam. You are a third-party writer.

CRITICAL PERSPECTIVE RULES:
- Write from a THIRD-PERSON perspective - as if you're a surf enthusiast/travel writer who has researched Varkala
- NEVER write "we", "our", "at Wavealokam we..." - this is NOT Wavealokam's blog voice
- Wavealokam should be mentioned as ONE option among others, not the main focus
- The blog should NOT feel like marketing material - it must feel like genuine editorial content
- Readers should discover Wavealokam naturally, not have it pushed on them

CONTENT BALANCE:
- When discussing India's surf scene: mention major spots - Mantra Surf Club in Mulki, Covelong Point near Chennai, Mahabalipuram, Pondicherry, and yes, Varkala with places like Wavealokam
- When discussing Varkala specifically: write about the surf culture, the cliffs, the vibe - from a traveler's perspective, not a business owner's
- Wavealokam can be mentioned as "one solid option" or "a popular choice" but never as "the best" or the main focus
- Avoid naming competing Varkala surf schools directly - use phrases like "several surf schools along the cliff" or "local instructors"

Brand Voice (for tone, not perspective):
- Witty, honest, and conversational - like talking to a well-traveled friend
- Self-deprecating humor about travel mishaps is welcome
- No corporate speak or generic travel writing
- Real talk about India travel (the chaos, the beauty, all of it)
- Occasional pop culture references

ABSOLUTELY NO EM DASHES (—). Use commas, periods, or restructure sentences instead.

Tone Examples:
- "You can walk barefoot here. Emotionally and literally."
- Not "experience world-class surfing" but "learn to stand on a board without looking ridiculous"  
- Not "Wavealokam offers the best..." but "spots like Wavealokam offer..."
`;

// Content type templates with formatting guidelines
const CONTENT_TYPES = [
  { 
    type: 'listicle', 
    template: 'Create a numbered list article with 7-10 items. Each item MUST have an H2 heading with the number and catchy title, followed by 2-3 paragraphs. Use **bold** for key phrases. NO EM DASHES.' 
  },
  { 
    type: 'guide', 
    template: 'Create a comprehensive guide with H2 sections. Use H3 for subsections. Include **bold** key terms. Add bullet points for lists. NO EM DASHES.' 
  },
  { 
    type: 'opinion', 
    template: 'Write a personal, opinionated piece from a travel writer perspective (NOT from Wavealokam). Use first-person as a visiting writer. Include **bold** for strong statements. NO EM DASHES.' 
  },
  { 
    type: 'seasonal', 
    template: 'Write about time-sensitive travel with H2 sections: Overview, What to Expect, What to Pack, Best Activities. Use **bold** for important dates/info. NO EM DASHES.' 
  },
];

// Topic categories for cycling - no two consecutive posts should be similar
const TOPIC_CATEGORIES = [
  'surfing',           // Surf culture, lessons, spots
  'hospitality',       // Beach stays, boutique hotels, what makes a great stay
  'travel',            // Vacation spots, hidden gems, itineraries
  'lifestyle',         // Chill party scene, beach life, digital nomad life
  'personality',       // Sudev Nair, actor to hotelier, unconventional paths
  'business',          // Running a business without MBA, hospitality lessons
  'culture',           // Kerala culture, local experiences, food
  'wellness',          // Beach wellness, yoga, mental health benefits of surfing
];

// Expanded keyword clusters with diverse topics for cycling
const KEYWORD_CLUSTERS = [
  {
    category: 'surfing',
    keywords: ['learn to surf in India', 'surf lessons Kerala', 'beginner surfing Varkala', 'surf school India', 'best surf spots Kerala', 'India surf culture'],
    topics: [
      'India\'s growing surf scene: From Mulki to Varkala',
      'Best surf spots across India for every skill level',
      'What to expect from your first surf lesson in India',
      'The surf culture revolution happening in Kerala',
      'Surf season in India: A coast-by-coast breakdown',
      'Why more Indians are learning to surf',
    ],
    imageQueries: ['surfing beach waves', 'surf lesson india', 'kerala beach sunset', 'tropical surfing', 'beach yoga india']
  },
  {
    category: 'travel',
    keywords: ['Varkala travel guide', 'Kerala beach destinations', 'backpacking South India', 'things to do in Varkala', 'Varkala cliff beaches'],
    topics: [
      'Varkala travel guide: Everything you need to know',
      'Hidden gems of Varkala most tourists miss',
      'A week in Varkala: The perfect itinerary',
      'Why Varkala is becoming South India\'s favorite escape',
      'Backpacking Kerala: Varkala on a budget',
      'The cliff, the beach, the vibe: Understanding Varkala',
    ],
    imageQueries: ['varkala cliff kerala', 'kerala beach destination', 'india backpacking', 'tropical coastline india', 'beach town india']
  },
  {
    category: 'activities',
    keywords: ['kayaking Kerala backwaters', 'toddy shop experience Kerala', 'things to do in Varkala', 'Jatayu Earth Centre', 'Kerala backwater tour'],
    topics: [
      'Beyond the beach: Unique activities in Varkala',
      'Kayaking through Kerala\'s backwaters: A complete guide',
      'The toddy shop experience: Kerala\'s drinking culture explained',
      'Day trips from Varkala that are actually worth it',
      'Adventure activities near Varkala cliff',
    ],
    imageQueries: ['kerala backwaters kayak', 'toddy shop kerala', 'jatayu statue india', 'kerala coconut trees', 'indian adventure travel']
  },
  {
    category: 'accommodation',
    keywords: ['beach resort Varkala', 'surf stay Kerala', 'boutique hotel Varkala', 'where to stay Varkala cliff', 'Varkala accommodation'],
    topics: [
      'Where to stay in Varkala: Cliff vs Beach breakdown',
      'What makes a great surf stay in Kerala',
      'Varkala accommodation guide for every budget',
      'Why location matters when booking in Varkala',
      'The best areas to stay in Varkala for different vibes',
    ],
    imageQueries: ['beach resort india', 'boutique hotel kerala', 'tropical bedroom resort', 'beach accommodation india', 'cliff hotel view']
  },
  {
    category: 'lifestyle',
    keywords: ['beach lifestyle India', 'digital nomad Kerala', 'Varkala nightlife', 'chill vacation spots India', 'beach party Kerala'],
    topics: [
      'The chill life: Why beach towns like Varkala attract remote workers',
      'Varkala after dark: Where the cliff comes alive',
      'Beach town living: A month in Varkala',
      'India\'s best chill vacation spots for the burnt-out',
      'The art of doing nothing: Embracing slow travel in Kerala',
    ],
    imageQueries: ['beach sunset party', 'digital nomad laptop beach', 'kerala nightlife', 'beach cafe india', 'tropical evening']
  },
  {
    category: 'personality',
    keywords: ['Sudev Nair actor', 'actor turned hotelier', 'celebrity entrepreneur India', 'unconventional career paths', 'Kerala actor business'],
    topics: [
      'From sets to sheets: When actors become hoteliers',
      'The unconventional path: Why creative people make great hospitality entrepreneurs',
      'Second acts: Celebrities who built businesses outside entertainment',
      'What acting teaches you about running a hospitality business',
      'The Varkala dream: People who left cities for beach life',
    ],
    imageQueries: ['entrepreneur portrait', 'boutique hotel owner', 'beach business india', 'creative entrepreneur', 'kerala business']
  },
  {
    category: 'business',
    keywords: ['running a business without MBA', 'hospitality business India', 'small hotel business tips', 'entrepreneur lessons', 'bootstrap business India'],
    topics: [
      'Running a hospitality business without going to business school',
      'What nobody tells you about starting a beach resort',
      'The bootstrap guide to small hospitality businesses in India',
      'Lessons from people who built successful stays without investors',
      'Hospitality 101: What guests actually care about',
    ],
    imageQueries: ['small business owner', 'hotel management', 'entrepreneur working', 'hospitality business', 'boutique hotel operations']
  },
  {
    category: 'wellness',
    keywords: ['surfing mental health', 'beach wellness India', 'yoga Varkala', 'ocean therapy', 'Kerala wellness retreat'],
    topics: [
      'Why surfers swear by the ocean for mental health',
      'Beach wellness: More than just yoga and coconut water',
      'The therapeutic power of learning something new (like surfing)',
      'Kerala\'s wellness scene beyond the Ayurveda clichés',
      'Why the ocean is the best therapist you\'ll ever have',
    ],
    imageQueries: ['beach meditation', 'ocean wellness', 'yoga beach india', 'surfing sunset', 'kerala wellness']
  },
];

// Get current week number for rotation
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.floor(diff / oneWeek);
}

// Fetch trending keywords from Google Trends
async function fetchTrendingKeywords(baseKeywords: string[]): Promise<{ trending: string[]; seasonal: string[] }> {
  const trending: string[] = [];
  const seasonal: string[] = [];
  
  try {
    // Get current month for seasonal content
    const month = new Date().getMonth();
    const seasonalTerms: Record<number, string[]> = {
      0: ['winter travel india', 'new year surf kerala'],
      1: ['february travel kerala', 'valentine beach getaway'],
      2: ['march surf season kerala', 'holi travel india'],
      3: ['april beach holiday india', 'summer vacation kerala'],
      4: ['may travel kerala', 'pre-monsoon surfing'],
      5: ['monsoon surfing india', 'june kerala travel'],
      6: ['monsoon waves kerala', 'july surf india'],
      7: ['august surfing kerala', 'monsoon beach india'],
      8: ['september surf kerala', 'onam festival travel'],
      9: ['october travel kerala', 'diwali holiday beach'],
      10: ['november surf season india', 'winter beach kerala'],
      11: ['december beach holiday india', 'christmas kerala travel'],
    };
    
    seasonal.push(...(seasonalTerms[month] || []));
    
    // Use Google Trends daily trends endpoint (public, no API key needed)
    const trendsResponse = await fetch(
      'https://trends.google.com/trends/api/dailytrends?hl=en-IN&geo=IN&ns=15',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WavealokamBot/1.0)',
        },
      }
    );
    
    if (trendsResponse.ok) {
      const text = await trendsResponse.text();
      // Google Trends returns JSONP with )]}', prefix - remove it
      const jsonStr = text.replace(/^\)\]\}',\n/, '');
      const data = JSON.parse(jsonStr);
      
      // Extract trending topics related to travel/beach/surf
      const trendingSearches = data?.default?.trendingSearchesDays?.[0]?.trendingSearches || [];
      
      for (const search of trendingSearches.slice(0, 10)) {
        const title = search?.title?.query?.toLowerCase() || '';
        const relatedQueries = search?.relatedQueries?.map((q: { query: string }) => q.query.toLowerCase()) || [];
        
        // Check if any trending topic relates to our niche
        const relevantTerms = ['travel', 'beach', 'surf', 'kerala', 'india', 'vacation', 'holiday', 'tourism', 'goa', 'ocean', 'sea'];
        
        if (relevantTerms.some(term => title.includes(term))) {
          trending.push(title);
        }
        
        for (const query of relatedQueries) {
          if (relevantTerms.some(term => query.includes(term))) {
            trending.push(query);
          }
        }
      }
    }
    
    console.log('Fetched seasonal keywords:', seasonal);
    console.log('Fetched trending keywords:', trending);
    
  } catch (error) {
    console.error('Error fetching trends (non-fatal):', error);
  }
  
  return { trending: trending.slice(0, 5), seasonal: seasonal.slice(0, 3) };
}

// Research keyword interest using Google Trends explore
async function getKeywordInterest(keywords: string[]): Promise<Map<string, number>> {
  const interestMap = new Map<string, number>();
  
  try {
    // Query Google Trends for relative interest in our keywords
    const keywordStr = keywords.slice(0, 5).join(',');
    const response = await fetch(
      `https://trends.google.com/trends/api/explore?hl=en-IN&geo=IN&q=${encodeURIComponent(keywordStr)}&tz=-330`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WavealokamBot/1.0)',
        },
      }
    );
    
    if (response.ok) {
      const text = await response.text();
      const jsonStr = text.replace(/^\)\]\}',\n/, '');
      const data = JSON.parse(jsonStr);
      
      // Extract interest values
      const widgets = data?.widgets || [];
      for (const widget of widgets) {
        if (widget.id === 'TIMESERIES') {
          const timeline = widget?.request?.comparisonItem || [];
          timeline.forEach((item: { geo: { country: string }; complexKeywordsRestriction: { keyword: { type: string; value: string }[] } }, idx: number) => {
            const keyword = keywords[idx];
            if (keyword) {
              // Assign relative interest (higher = more popular)
              interestMap.set(keyword, 100 - idx * 20);
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error getting keyword interest (non-fatal):', error);
    // Default to equal interest
    keywords.forEach((k, i) => interestMap.set(k, 100 - i * 10));
  }
  
  return interestMap;
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

// Fetch multiple Unsplash images
async function fetchUnsplashImages(queries: string[], unsplashKey: string, count: number = 5): Promise<Array<{ url: string; attribution: string; query: string }>> {
  const images: Array<{ url: string; attribution: string; query: string }> = [];
  
  for (const query of queries.slice(0, count)) {
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${unsplashKey}`,
          },
        }
      );
      
      if (!response.ok) {
        console.error('Unsplash API error:', response.status);
        continue;
      }
      
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
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return images;
}

// Generate blog content using Lovable AI with enhanced formatting
async function generateBlogContent(
  topic: string,
  keywords: string[],
  contentType: { type: string; template: string },
  imageUrls: string[],
  lovableApiKey: string
): Promise<{ title: string; content: string; excerpt: string; metaTitle: string; metaDescription: string }> {
  
  // Create image placeholders for content
  const imagePlaceholders = imageUrls.map((url, i) => `[IMAGE_${i + 1}]: ${url}`).join('\n');
  
  const prompt = `${BRAND_VOICE}

Content Type: ${contentType.type}
${contentType.template}

Target Keywords: ${keywords.join(', ')}
Topic: ${topic}

Available Images (embed these throughout the content using markdown image syntax):
${imagePlaceholders}

Write an SEO-optimized blog post. CRITICAL REQUIREMENTS:

**PERSPECTIVE (MOST IMPORTANT):**
- Write as an independent travel writer/journalist, NOT as Wavealokam
- THIRD PERSON perspective throughout
- Wavealokam should be mentioned naturally as ONE option, not the focus
- When discussing India surf spots, mention: Mantra Surf Club (Mulki), Covelong Point, Mahabalipuram, Pondicherry surf spots, and Varkala
- When mentioning Varkala surfing, you can mention Wavealokam as "one popular spot" or "a well-known surf stay"
- Avoid naming other specific Varkala surf schools - use generic "local surf schools" or "instructors along the cliff"
- The reader should NOT feel like they're reading a Wavealokam advertisement

**ABSOLUTELY NO EM DASHES (—)**
- Never use em dashes anywhere in the content
- Use commas, semicolons, periods, or parentheses instead
- Restructure sentences if needed

**GRAMMAR & STYLE:**
- Use proper grammar: "learn to surf" NOT "learn surfing"
- Use active voice where possible
- Vary sentence length for readability

**FORMATTING (MANDATORY):**
- Use ## for main section headings (H2)
- Use ### for subsections (H3)
- Use **bold** for key terms and emphasis
- Use bullet points (- ) for lists
- Embed the provided images using: ![Alt text](image_url)

**SEO REQUIREMENTS:**
- Title: 50-60 characters, include primary keyword naturally
- Content: 1500-2000 words
- Include keywords naturally (2-3% density)
- For internal links to Wavealokam, use markdown links like: [check out their rooms](/rooms) or [surf lessons available](/surf-school)

**STRUCTURE:**
- Hook opening paragraph (as a travel writer sharing discoveries)
- Clear H2 sections with descriptive titles
- Each major section should have an image
- Conclusion that feels editorial, not salesy

Respond in this exact JSON format:
{
  "title": "Grammatically correct, SEO-optimized title (50-60 chars)",
  "content": "Full markdown content with proper formatting, images embedded, NO EM DASHES...",
  "excerpt": "Compelling excerpt for preview cards (2-3 sentences, under 200 chars)",
  "metaTitle": "SEO title under 60 chars with keyword",
  "metaDescription": "Meta description under 155 chars with keyword"
}`;

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
          content: 'You are an expert SEO content writer and professional editor. You write grammatically perfect, well-formatted content. You ALWAYS use proper English grammar. You ALWAYS respond with valid JSON.' 
        },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lovable AI error:', error);
    throw new Error(`Failed to generate content: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0];
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0];
  }
  
  const parsed = JSON.parse(jsonStr.trim());
  
  // Grammar check pass - common fixes AND em dash removal
  let fixedContent = parsed.content
    .replace(/learn surfing/gi, 'learn to surf')
    .replace(/learn surf/gi, 'learn to surf')
    .replace(/travel India/gi, 'travel to India')
    .replace(/visit India/gi, 'visit India')
    .replace(/surfing in India/gi, 'surfing in India')
    // Remove all em dashes and replace with appropriate alternatives
    .replace(/\s*—\s*/g, ', ')
    .replace(/—/g, ', ')
    .replace(/\s*–\s*/g, ', ')
    .replace(/–/g, ', ');
  
  let fixedTitle = parsed.title
    .replace(/learn surfing/gi, 'learn to surf')
    .replace(/learn surf/gi, 'learn to surf')
    .replace(/—/g, ':')
    .replace(/–/g, ':');
  
  return {
    ...parsed,
    title: fixedTitle,
    content: fixedContent,
  };
}

// Send email notification via Resend
async function sendNotificationEmail(
  post: { title: string; slug: string; keywords: string[]; excerpt: string },
  resendKey: string,
  supabaseUrl: string
): Promise<void> {
  const blogUrl = `${supabaseUrl.replace('supabase.co', 'lovable.app')}/blog/${post.slug}`;
  
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: 'Wavealokam Blog <blog@wavealokam.com>',
      to: ['sudev@wavealokam.com'],
      subject: `🏄 New Blog Post Published: ${post.title}`,
      html: `
        <h2>New Blog Post Published!</h2>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <p><strong>Target Keywords:</strong> ${post.keywords.join(', ')}</p>
        <p><a href="${blogUrl}">View Post</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated email from your Wavealokam blog system.</p>
      `,
    }),
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting blog post generation...');
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    
    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Determine content strategy based on week rotation
    const weekNum = getWeekNumber();
    const contentTypeIndex = weekNum % CONTENT_TYPES.length;
    const clusterIndex = weekNum % KEYWORD_CLUSTERS.length;
    const topicIndex = weekNum % KEYWORD_CLUSTERS[clusterIndex].topics.length;
    
    const contentType = CONTENT_TYPES[contentTypeIndex];
    const cluster = KEYWORD_CLUSTERS[clusterIndex];
    const baseTopic = cluster.topics[topicIndex];
    
    console.log(`Week ${weekNum}: Starting with ${contentType.type} about "${baseTopic}"`);
    
    // Fetch trending and seasonal keywords from Google Trends
    console.log('Fetching trending keywords from Google Trends...');
    const { trending, seasonal } = await fetchTrendingKeywords(cluster.keywords);
    
    // Combine base keywords with trending and seasonal
    const enhancedKeywords = [
      ...cluster.keywords,
      ...trending,
      ...seasonal,
    ].filter((k, i, arr) => arr.indexOf(k) === i); // Remove duplicates
    
    console.log(`Enhanced keywords: ${enhancedKeywords.join(', ')}`);
    
    // Get keyword interest to prioritize high-interest terms
    const keywordInterest = await getKeywordInterest(cluster.keywords);
    const sortedKeywords = [...cluster.keywords].sort((a, b) => {
      return (keywordInterest.get(b) || 0) - (keywordInterest.get(a) || 0);
    });
    
    // Adjust topic based on seasonal context
    let topic = baseTopic;
    if (seasonal.length > 0 && Math.random() > 0.5) {
      // 50% chance to make topic seasonal
      const month = new Date().toLocaleString('en', { month: 'long' });
      topic = `${month} in Varkala: ${baseTopic}`;
      console.log(`Adjusted topic for seasonality: ${topic}`);
    }
    
    console.log(`Final topic: "${topic}"`);
    console.log(`Primary keywords (by interest): ${sortedKeywords.join(', ')}`);
    
    // Fetch 5 images from Unsplash for the content
    console.log('Fetching images from Unsplash...');
    const images = await fetchUnsplashImages(cluster.imageQueries, unsplashKey, 5);
    console.log(`Fetched ${images.length} images`);
    
    // Generate blog content with enhanced keywords
    const imageUrls = images.map(img => img.url);
    const blogContent = await generateBlogContent(topic, enhancedKeywords.slice(0, 8), contentType, imageUrls, lovableApiKey);
    console.log('Content generated:', blogContent.title);
    
    // Create slug
    const slug = generateSlug(blogContent.title);
    
    // Use first image as featured, store all in images array
    const featuredImage = images.length > 0 ? images[0].url : null;
    const allImages = images.map((img, i) => ({
      url: img.url,
      alt: `${blogContent.title} - Image ${i + 1}`,
      attribution: img.attribution,
    }));
    
    // Insert into database
    const { data: post, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: blogContent.title,
        slug,
        content: blogContent.content,
        excerpt: blogContent.excerpt,
        featured_image: featuredImage,
        images: allImages,
        keywords: cluster.keywords,
        category: cluster.category,
        status: 'published',
        published_at: new Date().toISOString(),
        meta_title: blogContent.metaTitle,
        meta_description: blogContent.metaDescription,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }
    
    console.log('Blog post saved:', post.id);
    
    // Send email notification
    if (resendKey) {
      try {
        await sendNotificationEmail({
          title: blogContent.title,
          slug,
          keywords: cluster.keywords,
          excerpt: blogContent.excerpt,
        }, resendKey, supabaseUrl);
        console.log('Email notification sent');
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
