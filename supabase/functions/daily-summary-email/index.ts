const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GA4_PROPERTY_ID = Deno.env.get("GA4_PROPERTY_ID");
const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

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

// ── Google Auth JWT helpers ─────────────────────────────────────────────────

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(scopes: string[]): Promise<string | null> {
  try {
    const email = GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let rawKey = GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
    // Handle both literal \n and actual newlines
    if (rawKey.includes("\\n")) rawKey = rawKey.replace(/\\n/g, "\n");
    if (!email || !rawKey) return null;

    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64UrlEncode(
      JSON.stringify({
        iss: email,
        scope: scopes.join(" "),
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      })
    );

    const signingInput = `${header}.${payload}`;

    // Import private key - clean PEM thoroughly
    const pemBody = rawKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, "")
      .replace(/-----END PRIVATE KEY-----/g, "")
      .replace(/-----BEGIN RSA PRIVATE KEY-----/g, "")
      .replace(/-----END RSA PRIVATE KEY-----/g, "")
      .replace(/\r\n/g, "")
      .replace(/\r/g, "")
      .replace(/\n/g, "")
      .replace(/\s/g, "")
      .trim();

    const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );

    const jwt = `${signingInput}.${base64UrlEncodeBuffer(signature)}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token error:", await tokenRes.text());
      return null;
    }

    const { access_token } = await tokenRes.json();
    return access_token;
  } catch (e) {
    console.error("getGoogleAccessToken error:", e);
    return null;
  }
}

// ── GA4 Data API ────────────────────────────────────────────────────────────

interface GA4Stats {
  sessions: number;
  users: number;
  pageviews: number;
  topPages: Array<{ page: string; views: number }>;
  topSources: Array<{ source: string; sessions: number }>;
}

async function fetchGA4Stats(token: string): Promise<GA4Stats> {
  const body = {
    dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "screenPageViews" },
    ],
    dimensions: [],
  };

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const topPagesRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
        metrics: [{ name: "screenPageViews" }],
        dimensions: [{ name: "pagePath" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 8,
      }),
    }
  );

  const topSourcesRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
        metrics: [{ name: "sessions" }],
        dimensions: [{ name: "sessionSource" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 6,
      }),
    }
  );

  const [overview, topPagesData, topSourcesData] = await Promise.all([
    res.json(),
    topPagesRes.json(),
    topSourcesRes.json(),
  ]);

  const row = overview?.rows?.[0]?.metricValues || [];
  const sessions = parseInt(row[0]?.value || "0");
  const users = parseInt(row[1]?.value || "0");
  const pageviews = parseInt(row[2]?.value || "0");

  const topPages = (topPagesData?.rows || []).map((r: any) => ({
    page: r.dimensionValues[0].value,
    views: parseInt(r.metricValues[0].value),
  }));

  const topSources = (topSourcesData?.rows || []).map((r: any) => ({
    source: r.dimensionValues[0].value,
    sessions: parseInt(r.metricValues[0].value),
  }));

  return { sessions, users, pageviews, topPages, topSources };
}

// ── Search Console API ──────────────────────────────────────────────────────

interface SearchConsoleStats {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number }>;
}

async function fetchSearchConsoleStats(token: string): Promise<SearchConsoleStats> {
  const yesterday = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // SC data lags 2-3 days
  const endDate = yesterday.toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const siteUrl = encodeURIComponent("sc-domain:wavealokam.com");
  const baseUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const [overviewRes, queriesRes, pagesRes] = await Promise.all([
    fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        startDate,
        endDate,
        rowLimit: 1,
      }),
    }),
    fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 8,
        orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
      }),
    }),
    fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 6,
        orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
      }),
    }),
  ]);

  const [overviewData, queriesData, pagesData] = await Promise.all([
    overviewRes.json(),
    queriesRes.json(),
    pagesRes.json(),
  ]);

  const overviewRow = overviewData?.rows?.[0];
  const clicks = overviewRow?.clicks || 0;
  const impressions = overviewRow?.impressions || 0;
  const ctr = overviewRow?.ctr || 0;
  const position = overviewRow?.position || 0;

  const topQueries = (queriesData?.rows || []).map((r: any) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    position: Math.round(r.position * 10) / 10,
  }));

  const topPages = (pagesData?.rows || []).map((r: any) => ({
    page: r.keys[0].replace("https://wavealokam.com", "") || "/",
    clicks: r.clicks,
    impressions: r.impressions,
  }));

  return { clicks, impressions, ctr: Math.round(ctr * 1000) / 10, position: Math.round(position * 10) / 10, topQueries, topPages };
}

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch DB data + Google data in parallel
    const [visitors, insights, googleToken] = await Promise.all([
      queryDB("chat_visitors", {
        last_seen_at: `gte.${since}`,
        order: "last_seen_at.desc",
        limit: "200",
      }),
      queryDB("chat_insights", {
        last_seen_at: `gte.${since}`,
        order: "occurrence_count.desc",
        limit: "50",
      }),
      getGoogleAccessToken([
        "https://www.googleapis.com/auth/analytics.readonly",
        "https://www.googleapis.com/auth/webmasters.readonly",
      ]),
    ]);

    // Fetch GA4 + Search Console in parallel (if token available)
    let ga4: GA4Stats | null = null;
    let sc: SearchConsoleStats | null = null;
    if (googleToken) {
      [ga4, sc] = await Promise.all([
        fetchGA4Stats(googleToken).catch((e) => { console.error("GA4 error:", e); return null; }),
        fetchSearchConsoleStats(googleToken).catch((e) => { console.error("SC error:", e); return null; }),
      ]);
    }

    const newVisitors = visitors.filter((v: any) => v.first_seen_at >= since);
    const returningVisitors = visitors.filter((v: any) => v.first_seen_at < since);
    const totalInteractions = visitors.reduce((sum: number, v: any) => sum + v.conversation_count, 0);
    const namedVisitors = visitors.filter((v: any) => v.name);
    const visitorsWithEmail = visitors.filter((v: any) => v.email);
    const visitorsWithPhone = visitors.filter((v: any) => v.phone);

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

    const visitorRows = visitors
      .map(
        (v: any) => `
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

    const insightRows = insights
      .slice(0, 20)
      .map(
        (i: any) => `
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

    // ── GA4 Section HTML ──────────────────────────────────────────────────
    const ga4Section = ga4
      ? `
    <!-- GA4 Section -->
    <div style="background:#fff;padding:24px 32px 16px;margin-top:2px;">
      <h2 style="font-size:16px;color:#2d2926;margin:0 0 4px;font-weight:700;">📊 Website Traffic (Yesterday)</h2>
      <p style="font-size:12px;color:#888;margin:0 0 16px;">Google Analytics 4 · wavealokam.com</p>

      <!-- GA4 Stats Row -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="text-align:center;padding:12px 8px;background:#f7f4ef;border-radius:8px;margin:4px;">
            <div style="font-size:28px;font-weight:700;color:#e07b39;">${ga4.sessions.toLocaleString()}</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Sessions</div>
          </td>
          <td style="width:8px;"></td>
          <td style="text-align:center;padding:12px 8px;background:#f7f4ef;border-radius:8px;">
            <div style="font-size:28px;font-weight:700;color:#2d9b6f;">${ga4.users.toLocaleString()}</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Users</div>
          </td>
          <td style="width:8px;"></td>
          <td style="text-align:center;padding:12px 8px;background:#f7f4ef;border-radius:8px;">
            <div style="font-size:28px;font-weight:700;color:#5b8fc9;">${ga4.pageviews.toLocaleString()}</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Page Views</div>
          </td>
        </tr>
      </table>

      <!-- Top Pages + Sources side by side -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr valign="top">
          <td width="56%">
            <p style="font-size:12px;font-weight:700;color:#2d2926;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">🔝 Top Pages</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${ga4.topPages.map((p) => `
              <tr style="border-bottom:1px solid #f0ede8;">
                <td style="padding:6px 8px;font-size:12px;color:#555;max-width:200px;overflow:hidden;">${p.page === "/" ? "Home" : p.page}</td>
                <td style="padding:6px 8px;font-size:12px;color:#e07b39;text-align:right;font-weight:600;white-space:nowrap;">${p.views} views</td>
              </tr>`).join("")}
            </table>
          </td>
          <td width="8px;"></td>
          <td width="44%">
            <p style="font-size:12px;font-weight:700;color:#2d2926;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">📡 Traffic Sources</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${ga4.topSources.map((s) => `
              <tr style="border-bottom:1px solid #f0ede8;">
                <td style="padding:6px 8px;font-size:12px;color:#555;">${s.source || "(direct)"}</td>
                <td style="padding:6px 8px;font-size:12px;color:#5b8fc9;text-align:right;font-weight:600;white-space:nowrap;">${s.sessions} sessions</td>
              </tr>`).join("")}
            </table>
          </td>
        </tr>
      </table>
    </div>`
      : "";

    // ── Search Console Section HTML ───────────────────────────────────────
    const scSection = sc
      ? `
    <!-- Search Console Section -->
    <div style="background:#fff;padding:24px 32px 16px;margin-top:2px;">
      <h2 style="font-size:16px;color:#2d2926;margin:0 0 4px;font-weight:700;">🔍 Search Performance</h2>
      <p style="font-size:12px;color:#888;margin:0 0 16px;">Google Search Console · last 2 days (data lags ~2 days)</p>

      <!-- SC Overview -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="text-align:center;padding:12px 8px;background:#f7f4ef;border-radius:8px;">
            <div style="font-size:28px;font-weight:700;color:#e07b39;">${sc.clicks.toLocaleString()}</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Clicks</div>
          </td>
          <td style="width:8px;"></td>
          <td style="text-align:center;padding:12px 8px;background:#f7f4ef;border-radius:8px;">
            <div style="font-size:28px;font-weight:700;color:#2d9b6f;">${sc.impressions.toLocaleString()}</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Impressions</div>
          </td>
          <td style="width:8px;"></td>
          <td style="text-align:center;padding:12px 8px;background:#f7f4ef;border-radius:8px;">
            <div style="font-size:28px;font-weight:700;color:#5b8fc9;">${sc.ctr}%</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">CTR</div>
          </td>
          <td style="width:8px;"></td>
          <td style="text-align:center;padding:12px 8px;background:#f7f4ef;border-radius:8px;">
            <div style="font-size:28px;font-weight:700;color:#9b7fd4;">#${sc.position}</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Avg Position</div>
          </td>
        </tr>
      </table>

      <!-- Top Queries -->
      ${sc.topQueries.length > 0 ? `
      <p style="font-size:12px;font-weight:700;color:#2d2926;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">🔑 Top Search Queries</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #f0ede8;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        <thead>
          <tr style="background:#f7f4ef;">
            <th style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:left;font-weight:600;">Query</th>
            <th style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:center;font-weight:600;">Clicks</th>
            <th style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:center;font-weight:600;">Impr.</th>
            <th style="padding:8px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:center;font-weight:600;">Pos.</th>
          </tr>
        </thead>
        <tbody>
          ${sc.topQueries.map((q) => `
          <tr style="border-bottom:1px solid #f0ede8;">
            <td style="padding:8px 12px;font-size:12px;color:#2d2926;">${q.query}</td>
            <td style="padding:8px 12px;font-size:12px;color:#e07b39;text-align:center;font-weight:600;">${q.clicks}</td>
            <td style="padding:8px 12px;font-size:12px;color:#888;text-align:center;">${q.impressions}</td>
            <td style="padding:8px 12px;font-size:12px;color:#5b8fc9;text-align:center;">#${q.position}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : ""}
    </div>`
      : "";

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

    <!-- Chat Stats Row -->
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
          ? `<p style="margin:8px 0 0;font-size:13px;color:#555;">${visitorsWithEmail.map((v: any) => `${v.name || "Anonymous"} &lt;${v.email}&gt;`).join(" &nbsp;·&nbsp; ")}</p>`
          : ""
      }
    </div>`
        : ""
    }

    <!-- GA4 Traffic Section -->
    ${ga4Section}

    <!-- Search Console Section -->
    ${scSection}

    <!-- Visitors Table -->
    ${
      visitors.length > 0
        ? `<div style="background:#fff;padding:24px 32px 8px;margin-top:2px;">
      <h2 style="font-size:16px;color:#2d2926;margin:0 0 16px;font-weight:700;">👥 Visitor Activity (Drifter)</h2>
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
        : `<div style="background:#fff;padding:32px;text-align:center;color:#888;font-style:italic;margin-top:2px;">No Drifter visitor activity recorded today.</div>`
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
        subject: `🌊 Wavealokam Daily Brief — ${today} (${visitors.length} visitor${visitors.length !== 1 ? "s" : ""}${ga4 ? ` · ${ga4.sessions} sessions` : ""})`,
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
        ga4_sessions: ga4?.sessions ?? null,
        sc_clicks: sc?.clicks ?? null,
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
