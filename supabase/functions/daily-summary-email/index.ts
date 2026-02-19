const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function queryDB(table: string, params: Record<string, string> = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`DB query failed: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 24 hours ago (IST = UTC+5:30, so end of day IST ~ 18:30 UTC)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch visitors active in the last 24h
    const visitors: Array<{
      visitor_token: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      summary: string | null;
      conversation_count: number;
      first_seen_at: string;
      last_seen_at: string;
    }> = await queryDB("chat_visitors", {
      last_seen_at: `gte.${since}`,
      order: "last_seen_at.desc",
      limit: "200",
    });

    // Fetch chat insights updated in the last 24h
    const insights: Array<{
      topic: string;
      intent: string;
      question_pattern: string;
      best_answer: string | null;
      occurrence_count: number;
      language: string | null;
      last_seen_at: string;
    }> = await queryDB("chat_insights", {
      last_seen_at: `gte.${since}`,
      order: "occurrence_count.desc",
      limit: "50",
    });

    // Fetch new visitors (first seen in last 24h)
    const newVisitors = visitors.filter((v) => v.first_seen_at >= since);
    const returningVisitors = visitors.filter((v) => v.first_seen_at < since);
    const totalInteractions = visitors.reduce((sum, v) => sum + v.conversation_count, 0);

    const namedVisitors = visitors.filter((v) => v.name);
    const visitorsWithEmail = visitors.filter((v) => v.email);
    const visitorsWithPhone = visitors.filter((v) => v.phone);

    const formatDate = (d: string) =>
      new Date(d).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "short",
        timeStyle: "short",
      });

    const today = new Date().toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build visitor rows
    const visitorRows = visitors
      .map(
        (v) => `
      <tr style="border-bottom:1px solid #f0ede8;">
        <td style="padding:10px 12px;font-size:13px;color:#2d2926;">${v.name || '<span style="color:#999;font-style:italic;">Anonymous</span>'}</td>
        <td style="padding:10px 12px;font-size:13px;color:#2d2926;">${v.email || "—"}</td>
        <td style="padding:10px 12px;font-size:13px;color:#2d2926;">${v.phone || "—"}</td>
        <td style="padding:10px 12px;font-size:13px;color:#2d2926;text-align:center;">${v.conversation_count}</td>
        <td style="padding:10px 12px;font-size:13px;color:#666;">${v.first_seen_at >= since ? '<span style="background:#fef3cd;color:#856404;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">NEW</span>' : "Returning"}</td>
        <td style="padding:10px 12px;font-size:12px;color:#888;">${formatDate(v.last_seen_at)}</td>
      </tr>
      ${
        v.summary
          ? `<tr style="background:#fafaf8;border-bottom:2px solid #f0ede8;">
        <td colspan="6" style="padding:8px 12px 12px 20px;font-size:12px;color:#555;font-style:italic;">💬 ${v.summary}</td>
      </tr>`
          : ""
      }
    `
      )
      .join("");

    // Build insights rows
    const insightRows = insights
      .slice(0, 20)
      .map(
        (i) => `
      <tr style="border-bottom:1px solid #f0ede8;">
        <td style="padding:8px 12px;font-size:13px;color:#2d2926;">${i.topic}</td>
        <td style="padding:8px 12px;font-size:13px;color:#555;">${i.question_pattern}</td>
        <td style="padding:8px 12px;font-size:12px;color:#888;text-align:center;">${i.intent}</td>
        <td style="padding:8px 12px;font-size:12px;color:#888;text-align:center;">${i.language || "en"}</td>
        <td style="padding:8px 12px;font-size:12px;color:#e07b39;text-align:center;font-weight:600;">${i.occurrence_count}×</td>
      </tr>
    `
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f4ef;font-family:'Georgia',serif;">
  <div style="max-width:750px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#2d2926;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:28px;margin-bottom:4px;">🌊</div>
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:0.5px;">Wavealokam Daily Brief</h1>
      <p style="color:#e07b39;margin:6px 0 0;font-size:14px;">${today}</p>
    </div>

    <!-- Stats Row -->
    <div style="background:#fff;padding:24px 32px;display:flex;gap:0;border-bottom:2px solid #f0ede8;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;padding:8px 0;border-right:1px solid #f0ede8;">
            <div style="font-size:36px;font-weight:700;color:#e07b39;">${visitors.length}</div>
            <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Total Visitors</div>
          </td>
          <td style="text-align:center;padding:8px 0;border-right:1px solid #f0ede8;">
            <div style="font-size:36px;font-weight:700;color:#2d9b6f;">${newVisitors.length}</div>
            <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">New Today</div>
          </td>
          <td style="text-align:center;padding:8px 0;border-right:1px solid #f0ede8;">
            <div style="font-size:36px;font-weight:700;color:#5b8fc9;">${returningVisitors.length}</div>
            <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Returning</div>
          </td>
          <td style="text-align:center;padding:8px 0;border-right:1px solid #f0ede8;">
            <div style="font-size:36px;font-weight:700;color:#9b7fd4;">${totalInteractions}</div>
            <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Chat Turns</div>
          </td>
          <td style="text-align:center;padding:8px 0;">
            <div style="font-size:36px;font-weight:700;color:#c0703a;">${namedVisitors.length}</div>
            <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Named Leads</div>
          </td>
        </tr>
      </table>
    </div>

    ${
      visitorsWithEmail.length > 0 || visitorsWithPhone.length > 0
        ? `<!-- Leads Highlight -->
    <div style="background:#fff8f0;padding:16px 32px;border-bottom:2px solid #f0ede8;">
      <p style="margin:0;font-size:14px;color:#2d2926;">📬 <strong>${visitorsWithEmail.length}</strong> email${visitorsWithEmail.length !== 1 ? "s" : ""} captured &nbsp;·&nbsp; 📱 <strong>${visitorsWithPhone.length}</strong> phone number${visitorsWithPhone.length !== 1 ? "s" : ""} captured</p>
      ${
        visitorsWithEmail.length > 0
          ? `<p style="margin:8px 0 0;font-size:13px;color:#555;">${visitorsWithEmail.map((v) => `${v.name || "Anonymous"} &lt;${v.email}&gt;`).join(" &nbsp;·&nbsp; ")}</p>`
          : ""
      }
    </div>`
        : ""
    }

    <!-- Visitors Table -->
    ${
      visitors.length > 0
        ? `<div style="background:#fff;padding:24px 32px 8px;">
      <h2 style="font-size:16px;color:#2d2926;margin:0 0 16px;font-weight:700;">👥 Visitor Activity</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #f0ede8;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f7f4ef;">
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:left;font-weight:600;">Name</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:left;font-weight:600;">Email</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:left;font-weight:600;">Phone</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:center;font-weight:600;">Chats</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:left;font-weight:600;">Type</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:left;font-weight:600;">Last Seen</th>
          </tr>
        </thead>
        <tbody>${visitorRows}</tbody>
      </table>
    </div>`
        : `<div style="background:#fff;padding:32px;text-align:center;color:#888;font-style:italic;">No visitor activity recorded today.</div>`
    }

    <!-- Drifter Insights -->
    ${
      insights.length > 0
        ? `<div style="background:#fff;padding:24px 32px 8px;margin-top:2px;">
      <h2 style="font-size:16px;color:#2d2926;margin:0 0 4px;font-weight:700;">🤖 What Drifter Was Asked</h2>
      <p style="font-size:12px;color:#888;margin:0 0 16px;">Top conversation patterns in the last 24 hours</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #f0ede8;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f7f4ef;">
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:left;font-weight:600;">Topic</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:left;font-weight:600;">Question Pattern</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:center;font-weight:600;">Intent</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:center;font-weight:600;">Lang</th>
            <th style="padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:center;font-weight:600;">Freq</th>
          </tr>
        </thead>
        <tbody>${insightRows}</tbody>
      </table>
    </div>`
        : ""
    }

    <!-- Footer -->
    <div style="background:#2d2926;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;margin-top:2px;">
      <p style="color:#888;font-size:12px;margin:0;">Wavealokam &nbsp;·&nbsp; Daily Intelligence Report &nbsp;·&nbsp; Auto-generated by Drifter</p>
      <p style="color:#555;font-size:11px;margin:6px 0 0;">Varkala, Kerala &nbsp;🌊</p>
    </div>

  </div>
</body>
</html>`;

    // Send email
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Drifter <onboarding@resend.dev>",
        to: ["sudevsudev1@gmail.com"],
        subject: `🌊 Wavealokam Daily Brief — ${today} (${visitors.length} visitor${visitors.length !== 1 ? "s" : ""})`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    const result = await emailRes.json();
    console.log("Daily summary email sent:", result.id);

    return new Response(
      JSON.stringify({
        success: true,
        visitors: visitors.length,
        new_visitors: newVisitors.length,
        interactions: totalInteractions,
        insights: insights.length,
        email_id: result.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Daily summary error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
