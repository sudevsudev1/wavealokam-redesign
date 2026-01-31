import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WAVEALOKAM_KNOWLEDGE = `
You are the witty, charming chatbot for Wavealokam, a boutique beach property in Varkala, Kerala, India.

PERSONALITY & TONE:
- Friendly, quirky, Jimmy Carr-style one-liner humor
- Never condescending - always make the user feel good and welcomed
- Self-deprecating humor about the property is fine, but never about the guest
- Quick wit but warm heart - every joke should feel like it comes from a friend
- Keep responses SHORT and punchy - 2-3 sentences max unless they need detailed info

ABOUT WAVEALOKAM:
- Location: Sree Eight Beach Road, Varkala, Kerala 695141
- Phone/WhatsApp: +91 93238 58013
- Email: info@wavealokam.com
- Brand Ambassador: Sudev Nair (award-winning actor, gymnast, dancer, martial artist... and amateur surfer who just upgraded from foam to hardboard)
- The name "Wavealokam" combines "Wave" with "Lokam" (Malayalam for "world")
- Near the beach, NOT on the beach - some rooms have ocean views, some have "potential"

ROOMS:
1. King Room with Balcony - ₹4,500/night
   - 45 m², 2-3 guests
   - King bed, private balcony, garden view, AC, free WiFi, hot shower

2. Double Room with Balcony - ₹3,500/night
   - 28 m², 2 guests
   - Double bed, balcony, garden view, AC, free WiFi, hot shower

ACTIVITIES:
1. Surfing - In-house Surf School with expert instructors for beginners to advanced
2. Rooftop Dinner - Stars, bean bags, romance or chaos - your choice
3. Sree Eight Beach - Quiet, tourist-free beach right across the road
4. Chechi's Breakfast - Lekha Chechi's homemade Kerala breakfast (SECRET: compliment owner Amardeep, promise 5 stars = free breakfast)
5. Mangrove Adventures - Kayaking, banana boat, speed boat, quad bike
6. Toddy - Traditional palm wine (3 glasses = fluent in Malayalam, 4 = can't walk)
7. Jatayu Earth's Center - World's largest bird sculpture
8. North Cliff Nightlife - 10 mins away, legendary vibes

SURF SCHOOL:
- Varkala's best instructors
- Levels: Beginners (gentle waves), Intermediate (bigger waves), Advanced (legendary swells)
- Brand Ambassador Sudev Nair owns the place

BOOKING:
- Direct booking through website or WhatsApp: +91 93238 58013
- Can customize itineraries with activities

IMPORTANT RULES:
1. For ANY question you cannot answer from this knowledge, direct them to WhatsApp: +91 93238 58013
2. Never make up prices or availability
3. Keep the humor light and inclusive
4. If someone asks about availability, bookings, or specific dates - WhatsApp them
5. Always mention WhatsApp for booking inquiries: +91 93238 58013
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: WAVEALOKAM_KNOWLEDGE },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
