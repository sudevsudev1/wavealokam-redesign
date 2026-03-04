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

// Compute next fire time for recurring reminders
function computeNextFire(rule: any, lastFired: string): string | null {
  const now = new Date();
  const last = new Date(lastFired);

  if (rule.type === "daily") {
    const next = new Date(last);
    next.setDate(next.getDate() + (rule.interval || 1));
    if (rule.time) {
      const [h, m] = rule.time.split(":").map(Number);
      next.setHours(h, m, 0, 0);
    }
    return next.toISOString();
  }

  if (rule.type === "weekly") {
    const next = new Date(last);
    next.setDate(next.getDate() + 7 * (rule.interval || 1));
    if (rule.time) {
      const [h, m] = rule.time.split(":").map(Number);
      next.setHours(h, m, 0, 0);
    }
    return next.toISOString();
  }

  if (rule.type === "monthly") {
    const next = new Date(last);
    next.setMonth(next.getMonth() + (rule.interval || 1));
    if (rule.day_of_month) next.setDate(rule.day_of_month);
    if (rule.time) {
      const [h, m] = rule.time.split(":").map(Number);
      next.setHours(h, m, 0, 0);
    }
    return next.toISOString();
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = getSupabase();
    const now = new Date().toISOString();
    const results = { fired: 0, followed_up: 0, rescheduled: 0 };

    // ─── 1. Fire due reminders ───
    const { data: dueReminders } = await sb
      .from("ops_reminders")
      .select("*")
      .eq("status", "active")
      .lte("next_fire_at", now)
      .order("next_fire_at");

    for (const rem of dueReminders || []) {
      // Create notification
      await sb.from("ops_notifications").insert({
        branch_id: rem.branch_id,
        user_id: rem.user_id,
        title: `🔔 Reminder: ${rem.title}`,
        body: rem.description || rem.title,
        type: "reminder",
        related_reminder_id: rem.id,
      });

      // Update reminder
      if (rem.reminder_type === "one_time") {
        await sb.from("ops_reminders").update({
          status: "completed",
          last_fired_at: now,
          fire_count: rem.fire_count + 1,
          follow_up_status: "pending",
          updated_at: now,
        }).eq("id", rem.id);
      } else {
        // Recurring: compute next fire
        const nextFire = computeNextFire(rem.recurrence_rule, now);
        await sb.from("ops_reminders").update({
          last_fired_at: now,
          fire_count: rem.fire_count + 1,
          follow_up_status: "pending",
          next_fire_at: nextFire || now,
          updated_at: now,
        }).eq("id", rem.id);
      }

      results.fired++;
    }

    // ─── 2. End-of-day follow-ups ───
    // Check reminders fired today that haven't been followed up
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const currentHour = new Date().getHours();

    // Only run follow-ups after 6 PM IST (12:30 UTC) 
    if (currentHour >= 12) {
      const { data: pendingFollowUps } = await sb
        .from("ops_reminders")
        .select("*")
        .eq("follow_up_status", "pending")
        .gte("last_fired_at", todayStart.toISOString())
        .lte("last_fired_at", now);

      for (const rem of pendingFollowUps || []) {
        // Create follow-up notification
        await sb.from("ops_notifications").insert({
          branch_id: rem.branch_id,
          user_id: rem.user_id,
          title: `📋 Follow-up: ${rem.title}`,
          body: `Did you complete this? "${rem.title}" — Let Vector know in chat if you need to reschedule.`,
          type: "follow_up",
          related_reminder_id: rem.id,
        });

        results.followed_up++;
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ops-vector-reminders error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
