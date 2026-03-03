import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { image_base64 } = await req.json();
    if (!image_base64) throw new Error("image_base64 is required");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an OCR extraction assistant for a hotel guest check-in form. Extract guest details from the image of a handwritten or printed check-in form. Return ONLY the extracted data using the provided tool.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all guest details from this check-in form image. Look for: guest name, phone number, email, number of adults, number of children, ID proof type (Aadhaar/Passport/Driving License/Voter ID/PAN Card), ID proof number, purpose of visit, booking source, expected checkout date, and any notes or special requests.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image_base64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_guest_details",
              description: "Extract structured guest check-in details from the form image",
              parameters: {
                type: "object",
                properties: {
                  guest_name: { type: "string", description: "Full name of the guest" },
                  phone: { type: "string", description: "Phone number" },
                  email: { type: "string", description: "Email address" },
                  adults: { type: "number", description: "Number of adults, default 1" },
                  children: { type: "number", description: "Number of children, default 0" },
                  id_proof_type: { type: "string", description: "Type of ID proof: Aadhaar, Passport, Driving License, Voter ID, or PAN Card" },
                  purpose: { type: "string", description: "Purpose: Leisure, Business, Family, Event, or Other" },
                  source: { type: "string", description: "Booking source: Direct, Booking.com, MakeMyTrip, Agoda, Cleartrip, or Other" },
                  expected_check_out: { type: "string", description: "Expected checkout date in YYYY-MM-DD format if found" },
                  notes: { type: "string", description: "Any special requests or notes" },
                },
                required: ["guest_name"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_guest_details" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No extraction result");

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
