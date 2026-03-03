import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { branch_id, date } = await req.json();
    const sb = getSupabase();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // Get branch
    const { data: branch } = await sb.from("ops_branches").select("*").eq("id", branch_id).single();
    if (!branch) throw new Error("Branch not found");

    const reportDate = date || new Date().toISOString().split("T")[0];
    const dayStart = `${reportDate}T00:00:00`;
    const dayEnd = `${reportDate}T23:59:59`;

    // Get admin emails
    const { data: admins } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branch_id).eq("role", "admin").eq("is_active", true);
    if (!admins?.length) throw new Error("No admins found");

    const adminUserIds = admins.map(a => a.user_id);
    const adminEmails: string[] = [];
    for (const uid of adminUserIds) {
      const { data: { user } } = await sb.auth.admin.getUserById(uid);
      if (user?.email) adminEmails.push(user.email);
    }

    // Gather all data
    const [tasksRes, guestsRes, shiftsRes, inventoryRes, expiryRes, ordersRes] = await Promise.all([
      sb.from("ops_tasks").select("*").eq("branch_id", branch_id).limit(500),
      sb.from("ops_guest_log").select("*").eq("branch_id", branch_id).or(`check_in_at.gte.${dayStart},and(check_in_at.lte.${dayEnd},or(check_out_at.is.null,check_out_at.gte.${dayStart}))`).limit(200),
      sb.from("ops_shift_punches").select("*").eq("branch_id", branch_id).gte("clock_in_at", dayStart).lte("clock_in_at", dayEnd),
      sb.from("ops_inventory_items").select("*").eq("branch_id", branch_id).eq("is_active", true),
      sb.from("ops_inventory_expiry").select("*, ops_inventory_items(name_en)").eq("branch_id", branch_id).eq("is_disposed", false).lte("expiry_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]),
      sb.from("ops_purchase_orders").select("*").eq("branch_id", branch_id).eq("status", "Ordered"),
    ]);

    const tasks = tasksRes.data || [];
    const guests = guestsRes.data || [];
    const shifts = shiftsRes.data || [];
    const inventory = inventoryRes.data || [];
    const expiry = expiryRes.data || [];
    const activeOrders = ordersRes.data || [];

    // Resolve user names
    const allUserIds = [...new Set([...tasks.flatMap(t => [...t.assigned_to, t.created_by]), ...shifts.map(s => s.user_id)])];
    const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name, role").in("user_id", allUserIds.length ? allUserIds : ["none"]);
    const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));

    const now = new Date();
    const overdueTasks = tasks.filter(t => t.due_datetime && new Date(t.due_datetime) < now && !["Done", "Cancelled"].includes(t.status));
    const blockedTasks = tasks.filter(t => t.status === "Blocked");
    const completedToday = tasks.filter(t => t.status === "Done" && t.updated_at >= dayStart && t.updated_at <= dayEnd);
    const dueForOrder = inventory.filter(i => i.current_stock <= i.reorder_point);
    const inHouse = guests.filter(g => g.status === "checked_in");
    const checkInsToday = guests.filter(g => g.check_in_at >= dayStart && g.check_in_at <= dayEnd);
    const checkOutsToday = guests.filter(g => g.check_out_at && g.check_out_at >= dayStart && g.check_out_at <= dayEnd);

    // Build report context for Vector
    const reportData = {
      date: reportDate,
      branch: branch.name,
      tasks: {
        total_active: tasks.filter(t => !["Done", "Cancelled"].includes(t.status)).length,
        completed_today: completedToday.length,
        overdue: overdueTasks.map(t => ({ title: t.title_en || t.title_original, assigned: t.assigned_to.map((id: string) => nameMap[id] || id), due: t.due_datetime, status: t.status })),
        blocked: blockedTasks.map(t => ({ title: t.title_en || t.title_original, reason: t.blocked_reason_text_en || t.blocked_reason_code, assigned: t.assigned_to.map((id: string) => nameMap[id] || id), since: t.updated_at })),
      },
      inventory: {
        due_for_order: dueForOrder.map(i => ({ name: i.name_en, stock: i.current_stock, reorder: i.reorder_point })),
        expiring_soon: expiry.map(e => ({ item: (e.ops_inventory_items as any)?.name_en, date: e.expiry_date, qty: e.quantity })),
        delayed_orders: activeOrders.filter(o => {
          const age = Math.floor((Date.now() - new Date(o.ordered_at || o.created_at).getTime()) / 86400000);
          return age > 3;
        }).map(o => ({ id: o.id.slice(0,8), vendor: o.vendor, ordered: o.ordered_at || o.created_at, days_ago: Math.floor((Date.now() - new Date(o.ordered_at || o.created_at).getTime()) / 86400000) })),
      },
      occupancy: {
        in_house: inHouse.length,
        adults: inHouse.reduce((s, g) => s + g.adults, 0),
        children: inHouse.reduce((s, g) => s + g.children, 0),
        check_ins_today: checkInsToday.length,
        check_outs_today: checkOutsToday.length,
      },
      shifts: shifts.map(s => ({ user: nameMap[s.user_id] || s.user_id, status: s.status, clock_in: s.clock_in_at, clock_out: s.clock_out_at, break_min: s.total_break_minutes, flagged: !!s.flag_type, flag_reason: s.flag_reason })),
      staff_names: Object.values(nameMap),
    };

    // Ask Vector to compose the report
    const vectorPrompt = `You are Vector, the GM AI for Wavealokam Ops. Compose the daily admin intelligence report.

Be sharp, evidence-based, and actionable. Use the exact data provided — do not invent anything.

Structure the report as:
1. **Executive Summary** (2-3 sentences)
2. **Tasks by Person** — for each staff member: assigned/completed/pending/blocked/overdue with specific task names
3. **Inventory & Purchase** — due for order, expiring soon, delayed orders
4. **Guest Log** — in-house count, check-ins/outs today, any gaps
5. **Shift Punches** — attendance, flags, anomalies
6. **Observations & Suggestions** — process improvements, threshold changes, SOP gaps
7. **Recommended Admin Actions** — specific next steps

Keep it under 800 words. Be direct, no fluff.

DATA:
${JSON.stringify(reportData, null, 2)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: vectorPrompt }],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("Failed to generate report");
    }

    const aiResult = await aiResponse.json();
    const reportContent = aiResult.choices?.[0]?.message?.content || "Report generation failed.";

    // Convert markdown to basic HTML for email
    const htmlContent = reportContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h3 style="color:#0ea5e9;margin:16px 0 8px">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 style="color:#0ea5e9;margin:20px 0 10px">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 style="color:#0ea5e9;margin:24px 0 12px">$1</h1>')
      .replace(/^- (.*$)/gm, '<li style="margin:2px 0">$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');

    // Send email via Resend
    const emailHtml = `
      <div style="font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:20px;background:#fff">
        <div style="background:#0ea5e9;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:18px">🐕 Vector Daily Report — ${reportDate}</h1>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.9">${branch.name}</p>
        </div>
        <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6;color:#333">
          ${htmlContent}
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">
          Generated by Vector AI • Wavealokam Ops
        </p>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Vector <vector@wavealokam.com>",
        to: adminEmails.length ? adminEmails : ["sudevsudev1@gmail.com"],
        subject: `Vector Daily Report — ${reportDate}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();
    console.log("Email sent:", emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      report_length: reportContent.length,
      sent_to: adminEmails,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ops-vector-daily-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
