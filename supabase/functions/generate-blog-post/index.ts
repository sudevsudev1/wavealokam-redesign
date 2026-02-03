import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Wavealokam brand voice guidelines
const BRAND_VOICE = `
You are writing for Wavealokam, a surf resort in Varkala, Kerala, India.

Brand Voice:
- Witty, honest, and conversational - like talking to a well-traveled friend
- Self-deprecating humor is welcome
- No corporate speak or generic travel writing
- Real talk about India travel (the chaos, the beauty, all of it)
- Mentions of local experiences: toddy shops, Chechi's breakfast, kayaking backwaters
- Occasional pop culture references

Tone Examples:
- "You can walk barefoot here. Emotionally and literally."
- Not "experience world-class surfing" but "learn to stand on a board without looking ridiculous"
- Not "luxurious amenities" but "clean sheets, good AC, and strong WiFi"
`;

// Content type templates
const CONTENT_TYPES = [
  { type: 'listicle', template: 'Create a numbered list article with 7-10 items. Each item should have a catchy subheading and 2-3 paragraphs of engaging content.' },
  { type: 'guide', template: 'Create a comprehensive guide with clear sections: Introduction, What You Need to Know, Step-by-Step/How-To, Pro Tips, and Conclusion.' },
  { type: 'opinion', template: 'Write a personal, opinionated piece that shares unique insights. Use first-person perspective and include specific anecdotes.' },
  { type: 'seasonal', template: 'Write about time-sensitive travel information. Include what to expect, what to pack, and why this season is special.' },
];

// Keyword clusters for rotation
const KEYWORD_CLUSTERS = [
  {
    category: 'surfing',
    keywords: ['learn surfing India', 'surf lessons Kerala', 'beginner surfing Varkala', 'surf school India', 'best surf spots Kerala'],
    topics: [
      'Complete guide to learning surfing in Varkala',
      'Best surf spots in Kerala for beginners',
      'What to expect from your first surf lesson in India',
      'Surfing in India: Why Varkala is the hidden gem',
      'Surf season in Kerala: When and where to catch waves',
    ]
  },
  {
    category: 'travel',
    keywords: ['Varkala travel guide', 'Kerala beach destinations', 'backpacking South India', 'things to do Varkala', 'Varkala cliff beaches'],
    topics: [
      'Varkala travel guide: Everything you need to know',
      'Hidden gems of Varkala most tourists miss',
      'A week in Varkala: The perfect itinerary',
      'Why Varkala beats Goa for beach lovers',
      'Backpacking Kerala: Varkala on a budget',
    ]
  },
  {
    category: 'activities',
    keywords: ['kayaking Kerala backwaters', 'toddy shop experience Kerala', 'things to do Varkala', 'Jatayu Earth Centre', 'Kerala backwater tour'],
    topics: [
      'Beyond the beach: Unique activities in Varkala',
      'Kayaking through Kerala backwaters: A local guide',
      'The toddy shop experience: Kerala drinking culture',
      'Day trips from Varkala worth taking',
      'Adventure activities near Varkala cliff',
    ]
  },
  {
    category: 'accommodation',
    keywords: ['beach resort Varkala', 'surf stay Kerala', 'boutique hotel Varkala', 'where to stay Varkala cliff', 'Varkala accommodation'],
    topics: [
      'Where to stay in Varkala: Cliff vs Beach',
      'What makes a great surf stay in Kerala',
      'Varkala accommodation guide for every budget',
      'Why location matters when booking in Varkala',
      'The best areas to stay in Varkala',
    ]
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

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

// Fetch Unsplash image
async function fetchUnsplashImage(query: string, unsplashKey: string): Promise<{ url: string; attribution: string } | null> {
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
      return null;
    }
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const photo = data.results[0];
      return {
        url: photo.urls.regular,
        attribution: `Photo by ${photo.user.name} on Unsplash`,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Unsplash image:', error);
    return null;
  }
}

// Generate blog content using Lovable AI (OpenAI GPT-5)
async function generateBlogContent(
  topic: string,
  keywords: string[],
  contentType: { type: string; template: string },
  lovableApiKey: string
): Promise<{ title: string; content: string; excerpt: string; metaTitle: string; metaDescription: string }> {
  const prompt = `${BRAND_VOICE}

Content Type: ${contentType.type}
${contentType.template}

Target Keywords: ${keywords.join(', ')}
Topic: ${topic}

Write an SEO-optimized blog post about this topic. Requirements:
1. Title should be catchy and include the primary keyword
2. Content should be 1200-1800 words in Markdown format
3. Include internal linking opportunities (mention booking, rooms, surf school, activities at Wavealokam)
4. Use H2 and H3 headers appropriately
5. Include a compelling meta description (under 155 characters)
6. Write in the Wavealokam brand voice - witty, honest, conversational

Respond in this exact JSON format:
{
  "title": "SEO-optimized title",
  "content": "Full markdown content...",
  "excerpt": "Compelling excerpt for preview cards (2-3 sentences)",
  "metaTitle": "SEO title under 60 chars",
  "metaDescription": "Meta description under 155 chars"
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
        { role: 'system', content: 'You are an expert SEO content writer for a surf resort in Kerala, India. Always respond with valid JSON.' },
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
  
  return JSON.parse(jsonStr.trim());
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
    const topic = cluster.topics[topicIndex];
    
    console.log(`Week ${weekNum}: Generating ${contentType.type} about "${topic}"`);
    console.log(`Keywords: ${cluster.keywords.join(', ')}`);
    
    // Generate blog content
    const blogContent = await generateBlogContent(topic, cluster.keywords, contentType, lovableApiKey);
    console.log('Content generated:', blogContent.title);
    
    // Fetch featured image from Unsplash
    const searchQuery = `${cluster.category} Kerala beach`;
    const featuredImage = await fetchUnsplashImage(searchQuery, unsplashKey);
    console.log('Featured image:', featuredImage?.url || 'None');
    
    // Create slug
    const slug = generateSlug(blogContent.title);
    
    // Prepare images array
    const images = featuredImage ? [{
      url: featuredImage.url,
      alt: blogContent.title,
      attribution: featuredImage.attribution,
    }] : [];
    
    // Insert into database
    const { data: post, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: blogContent.title,
        slug,
        content: blogContent.content,
        excerpt: blogContent.excerpt,
        featured_image: featuredImage?.url || null,
        images,
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
