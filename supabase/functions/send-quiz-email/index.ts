import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuizEmailRequest {
  answer1: string;
  answer2: string;
}

async function sendEmail(options: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
  
  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { answer1, answer2 }: QuizEmailRequest = await req.json();

    console.log("Received quiz email request with answers:", answer1, answer2);

    // Build the email HTML body
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF8235 0%, #f97316 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">WAVEALOKAM</h1>
          <p style="color: white; margin: 10px 0 0 0;">Discount Quiz Submission 😂</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Hey Wavealokam, I answered your 2 stupid questions. Now give me my discount! 😂</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px;">
            <p style="font-weight: bold; color: #FF8235; margin-bottom: 5px;">Q1: What does Wavealokam mean?</p>
            <p style="margin: 0; color: #333;">A1: ${answer1 || '(Not answered)'}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
            <p style="font-weight: bold; color: #FF8235; margin-bottom: 5px;">Q2: What is the easiest way to get free breakfast from the owner Amardeep?</p>
            <p style="margin: 0; color: #333;">A2: ${answer2 || '(Not answered)'}</p>
          </div>
        </div>
        
        <div style="padding: 20px; background: #333; color: #999; text-align: center; font-size: 12px;">
          <p>This quiz was submitted from the Wavealokam website</p>
        </div>
      </div>
    `;

    console.log("Sending quiz email to sudevsudev1@gmail.com");

    const emailResponse = await sendEmail({
      from: "Wavealokam Quiz <onboarding@resend.dev>",
      to: ["sudevsudev1@gmail.com"],
      subject: "New Discount Quiz Submission 😂",
      html: emailHtml,
    });

    console.log("Quiz email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-quiz-email function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
