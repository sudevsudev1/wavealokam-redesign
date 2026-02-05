 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate secret token
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const expectedToken = Deno.env.get('BLOG_CRON_SECRET');
    
    if (!token || token !== expectedToken) {
      console.error('Invalid or missing token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }
    
    // Determine which selector to call based on current day (Asia/Kolkata timezone)
    // Sunday = 0, Wednesday = 3
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const dayOfWeek = istTime.getUTCDay();
    
    // Allow manual override via query param
    const forceSelector = url.searchParams.get('selector');
    
    let selectorFunction: string;
    let selectorName: string;
    
    if (forceSelector === 'weekly' || forceSelector === 'seasonal') {
      selectorFunction = forceSelector === 'weekly' ? 'weekly-selector' : 'seasonal-selector';
      selectorName = forceSelector;
    } else if (dayOfWeek === 0) {
      // Sunday - Weekly Opportunity Post
      selectorFunction = 'weekly-selector';
      selectorName = 'weekly';
    } else if (dayOfWeek === 3) {
      // Wednesday - Seasonal Post
      selectorFunction = 'seasonal-selector';
      selectorName = 'seasonal';
    } else {
      // Not a scheduled day
      console.log(`Not a scheduled day (day ${dayOfWeek}). Use ?selector=weekly or ?selector=seasonal to force.`);
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: `Not a scheduled day (current day: ${dayOfWeek}). Sunday=0, Wednesday=3.`,
          hint: 'Use ?selector=weekly or ?selector=seasonal to force run.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    console.log(`Cron trigger: Starting ${selectorName} blog generation...`);
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Call the appropriate selector function
    const selectorUrl = `${supabaseUrl}/functions/v1/${selectorFunction}`;
    
    const response = await fetch(selectorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ trigger: 'cron' }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Selector function error:', result);
      throw new Error(result.error || `Failed to run ${selectorName} selector`);
    }
    
    console.log(`${selectorName} blog post generated successfully:`, result);
    
    return new Response(
      JSON.stringify({
        success: true,
        selector: selectorName,
        message: result.skipped 
          ? `${selectorName} selector skipped: ${result.reason}` 
          : `${selectorName} blog post generated and published`,
        topic: result.topic,
        post: result.post,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Cron trigger error:', error);
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
