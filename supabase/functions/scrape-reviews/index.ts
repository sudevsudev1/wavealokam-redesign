import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google Maps place URL for Wavealokam
const GOOGLE_MAPS_URL = "https://www.google.com/maps/place/Wavealokam/@8.7323,76.7102";
const SEARCH_QUERY = "Wavealokam Varkala reviews";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function hashReview(name: string, text: string): string {
  // Simple deterministic hash from reviewer name + first 100 chars of review
  const input = `${name || 'anon'}::${(text || '').slice(0, 100)}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `google_${Math.abs(hash).toString(36)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Starting Google Reviews scrape via Firecrawl search...");

    // Use Firecrawl search to find Google reviews
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchResponse.json();
    if (!searchResponse.ok) {
      console.error("Firecrawl search error:", searchData);
      throw new Error(`Firecrawl search failed: ${searchData.error || searchResponse.status}`);
    }

    // Also try scraping the Google Maps page directly
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: GOOGLE_MAPS_URL,
        formats: ["markdown"],
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    // Combine all scraped content
    const allContent: string[] = [];
    
    if (searchData.data) {
      for (const result of searchData.data) {
        if (result.markdown) allContent.push(result.markdown);
      }
    }
    
    if (scrapeData?.data?.markdown) {
      allContent.push(scrapeData.data.markdown);
    }

    const combinedContent = allContent.join("\n\n---\n\n");
    
    if (!combinedContent.trim()) {
      console.log("No content scraped, nothing to process.");
      return new Response(JSON.stringify({ success: true, message: "No content found", reviews_added: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Scraped ${allContent.length} pages, total ${combinedContent.length} chars. Sending to AI for extraction...`);

    // Use AI to extract structured reviews from the scraped content
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a review extractor. Extract individual guest reviews about Wavealokam from the provided content. Return ONLY valid JSON array. Each review object must have:
- "name": reviewer name (string, or null if unknown)
- "rating": numeric rating 1-5 (number, or null if not found)  
- "text": the actual review text (string, required - skip if empty)
- "date": review date if mentioned (string, or null)
- "language": detected language code like "en", "fr", "ru", "de" etc.

Only extract reviews that are specifically about Wavealokam / Wave Alokam. Skip irrelevant content. If no reviews found, return [].`
          },
          {
            role: "user",
            content: `Extract Wavealokam reviews from this scraped content:\n\n${combinedContent.slice(0, 30000)}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI extraction error:", aiResponse.status, errText);
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON from AI response (handle markdown code blocks)
    let reviews: any[];
    try {
      const jsonStr = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      reviews = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response as JSON:", aiContent.slice(0, 500));
      reviews = [];
    }

    if (!Array.isArray(reviews) || reviews.length === 0) {
      console.log("No reviews extracted.");
      return new Response(JSON.stringify({ success: true, message: "No reviews extracted", reviews_added: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Extracted ${reviews.length} reviews. Upserting to database...`);

    const supabase = getSupabase();
    let added = 0;
    let skipped = 0;

    for (const review of reviews) {
      if (!review.text || review.text.trim().length < 10) {
        skipped++;
        continue;
      }

      const reviewHash = hashReview(review.name, review.text);
      const isFeatured = (review.rating ?? 5) >= 4 && review.text.length > 50;

      const { error } = await supabase.from("guest_reviews").upsert(
        {
          platform: "google",
          reviewer_name: review.name || null,
          rating: review.rating || null,
          review_text: review.text.trim(),
          review_date: review.date || null,
          language: review.language || "en",
          is_featured: isFeatured,
          review_hash: reviewHash,
          scraped_at: new Date().toISOString(),
        },
        { onConflict: "review_hash" }
      );

      if (error) {
        console.error("Upsert error for review:", reviewHash, error.message);
        skipped++;
      } else {
        added++;
      }
    }

    console.log(`Done. Added/updated: ${added}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({ success: true, reviews_found: reviews.length, reviews_added: added, reviews_skipped: skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-reviews error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
