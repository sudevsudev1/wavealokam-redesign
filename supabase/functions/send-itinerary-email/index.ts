import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

interface ItineraryEmailRequest {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  itineraryDetails: string;
  pdfBase64: string;
  pdfFileName: string;
}

async function sendEmail(options: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { 
      guestName, 
      guestEmail, 
      guestPhone, 
      itineraryDetails, 
      pdfBase64,
      pdfFileName 
    }: ItineraryEmailRequest = await req.json();

    if (!guestName || !guestEmail || !guestPhone || !itineraryDetails) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    const cleanPhone = guestPhone.replace(/[\s-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone format." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const safeName = escapeHtml(guestName);
    const safeEmail = escapeHtml(guestEmail);
    const safePhone = escapeHtml(guestPhone);
    const safeDetails = escapeHtml(itineraryDetails);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF8235 0%, #f97316 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">WAVEALOKAM</h1>
          <p style="color: white; margin: 10px 0 0 0;">New Itinerary Request</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Guest Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safePhone}</td>
            </tr>
          </table>
          
          <h2 style="color: #333; margin-top: 30px;">Itinerary Details</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
${safeDetails}
          </div>
        </div>
        
        <div style="padding: 20px; background: #333; color: #999; text-align: center; font-size: 12px;">
          <p>This itinerary was generated from the Wavealokam website</p>
        </div>
      </div>
    `;

    const attachments = pdfBase64 ? [{
      filename: pdfFileName || 'Wavealokam-Itinerary.pdf',
      content: pdfBase64,
    }] : [];

    const emailResponse = await sendEmail({
      from: "Wavealokam Itinerary <onboarding@resend.dev>",
      to: ["wavealokam@gmail.com"],
      subject: `New Itinerary Request from ${safeName}`,
      html: emailHtml,
      attachments,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-itinerary-email function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to send email. Please try again or contact us directly." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
