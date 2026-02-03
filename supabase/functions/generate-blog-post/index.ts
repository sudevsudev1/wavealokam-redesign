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

// Content type templates with formatting guidelines
const CONTENT_TYPES = [
  { 
    type: 'listicle', 
    template: 'Create a numbered list article with 7-10 items. Each item MUST have an H2 heading with the number and catchy title, followed by 2-3 paragraphs. Use **bold** for key phrases and *italics* for emphasis.' 
  },
  { 
    type: 'guide', 
    template: 'Create a comprehensive guide with H2 sections: Introduction, What You Need to Know, Step-by-Step Guide, Pro Tips, and Conclusion. Use H3 for subsections. Include **bold** key terms and *italics* for emphasis. Add bullet points for lists.' 
  },
  { 
    type: 'opinion', 
    template: 'Write a personal, opinionated piece with H2 sections for main arguments. Use first-person perspective. Include **bold** for strong statements and *italics* for personal asides. Add blockquotes for memorable statements.' 
  },
  { 
    type: 'seasonal', 
    template: 'Write about time-sensitive travel with H2 sections: Overview, What to Expect, What to Pack, Best Activities, and Final Thoughts. Use **bold** for important dates/info and *italics* for tips.' 
  },
];

// Keyword clusters for rotation
const KEYWORD_CLUSTERS = [
  {
    category: 'surfing',
    keywords: ['learn to surf in India', 'surf lessons Kerala', 'beginner surfing Varkala', 'surf school India', 'best surf spots Kerala'],
    topics: [
      'Complete guide to learning to surf in Varkala',
      'Best surf spots in Kerala for beginners',
      'What to expect from your first surf lesson in India',
      'Why Varkala is India\'s hidden surfing gem',
      'Surf season in Kerala: When and where to catch waves',
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
      'Why Varkala beats Goa for beach lovers',
      'Backpacking Kerala: Varkala on a budget',
    ],
    imageQueries: ['varkala cliff kerala', 'kerala beach destination', 'india backpacking', 'tropical coastline india', 'beach town india']
  },
  {
    category: 'activities',
    keywords: ['kayaking Kerala backwaters', 'toddy shop experience Kerala', 'things to do in Varkala', 'Jatayu Earth Centre', 'Kerala backwater tour'],
    topics: [
      'Beyond the beach: Unique activities in Varkala',
      'Kayaking through Kerala\'s backwaters: A local guide',
      'The toddy shop experience: Kerala\'s drinking culture',
      'Day trips from Varkala worth taking',
      'Adventure activities near Varkala cliff',
    ],
    imageQueries: ['kerala backwaters kayak', 'toddy shop kerala', 'jatayu statue india', 'kerala coconut trees', 'indian adventure travel']
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
    ],
    imageQueries: ['beach resort india', 'boutique hotel kerala', 'tropical bedroom resort', 'beach accommodation india', 'cliff hotel view']
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

**GRAMMAR & STYLE:**
- Use proper grammar: "learn to surf" NOT "learn surfing", "travel to India" NOT "travel India"
- Proofread for spelling and grammar errors
- Use active voice where possible
- Vary sentence length for readability

**FORMATTING (MANDATORY):**
- Use ## for main section headings (H2)
- Use ### for subsections (H3)
- Use **bold** for key terms, important info, and emphasis
- Use *italics* for asides, tips, and softer emphasis
- Use bullet points (- ) for lists
- Use numbered lists (1. 2. 3.) for step-by-step content
- Use > for notable quotes or callouts
- Embed the provided images using: ![Alt text](image_url)

**SEO REQUIREMENTS:**
- Title: 50-60 characters, include primary keyword naturally
- Content: 1500-2000 words
- Include keywords naturally (2-3% density)
- Use keywords in at least 2 H2 headings
- Internal links: mention booking, rooms, surf school, activities at Wavealokam

**STRUCTURE:**
- Hook opening paragraph
- Clear H2 sections with descriptive titles
- Each major section should have an image
- Conclusion with call-to-action

Respond in this exact JSON format:
{
  "title": "Grammatically correct, SEO-optimized title (50-60 chars)",
  "content": "Full markdown content with proper formatting, images embedded...",
  "excerpt": "Compelling excerpt for preview cards (2-3 sentences, under 200 chars)",
  "metaTitle": "SEO title under 60 chars with keyword",
  "metaDescription": "Meta description under 155 chars with keyword and call-to-action"
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
  
  // Grammar check pass - common fixes
  let fixedContent = parsed.content
    .replace(/learn surfing/gi, 'learn to surf')
    .replace(/learn surf/gi, 'learn to surf')
    .replace(/travel India/gi, 'travel to India')
    .replace(/visit India/gi, 'visit India')
    .replace(/surfing in India/gi, 'surfing in India');
  
  let fixedTitle = parsed.title
    .replace(/learn surfing/gi, 'learn to surf')
    .replace(/learn surf/gi, 'learn to surf');
  
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
    const topic = cluster.topics[topicIndex];
    
    console.log(`Week ${weekNum}: Generating ${contentType.type} about "${topic}"`);
    console.log(`Keywords: ${cluster.keywords.join(', ')}`);
    
    // Fetch 5 images from Unsplash for the content
    console.log('Fetching images from Unsplash...');
    const images = await fetchUnsplashImages(cluster.imageQueries, unsplashKey, 5);
    console.log(`Fetched ${images.length} images`);
    
    // Generate blog content with images
    const imageUrls = images.map(img => img.url);
    const blogContent = await generateBlogContent(topic, cluster.keywords, contentType, imageUrls, lovableApiKey);
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
