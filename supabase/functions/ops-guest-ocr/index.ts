import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOMESTIC_PROMPT = `You are an OCR extraction assistant for a hotel (Wavealokam) DOMESTIC guest check-in form. The form has these fields:
- Room No
- Name (guest full name)
- Address
- Contact Number
- Email Id
- Arriving From
- Heading to
- Check-in Date & Check-in Time
- Check-out Date & Check-out Time
- Identity Proof type: one of Passport, Aadhaar Card, Driving License, Election Card (ticked/circled)
- Guest 1 and Guest 2 signatures (ignore these)

Extract all filled fields from the handwritten form image. Return using the provided tool.`;

const INTERNATIONAL_PROMPT = `You are an OCR extraction assistant for a hotel (Wavealokam) INTERNATIONAL guest check-in form. The form has these sections:

**Booking Information:**
- Check-in Date, Check-out Date, Room Type, Number of Guests, Number of Nights, Special Requests

**Payment Information:**
- Payment mode (Cash / GPay-UPI / Card), Transaction Id

**Room No.**

**Guest Information:**
- Name, Address, City, State, Pin code, Phone Number, Email, Date of Birth, Passport/ID Number, E-VISA Number, Nationality, Arrived From, Next Destination

Extract all filled fields from the handwritten form image. Return using the provided tool.`;

const domesticTool = {
  type: "function" as const,
  function: {
    name: "extract_domestic_guest",
    description: "Extract structured guest check-in details from a domestic form image",
    parameters: {
      type: "object",
      properties: {
        guest_name: { type: "string", description: "Full name of the guest" },
        address: { type: "string", description: "Full address" },
        phone: { type: "string", description: "Contact number" },
        email: { type: "string", description: "Email address" },
        arriving_from: { type: "string", description: "Where the guest is arriving from" },
        heading_to: { type: "string", description: "Where the guest is heading to next" },
        expected_check_out: { type: "string", description: "Check-out date in YYYY-MM-DD format" },
        id_proof_type: { type: "string", description: "Identity proof type: Aadhaar, Passport, Driving License, or Voter ID" },
        adults: { type: "number", description: "Number of guests (adults), default 1" },
        children: { type: "number", description: "Number of children, default 0" },
        notes: { type: "string", description: "Any special requests or notes" },
      },
      required: ["guest_name"],
      additionalProperties: false,
    },
  },
};

const internationalTool = {
  type: "function" as const,
  function: {
    name: "extract_international_guest",
    description: "Extract structured guest check-in details from an international form image",
    parameters: {
      type: "object",
      properties: {
        guest_name: { type: "string", description: "Full name of the guest" },
        address: { type: "string", description: "Street address" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State or province" },
        pincode: { type: "string", description: "Pin/Zip code" },
        phone: { type: "string", description: "Phone number" },
        email: { type: "string", description: "Email address" },
        date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
        passport_number: { type: "string", description: "Passport or ID number" },
        evisa_number: { type: "string", description: "E-VISA number if present" },
        nationality: { type: "string", description: "Nationality / country" },
        arriving_from: { type: "string", description: "Arrived from (city/country)" },
        heading_to: { type: "string", description: "Next destination" },
        expected_check_out: { type: "string", description: "Check-out date in YYYY-MM-DD format" },
        number_of_nights: { type: "number", description: "Number of nights" },
        adults: { type: "number", description: "Number of guests, default 1" },
        payment_mode: { type: "string", description: "Payment mode: Cash, GPay/UPI, or Card" },
        transaction_id: { type: "string", description: "Transaction ID if digital payment" },
        notes: { type: "string", description: "Special requests" },
      },
      required: ["guest_name"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { image_base64, form_type } = await req.json();
    if (!image_base64) throw new Error("image_base64 is required");

    const isDomestic = form_type !== "international";
    const systemPrompt = isDomestic ? DOMESTIC_PROMPT : INTERNATIONAL_PROMPT;
    const tool = isDomestic ? domesticTool : internationalTool;
    const toolName = isDomestic ? "extract_domestic_guest" : "extract_international_guest";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: isDomestic
                  ? "Extract all guest details from this DOMESTIC check-in form image. Look for: name, address, contact number, email, arriving from, heading to, check-in/check-out dates, identity proof type (which one is ticked or circled among Passport, Aadhaar Card, Driving License, Election Card)."
                  : "Extract all guest details from this INTERNATIONAL check-in form image. Look for: booking info (dates, room type, nights, requests), payment info (mode, transaction id), guest info (name, address, city, state, pincode, phone, email, DOB, passport/ID number, e-visa, nationality, arrived from, next destination).",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image_base64}` },
              },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
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
