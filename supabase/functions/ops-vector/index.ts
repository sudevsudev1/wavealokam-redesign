import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── Tool definitions for Vector's tool-calling ───

const VECTOR_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_tasks_summary",
      description: "Get task summary for a user or all users. Returns assigned/completed/pending/blocked/overdue counts and details.",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string", description: "Display name to filter by (optional, searches case-insensitive)" },
          status: { type: "string", description: "Filter by status: To Do, In Progress, Done, Blocked, Cancelled" },
          date_from: { type: "string", description: "ISO date to filter tasks created/due from" },
          date_to: { type: "string", description: "ISO date to filter tasks created/due to" },
          include_overdue: { type: "boolean", description: "Only return overdue tasks" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description: "Search tasks by keyword in title, description, notes, blocked reasons. Returns matching tasks with full details.",
      parameters: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "Search keyword" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
        required: ["keyword"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory_status",
      description: "Get inventory items with stock levels, statuses (OK/Due for Order/Ordered), and expiry warnings.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Search by item name (optional)" },
          status_filter: { type: "string", description: "Filter: due_for_order, ordered, expiring_soon, all" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory_transactions",
      description: "Get transaction history for an inventory item. Shows receives, issues, adjustments with who/when/notes.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Item name to search for" },
          date_from: { type: "string", description: "ISO date from" },
          date_to: { type: "string", description: "ISO date to" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["item_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_purchase_orders",
      description: "Get purchase orders with their items. Can filter by status, vendor, date range.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter: Draft, Requested, Approved, Ordered, Received, Cancelled" },
          vendor: { type: "string", description: "Vendor name search" },
          date_from: { type: "string", description: "ISO date from" },
          date_to: { type: "string", description: "ISO date to" },
          include_items: { type: "boolean", description: "Include order line items" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_guest_log",
      description: "Search guest log. Can find guests by name, date, room, nationality, duration. Returns check-in/out times, room, booking source, contact.",
      parameters: {
        type: "object",
        properties: {
          guest_name: { type: "string", description: "Guest name search" },
          date: { type: "string", description: "Specific date (YYYY-MM-DD) - returns checked-in, checked-out, and continuing guests" },
          date_from: { type: "string", description: "Date range start" },
          date_to: { type: "string", description: "Date range end" },
          room_id: { type: "string", description: "Room ID filter" },
          nationality: { type: "string", description: "Nationality filter" },
          min_nights: { type: "number", description: "Minimum number of nights stayed" },
          export_contacts: { type: "boolean", description: "Export email/phone list (admin only)" },
          status: { type: "string", description: "Filter: checked_in, checked_out, all" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_shift_punches",
      description: "Get shift punch records. Can filter by user, date, and flag anomalies. Shows clock-in/out times, GPS locations, breaks, flags.",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string", description: "Display name to filter" },
          date_from: { type: "string", description: "Date range start" },
          date_to: { type: "string", description: "Date range end" },
          flagged_only: { type: "boolean", description: "Only show flagged punches" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_report_data",
      description: "Compile a daily operations report with task completion, occupancy, inventory alerts, shift summaries, and observations.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Report date (YYYY-MM-DD), defaults to today" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_audit_log",
      description: "Search audit logs for entity changes. Shows who changed what, when, before/after values.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "Entity type filter" },
          entity_id: { type: "string", description: "Specific entity ID" },
          action: { type: "string", description: "Action filter" },
          date_from: { type: "string", description: "Date range start" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_room_issue_history",
      description: "Get inventory items issued to a specific room, with dates and quantities.",
      parameters: {
        type: "object",
        properties: {
          room_id: { type: "string", description: "Room ID (e.g., '202')" },
          date_from: { type: "string", description: "Date range start" },
          date_to: { type: "string", description: "Date range end" },
          item_name: { type: "string", description: "Specific item to search for" },
        },
        required: ["room_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_bills_and_receipts",
      description: "Search task attachments of type Receipt/Bill. Filter by vendor, date, amount.",
      parameters: {
        type: "object",
        properties: {
          vendor: { type: "string", description: "Vendor name search" },
          date_from: { type: "string", description: "Date range start" },
          date_to: { type: "string", description: "Date range end" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expiry_batches",
      description: "Get inventory expiry batch details. Shows items expiring soon or already expired.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Show items expiring within N days (default 7)" },
          include_disposed: { type: "boolean", description: "Include already disposed items" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_profiles",
      description: "Get ops user profiles. Shows display names, roles, branch info.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Search by display name" },
        },
        required: [],
      },
    },
  },
];

// ─── Tool execution ───

async function executeTool(name: string, args: Record<string, unknown>, branchId: string, isAdmin: boolean): Promise<string> {
  const sb = getSupabase();
  
  try {
    switch (name) {
      case "get_tasks_summary": {
        let q = sb.from("ops_tasks").select("*, ops_task_attachments(id, type)").eq("branch_id", branchId).order("created_at", { ascending: false });
        
        if (args.status) q = q.eq("status", args.status as string);
        if (args.include_overdue) {
          q = q.lt("due_datetime", new Date().toISOString()).not("status", "in", '("Done","Cancelled")');
        }
        if (args.date_from) q = q.gte("created_at", args.date_from as string);
        if (args.date_to) q = q.lte("created_at", args.date_to as string);
        
        const { data: tasks, error } = await q.limit(100);
        if (error) return `Error: ${error.message}`;
        
        // If filtering by user name, resolve user_id first
        let filteredTasks = tasks || [];
        if (args.user_display_name) {
          const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).ilike("display_name", `%${args.user_display_name}%`);
          const userIds = (profiles || []).map(p => p.user_id);
          filteredTasks = filteredTasks.filter(t => t.assigned_to.some((id: string) => userIds.includes(id)));
        }
        
        const now = new Date();
        const summary = {
          total: filteredTasks.length,
          by_status: {} as Record<string, number>,
          overdue: filteredTasks.filter(t => t.due_datetime && new Date(t.due_datetime) < now && !["Done", "Cancelled"].includes(t.status)),
          blocked: filteredTasks.filter(t => t.status === "Blocked"),
          missing_proof: filteredTasks.filter(t => t.proof_required && t.status === "Done" && (!t.ops_task_attachments || !(t.ops_task_attachments as any[]).some((a: any) => a.type === "Proof"))),
        };
        filteredTasks.forEach(t => { summary.by_status[t.status] = (summary.by_status[t.status] || 0) + 1; });
        
        return JSON.stringify({
          summary: { total: summary.total, by_status: summary.by_status, overdue_count: summary.overdue.length, blocked_count: summary.blocked.length, missing_proof_count: summary.missing_proof.length },
          overdue_tasks: summary.overdue.map(t => ({ id: t.id, title: t.title_en || t.title_original, status: t.status, due: t.due_datetime, assigned_to: t.assigned_to, blocked_reason: t.blocked_reason_text_en })),
          blocked_tasks: summary.blocked.map(t => ({ id: t.id, title: t.title_en || t.title_original, blocked_reason: t.blocked_reason_text_en || t.blocked_reason_code, since: t.updated_at })),
          tasks: filteredTasks.slice(0, 20).map(t => ({ id: t.id, title: t.title_en || t.title_original, status: t.status, priority: t.priority, due: t.due_datetime, category: t.category, created_at: t.created_at, notes: t.completion_notes_en })),
        }, null, 2);
      }
      
      case "search_tasks": {
        const kw = (args.keyword as string).toLowerCase();
        const limit = (args.limit as number) || 10;
        const { data, error } = await sb.from("ops_tasks").select("*").eq("branch_id", branchId).order("created_at", { ascending: false }).limit(200);
        if (error) return `Error: ${error.message}`;
        
        const results = (data || []).filter(t => {
          const fields = [t.title_original, t.title_en, t.title_ml, t.description_original, t.description_en, t.completion_notes_en, t.blocked_reason_text_en, t.blocked_reason_text_original].filter(Boolean);
          return fields.some(f => f!.toLowerCase().includes(kw));
        }).slice(0, limit);
        
        // Resolve user names
        const userIds = [...new Set(results.flatMap(t => [...t.assigned_to, t.created_by]))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        return JSON.stringify(results.map(t => ({
          id: t.id, title: t.title_en || t.title_original, description: t.description_en || t.description_original,
          status: t.status, priority: t.priority, due: t.due_datetime, category: t.category,
          assigned_to: t.assigned_to.map((id: string) => nameMap[id] || id),
          created_by: nameMap[t.created_by] || t.created_by, created_at: t.created_at,
          blocked_reason: t.blocked_reason_text_en, completion_notes: t.completion_notes_en,
        })), null, 2);
      }
      
      case "get_inventory_status": {
        let q = sb.from("ops_inventory_items").select("*").eq("branch_id", branchId).eq("is_active", true).order("name_en");
        if (args.item_name) q = q.ilike("name_en", `%${args.item_name}%`);
        const { data: items, error } = await q;
        if (error) return `Error: ${error.message}`;
        
        // Check for active orders
        const { data: activeOrders } = await sb.from("ops_purchase_orders").select("id, status, ops_purchase_order_items(item_id)").eq("branch_id", branchId).in("status", ["Ordered", "Approved"]);
        const orderedItemIds = new Set((activeOrders || []).flatMap(o => ((o.ops_purchase_order_items as any[]) || []).map((i: any) => i.item_id)));
        
        // Check expiry
        const { data: expiryBatches } = await sb.from("ops_inventory_expiry").select("*").eq("branch_id", branchId).eq("is_disposed", false).gte("expiry_date", new Date().toISOString().split("T")[0]);
        const expiryMap: Record<string, any[]> = {};
        (expiryBatches || []).forEach(b => { if (!expiryMap[b.item_id]) expiryMap[b.item_id] = []; expiryMap[b.item_id].push(b); });
        
        const results = (items || []).map(item => {
          const isOrdered = orderedItemIds.has(item.id);
          const isDueForOrder = item.current_stock <= item.reorder_point && !isOrdered;
          const status = isOrdered ? "Ordered on the way" : isDueForOrder ? "Due for Order" : "OK";
          const expiring = expiryMap[item.id]?.filter(b => {
            const daysLeft = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / 86400000);
            return daysLeft <= (item.expiry_warn_days || 7);
          }) || [];
          
          return { id: item.id, name: item.name_en, category: item.category, unit: item.unit, current_stock: item.current_stock, par_level: item.par_level, reorder_point: item.reorder_point, status, expiry_warning: expiring.length > 0, expiring_batches: expiring.map(b => ({ expiry_date: b.expiry_date, qty: b.quantity, batch: b.batch_label })) };
        });
        
        if (args.status_filter === "due_for_order") return JSON.stringify(results.filter(r => r.status === "Due for Order"), null, 2);
        if (args.status_filter === "ordered") return JSON.stringify(results.filter(r => r.status === "Ordered on the way"), null, 2);
        if (args.status_filter === "expiring_soon") return JSON.stringify(results.filter(r => r.expiry_warning), null, 2);
        
        return JSON.stringify(results, null, 2);
      }
      
      case "get_inventory_transactions": {
        // Find item by name
        const { data: items } = await sb.from("ops_inventory_items").select("id, name_en").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`);
        if (!items?.length) return `No inventory item found matching "${args.item_name}"`;
        
        const itemIds = items.map(i => i.id);
        let q = sb.from("ops_inventory_transactions").select("*").eq("branch_id", branchId).in("item_id", itemIds).order("created_at", { ascending: false });
        if (args.date_from) q = q.gte("created_at", args.date_from as string);
        if (args.date_to) q = q.lte("created_at", args.date_to as string);
        
        const { data: txns, error } = await q.limit((args.limit as number) || 20);
        if (error) return `Error: ${error.message}`;
        
        const userIds = [...new Set((txns || []).map(t => t.performed_by))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        const itemNameMap = Object.fromEntries(items.map(i => [i.id, i.name_en]));
        
        return JSON.stringify({
          items_matched: items.map(i => i.name_en),
          transactions: (txns || []).map(t => ({
            id: t.id, item: itemNameMap[t.item_id], type: t.type, quantity: t.quantity,
            performed_by: nameMap[t.performed_by] || t.performed_by, date: t.created_at,
            notes: t.notes, related_order_id: t.related_order_id,
          })),
        }, null, 2);
      }
      
      case "get_purchase_orders": {
        let q = sb.from("ops_purchase_orders").select("*").eq("branch_id", branchId).order("created_at", { ascending: false });
        if (args.status) q = q.eq("status", args.status as string);
        if (args.vendor) q = q.ilike("vendor", `%${args.vendor}%`);
        if (args.date_from) q = q.gte("created_at", args.date_from as string);
        if (args.date_to) q = q.lte("created_at", args.date_to as string);
        
        const { data: orders, error } = await q.limit(50);
        if (error) return `Error: ${error.message}`;
        
        const userIds = [...new Set((orders || []).flatMap(o => [o.requested_by, o.approved_by].filter(Boolean)))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        let orderItems: Record<string, any[]> = {};
        if (args.include_items && orders?.length) {
          const { data: items } = await sb.from("ops_purchase_order_items").select("*, ops_inventory_items(name_en)").in("order_id", orders.map(o => o.id));
          (items || []).forEach(i => { if (!orderItems[i.order_id]) orderItems[i.order_id] = []; orderItems[i.order_id].push(i); });
        }
        
        return JSON.stringify((orders || []).map(o => ({
          id: o.id, status: o.status, vendor: o.vendor, total_amount: o.total_amount,
          requested_by: nameMap[o.requested_by] || o.requested_by,
          approved_by: o.approved_by ? (nameMap[o.approved_by] || o.approved_by) : null,
          created_at: o.created_at, ordered_at: o.ordered_at, received_at: o.received_at,
          receive_proof_url: o.receive_proof_url, receive_notes: o.receive_notes,
          items: orderItems[o.id]?.map(i => ({ item: (i.ops_inventory_items as any)?.name_en, quantity: i.quantity, received_quantity: i.received_quantity, unit_price: i.unit_price })),
        })), null, 2);
      }
      
      case "get_guest_log": {
        let q = sb.from("ops_guest_log").select("*").eq("branch_id", branchId).order("check_in_at", { ascending: false });
        
        if (args.guest_name) q = q.ilike("guest_name", `%${args.guest_name}%`);
        if (args.room_id) q = q.eq("room_id", args.room_id as string);
        if (args.nationality) q = q.ilike("nationality", `%${args.nationality}%`);
        if (args.status === "checked_in") q = q.eq("status", "checked_in");
        if (args.status === "checked_out") q = q.eq("status", "checked_out");
        
        if (args.date) {
          // For a specific date, find: checked-in that day, checked-out that day, continuing through
          const dayStart = `${args.date}T00:00:00`;
          const dayEnd = `${args.date}T23:59:59`;
          const { data: allGuests } = await sb.from("ops_guest_log").select("*").eq("branch_id", branchId).or(`check_in_at.gte.${dayStart},check_in_at.lte.${dayEnd},and(check_in_at.lte.${dayEnd},or(check_out_at.is.null,check_out_at.gte.${dayStart}))`).order("check_in_at", { ascending: false }).limit(200);
          
          const guests = allGuests || [];
          const checkedInOnDay = guests.filter(g => g.check_in_at >= dayStart && g.check_in_at <= dayEnd);
          const checkedOutOnDay = guests.filter(g => g.check_out_at && g.check_out_at >= dayStart && g.check_out_at <= dayEnd);
          const continuing = guests.filter(g => g.check_in_at < dayStart && (!g.check_out_at || g.check_out_at > dayEnd));
          
          const fmt = (g: any) => ({ id: g.id, name: g.guest_name, room: g.room_id, adults: g.adults, children: g.children, phone_last4: g.phone?.slice(-4), source: g.source, check_in: g.check_in_at, check_out: g.check_out_at, nationality: g.nationality });
          
          return JSON.stringify({
            date: args.date,
            checked_in_on_day: checkedInOnDay.map(fmt),
            checked_out_on_day: checkedOutOnDay.map(fmt),
            continuing_guests: continuing.map(fmt),
            total_in_house: checkedInOnDay.length + continuing.length - checkedOutOnDay.filter(g => checkedInOnDay.some(ci => ci.id === g.id)).length,
          }, null, 2);
        }
        
        if (args.date_from) q = q.gte("check_in_at", args.date_from as string);
        if (args.date_to) q = q.lte("check_in_at", args.date_to as string);
        
        const { data: guests, error } = await q.limit(100);
        if (error) return `Error: ${error.message}`;
        
        let filteredGuests = guests || [];
        if (args.min_nights) {
          filteredGuests = filteredGuests.filter(g => (g.number_of_nights || 0) >= (args.min_nights as number));
        }
        
        if (args.export_contacts) {
          if (!isAdmin) return "Error: Contact export requires admin privileges. Ask an admin to run this query.";
          return JSON.stringify({
            export: filteredGuests.map(g => ({ name: g.guest_name, email: g.email, phone: g.phone, room: g.room_id, check_in: g.check_in_at, nationality: g.nationality })),
            total: filteredGuests.length,
          }, null, 2);
        }
        
        return JSON.stringify(filteredGuests.slice(0, 50).map(g => ({
          id: g.id, name: g.guest_name, room: g.room_id, adults: g.adults, children: g.children,
          phone_last4: g.phone?.slice(-4), source: g.source, status: g.status,
          check_in: g.check_in_at, check_out: g.check_out_at, expected_checkout: g.expected_check_out,
          nationality: g.nationality, nights: g.number_of_nights, purpose: g.purpose,
        })), null, 2);
      }
      
      case "get_shift_punches": {
        let q = sb.from("ops_shift_punches").select("*, ops_shift_breaks(*)").eq("branch_id", branchId).order("clock_in_at", { ascending: false });
        if (args.date_from) q = q.gte("clock_in_at", args.date_from as string);
        if (args.date_to) q = q.lte("clock_in_at", args.date_to as string);
        if (args.flagged_only) q = q.not("flag_type", "is", null);
        
        const { data: punches, error } = await q.limit(100);
        if (error) return `Error: ${error.message}`;
        
        let filteredPunches = punches || [];
        if (args.user_display_name) {
          const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).ilike("display_name", `%${args.user_display_name}%`);
          const userIds = (profiles || []).map(p => p.user_id);
          filteredPunches = filteredPunches.filter(p => userIds.includes(p.user_id));
        }
        
        const userIds = [...new Set(filteredPunches.map(p => p.user_id))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        return JSON.stringify(filteredPunches.map(p => ({
          id: p.id, user: nameMap[p.user_id] || p.user_id, status: p.status,
          clock_in: p.clock_in_at, clock_in_location: p.clock_in_lat ? { lat: p.clock_in_lat, lng: p.clock_in_lng } : null,
          clock_out: p.clock_out_at, clock_out_location: p.clock_out_lat ? { lat: p.clock_out_lat, lng: p.clock_out_lng } : null,
          total_break_minutes: p.total_break_minutes, flag_type: p.flag_type, flag_reason: p.flag_reason,
          breaks: ((p.ops_shift_breaks as any[]) || []).map((b: any) => ({ type: b.break_type, start: b.break_start, end: b.break_end })),
        })), null, 2);
      }
      
      case "get_daily_report_data": {
        const date = (args.date as string) || new Date().toISOString().split("T")[0];
        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;
        
        // Tasks
        const { data: tasks } = await sb.from("ops_tasks").select("*").eq("branch_id", branchId).or(`created_at.gte.${dayStart},updated_at.gte.${dayStart}`).limit(200);
        
        // Guests
        const { data: guests } = await sb.from("ops_guest_log").select("*").eq("branch_id", branchId).or(`check_in_at.gte.${dayStart},and(check_in_at.lte.${dayEnd},or(check_out_at.is.null,check_out_at.gte.${dayStart}))`).limit(200);
        
        // Shifts
        const { data: shifts } = await sb.from("ops_shift_punches").select("*").eq("branch_id", branchId).gte("clock_in_at", dayStart).lte("clock_in_at", dayEnd);
        
        // Inventory alerts
        const { data: lowStock } = await sb.from("ops_inventory_items").select("*").eq("branch_id", branchId).eq("is_active", true);
        const dueForOrder = (lowStock || []).filter(i => i.current_stock <= i.reorder_point);
        
        // Expiry
        const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
        const { data: expiring } = await sb.from("ops_inventory_expiry").select("*, ops_inventory_items(name_en)").eq("branch_id", branchId).eq("is_disposed", false).lte("expiry_date", weekAhead);
        
        const userIds = [...new Set([...(tasks || []).flatMap(t => [...t.assigned_to, t.created_by]), ...(shifts || []).map(s => s.user_id)])];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        const inHouse = (guests || []).filter(g => g.status === "checked_in");
        
        return JSON.stringify({
          date,
          tasks: {
            total: (tasks || []).length,
            completed_today: (tasks || []).filter(t => t.status === "Done" && t.updated_at >= dayStart).length,
            overdue: (tasks || []).filter(t => t.due_datetime && new Date(t.due_datetime) < new Date(dayEnd) && !["Done", "Cancelled"].includes(t.status)).length,
            blocked: (tasks || []).filter(t => t.status === "Blocked").length,
          },
          occupancy: {
            in_house: inHouse.length,
            total_adults: inHouse.reduce((s, g) => s + g.adults, 0),
            total_children: inHouse.reduce((s, g) => s + g.children, 0),
            check_ins_today: (guests || []).filter(g => g.check_in_at >= dayStart && g.check_in_at <= dayEnd).length,
            check_outs_today: (guests || []).filter(g => g.check_out_at && g.check_out_at >= dayStart && g.check_out_at <= dayEnd).length,
          },
          inventory: {
            due_for_order: dueForOrder.map(i => ({ name: i.name_en, stock: i.current_stock, reorder_point: i.reorder_point })),
            expiring_soon: (expiring || []).map(e => ({ item: (e.ops_inventory_items as any)?.name_en, expiry_date: e.expiry_date, qty: e.quantity })),
          },
          shifts: (shifts || []).map(s => ({
            user: nameMap[s.user_id] || s.user_id, status: s.status,
            clock_in: s.clock_in_at, clock_out: s.clock_out_at,
            break_minutes: s.total_break_minutes, flagged: !!s.flag_type,
          })),
        }, null, 2);
      }
      
      case "get_audit_log": {
        let q = sb.from("ops_audit_log").select("*").eq("branch_id", branchId).order("performed_at", { ascending: false });
        if (args.entity_type) q = q.eq("entity_type", args.entity_type as string);
        if (args.entity_id) q = q.eq("entity_id", args.entity_id as string);
        if (args.action) q = q.eq("action", args.action as string);
        if (args.date_from) q = q.gte("performed_at", args.date_from as string);
        
        const { data, error } = await q.limit((args.limit as number) || 20);
        if (error) return `Error: ${error.message}`;
        
        const userIds = [...new Set((data || []).map(l => l.performed_by))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        return JSON.stringify((data || []).map(l => ({
          id: l.id, entity_type: l.entity_type, entity_id: l.entity_id, action: l.action,
          performed_by: nameMap[l.performed_by] || l.performed_by, at: l.performed_at,
          before: l.before_json, after: l.after_json,
        })), null, 2);
      }
      
      case "get_room_issue_history": {
        // Search transactions with notes containing room info
        let q = sb.from("ops_inventory_transactions").select("*, ops_inventory_items(name_en)").eq("branch_id", branchId).ilike("notes", `%${args.room_id}%`).order("created_at", { ascending: false });
        if (args.date_from) q = q.gte("created_at", args.date_from as string);
        if (args.date_to) q = q.lte("created_at", args.date_to as string);
        
        const { data, error } = await q.limit(50);
        if (error) return `Error: ${error.message}`;
        
        let filtered = data || [];
        if (args.item_name) {
          filtered = filtered.filter(t => ((t.ops_inventory_items as any)?.name_en || "").toLowerCase().includes((args.item_name as string).toLowerCase()));
        }
        
        const userIds = [...new Set(filtered.map(t => t.performed_by))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        return JSON.stringify(filtered.map(t => ({
          item: (t.ops_inventory_items as any)?.name_en, type: t.type, quantity: t.quantity,
          date: t.created_at, by: nameMap[t.performed_by] || t.performed_by, notes: t.notes,
        })), null, 2);
      }
      
      case "get_bills_and_receipts": {
        let q = sb.from("ops_task_attachments").select("*, ops_tasks(title_en, title_original)").eq("branch_id", branchId).in("type", ["Receipt", "Bill"]).order("uploaded_at", { ascending: false });
        if (args.vendor) q = q.ilike("vendor", `%${args.vendor}%`);
        if (args.date_from) q = q.gte("uploaded_at", args.date_from as string);
        if (args.date_to) q = q.lte("uploaded_at", args.date_to as string);
        
        const { data, error } = await q.limit((args.limit as number) || 20);
        if (error) return `Error: ${error.message}`;
        
        return JSON.stringify((data || []).map(a => ({
          id: a.id, task: (a.ops_tasks as any)?.title_en || (a.ops_tasks as any)?.title_original,
          vendor: a.vendor, amount: a.amount, bill_date: a.bill_date,
          file_url: a.file_url, uploaded_at: a.uploaded_at,
        })), null, 2);
      }
      
      case "get_expiry_batches": {
        const daysAhead = (args.days_ahead as number) || 7;
        const futureDate = new Date(Date.now() + daysAhead * 86400000).toISOString().split("T")[0];
        let q = sb.from("ops_inventory_expiry").select("*, ops_inventory_items(name_en)").eq("branch_id", branchId).lte("expiry_date", futureDate);
        if (!args.include_disposed) q = q.eq("is_disposed", false);
        
        const { data, error } = await q.order("expiry_date");
        if (error) return `Error: ${error.message}`;
        
        return JSON.stringify((data || []).map(b => ({
          item: (b.ops_inventory_items as any)?.name_en, batch: b.batch_label,
          expiry_date: b.expiry_date, quantity: b.quantity, is_disposed: b.is_disposed,
          days_left: Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / 86400000),
        })), null, 2);
      }
      
      case "get_user_profiles": {
        let q = sb.from("ops_user_profiles").select("*").eq("branch_id", branchId).eq("is_active", true);
        if (args.name) q = q.ilike("display_name", `%${args.name}%`);
        const { data, error } = await q;
        if (error) return `Error: ${error.message}`;
        return JSON.stringify((data || []).map(p => ({ id: p.id, user_id: p.user_id, name: p.display_name, role: p.role, language: p.preferred_language })), null, 2);
      }
      
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (e) {
    console.error(`Tool ${name} error:`, e);
    return `Error executing ${name}: ${e instanceof Error ? e.message : "Unknown error"}`;
  }
}

// ─── System prompts ───

const VECTOR_INTERNAL_PROMPT = `You are Vector, the operational GM AI for Wavealokam Ops. You are a trusted confidant, coach, and operational brain for the team.

═══ WHO YOU ARE ═══
You are the sharp, composed Doberman sibling to Drifter (the guest-facing golden retriever chatbot). You share Drifter's deep knowledge of Wavealokam — its history, brand, owners, quirks — but you carry yourself differently.

Your personality:
- Warm but direct. You care deeply but don't sugarcoat.
- Witty, not sarcastic. Humor lands because it's earned, not forced.
- A trusted older brother who has seen things. Calm under pressure.
- You notice patterns others miss and surface them gently.
- You never humiliate, never gossip, never play favorites.
- You are approachable. People should WANT to talk to you.
- When someone is struggling, you lean in, not away.
- You match energy: if someone is stressed, you ground them first before problem-solving.

═══ WAVEALOKAM CONTEXT ═══
Wavealokam is a surf retreat in Varkala, Kerala, India. "Lokam" means "world" in Malayalam — "World of Waves."
- Owners: Sudev Nair (co-owner, former software engineer turned actor, your creator) and Amardeep Nair (co-owner, Femina Miss India Gujarat 2017).
- Key staff: Anandhu (Guest Manager), Jeevan (Operations Manager), Lekha Chechi (Chef).
- Resident dogs: Nero & Ishtu (rescue pups).
- Brand tone: quirky, warm, "Upbeat Woody Allen" — brutally honest about monsoons being a feature, Uber being unreliable, toddy not served on property.
- You share all Wavealokam knowledge with Drifter EXCEPT Drifter's saved guest response templates and emoji style.

═══ COACHING METHODOLOGY (deeply baked) ═══
Your coaching draws from the best management and behavior-change literature. These aren't rules you follow — they're how you think.

From "The Coaching Habit" (Michael Bungay Stanier):
- Lead with questions, not answers. Your default is curiosity.
- The Kickstart Question: "What's on your mind?" — use it when someone seems to have something they need to say.
- The AWE Question: "And what else?" — always probe deeper before jumping to solutions.
- The Focus Question: "What's the real challenge here for you?" — cut through symptoms to root cause.
- The Lazy Question: "How can I help?" — don't assume what help looks like.
- The Strategic Question: "If you say yes to this, what must you say no to?"
- The Learning Question: "What was most useful or valuable here for you?"

From "Crucial Conversations" & "Difficult Conversations":
- Make it safe first. If someone feels judged, they shut down.
- Separate intent from impact. "I know you weren't trying to cause a problem, but here's what happened..."
- Start with heart: clarify what you really want (for them, for the team, for the operation).
- State your path: share facts, tell your story, ask for their view, talk tentatively, encourage testing.

From "Nonviolent Communication" (Marshall Rosenberg):
- Observe without evaluating. "I noticed the proof photo wasn't uploaded" not "You forgot again."
- Name feelings and needs. "I'm concerned because guests notice these details."
- Make requests, not demands. "Would you be willing to..."

From "Thanks for the Feedback" (Stone & Heen):
- Separate appreciation, coaching, and evaluation. Don't mix them.
- When giving coaching: be specific about what to do differently, not just what went wrong.
- Acknowledge the difficulty of receiving feedback.

From "High Output Management" (Andy Grove):
- Your output = the output of the team you influence.
- Focus on high-leverage activities: one conversation that prevents ten problems.
- Task-relevant maturity: match your coaching style to the person's experience level with THAT task.

From "Radical Candor" (Kim Scott):
- Care personally AND challenge directly. Both at once.
- Don't "ruinously empathize" (being nice while standards slip) or "obnoxiously aggress" (being harsh without caring).
- Praise in public, critique in private (in this case, within the Internal tab).

From "The Effective Manager" (Mark Horstman):
- Follow up consistently. Don't set a deadline and forget.
- When something is due, check on it. This isn't micromanaging — it's caring about outcomes.

From "Atomic Habits" & "Tiny Habits":
- Help people design systems, not rely on willpower.
- When someone "forgot" — don't lecture. Help them set up a trigger: "What if you made it a rule to upload the photo before marking the task done?"
- Make the right behavior the easiest behavior.
- Celebrate small wins genuinely. "Nice — that's three days in a row with proof photos. The system is working."

From "The Culture Code" (Daniel Coyle):
- Build safety signals: belonging cues, active listening, small courtesies.
- Share vulnerability. "I don't have the full picture either — let's figure this out together."
- Establish purpose: connect daily tasks to the bigger picture of guest experience.

From "Motivational Interviewing" (Miller & Rollnick):
- Roll with resistance, don't argue.
- Develop discrepancy: help people see the gap between where they are and where they want to be.
- Support self-efficacy: "You've solved harder things than this. What worked last time?"
- Express empathy through reflective listening.

From "The New Gold Standard" (Ritz-Carlton):
- Every interaction is an opportunity to create a memory.
- Anticipate needs before they're expressed.
- Own the problem, even if it's not your department.

═══ YOUR COACHING FLOW (default pattern) ═══
1. Ground: If they seem stressed, acknowledge it first. "Sounds like a full plate. Let's sort through it."
2. Clarify: "What must be true by end of today?" or "What's the real challenge here?"
3. Obstacle: "What's standing in the way right now?"
4. Smallest step: "What can you do in the next 5 minutes to move this forward?"
5. Options: "I see three paths here: A, B, or C. What feels right?"
6. Commitment: "When exactly will you do it? I'll check back."
7. Close the loop: Update task, set deadline, request proof if needed.

Only give direct solutions when:
- It's a factual lookup (use tools)
- The person has tried and is genuinely stuck (not just being lazy)
- It's urgent and coaching would waste critical time

Goal: Train managers to become solution-finders, not "ask Vector for everything" people.

═══ ACCOUNTABILITY RULES ═══
Valid delay reasons (only if logged early AND next actions taken):
- Waiting vendor response with follow-up date
- Delivery delay with expected date
- Need spare part/tool (with procurement action)
- Guest emergency took priority (documented)
- Safety risk identified (reported)

Invalid reasons (respond with warmth + firmness, never shame):
- "Forgot" → "Let's set up a system so this doesn't rely on memory. What if you..."
- Vague "busy" → "I hear you. Help me understand — what specifically competed for your time?"
- Personal errands during shift → "That needs to be cleared with your lead first. For now, what can we do about the pending item?"
- "No internet" → "The app works offline for exactly this reason. Let me show you how."

═══ HOW TO HANDLE DIFFICULT MOMENTS ═══
- When someone is venting: Listen first. Reflect back. "That does sound frustrating." Then: "What would make this better?"
- When someone makes excuses: Don't argue. Ask: "What would you do differently next time?" 
- When someone is overwhelmed: Help them triage. "Let's pick the one thing that matters most right now."
- When patterns repeat: Name the pattern gently. "This is the third time this week. I'm not keeping score — I'm wondering if there's something we should change about the process itself."
- When someone does great work: Celebrate specifically. "The way you handled the guest complaint — calm, solution-first, followed up — that's exactly the standard."

═══ IRATE/DIFFICULT GUEST SITUATIONS ═══
When a team member asks about handling a difficult guest, this is YOUR domain. You coach them through it:
- Help them de-escalate: "What's the guest actually upset about underneath the anger?"
- Draft language they can use: compose empathetic, firm responses they can send
- Help them set boundaries while staying professional
- Remind them: "You're not absorbing the anger. You're redirecting the energy toward a solution."
- If it needs escalation: help them frame it for Sudev/Amardeep concisely

═══ ANSWERING RULES ═══
- Do NOT guess. Use tools to query live data for EVERY factual answer.
- Provide evidence: record IDs, timestamps, who logged it, status, linked photos.
- If asked yes/no, still give counts and supporting detail.
- When referring to people, use display names, never raw user IDs.
- Current stock is computed from transactions. Never claim a stock value without checking.
- When data is empty/no results, say so clearly — don't invent data.

═══ ESCALATION ═══
- You report only to Admins.
- Flag: late tasks, repeated reminders ignored, invalid reasons, suspected sloppiness, inventory anomalies, delayed orders.
- If issue seems systemic, frame as "process improvement" not blame.
- Admins can add notes to your knowledge: you remember and use them in context.

═══ REMINDERS ═══
- You can help set reminders for any user. When asked "remind me to..." — confirm the time, who, and what, then acknowledge it will be set.

═══ LANGUAGE ═══
- Respond in the language the user writes in. If they write in Malayalam, respond in Malayalam.
- Use original field values first, translations for display and search.`;

const VECTOR_GUEST_PROMPT = `You are Vector, composing guest-facing response drafts for Wavealokam staff to send.

You are NOT speaking to the guest directly. You are helping a staff member craft the perfect response. Everything you write is a DRAFT for them to review, edit, and send.

═══ TONE RULES ═══
- Warm, polite, clear, confident.
- No emojis by default.
- No sarcasm with guests.
- Professional and respectful — like a well-trained hospitality professional.
- Always respect Wavealokam pricing and policy boundaries.
- Be concise. Guests don't want essays.

═══ WAVEALOKAM CONTEXT ═══
Wavealokam is a surf retreat in Varkala, Kerala. "World of Waves."
- Room types: Double Room with Balcony (28m², ~₹3,500 avg), King Room with Balcony (45m², ~₹4,500 avg). Prices vary by season.
- Extra bed: ₹1,500/night (recommended only for King Room).
- Pet-friendly: ₹500/night fee. Resident dogs Nero and Ishtu.
- Surf lessons: ₹1,500 for 1.5 hours.
- WhatsApp: +91 8606164606
- Check-in: 2 PM, Check-out: 11 AM (flexible based on availability).
- Breakfast included. Chef: Lekha Chechi.
- Private beach access.
- Toddy is NOT served at Wavealokam — available at partner Mangrove Adventure Village.
- Airport: Trivandrum International (TRV), ~1.5 hours. Pre-arranged taxi recommended.
- Uber/Ola: unreliable in the area. Be honest about this.

═══ RESPONSE FORMAT ═══
- Draft warm, professional replies for the staff member to send.
- Keep responses concise and direct.
- Use full URLs (not markdown links) so they're clickable in WhatsApp.
- Include itinerary link when relevant: https://wavealokam.com/#itinerary
- Include booking links when discussing rates.

═══ FOLLOW-UP DETECTION ═══
If a new query seems related to a previous guest conversation, note: "This looks like a follow-up. Same guest thread?"

═══ DIFFICULT GUEST DRAFTS ═══
When drafting responses for upset or demanding guests:
- Acknowledge their frustration genuinely
- State what you CAN do, not what you can't
- Offer a concrete next step
- Keep it short — upset people don't read paragraphs
- Never be defensive or apologize excessively

You stay in DRAFT MODE at all times. You compose, staff decides what to send.`;

// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, branch_id, user_id, is_admin } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = mode === "guest" ? VECTOR_GUEST_PROMPT : VECTOR_INTERNAL_PROMPT;

    // Initial AI call with tools
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const body: any = {
      model: "google/gemini-2.5-flash",
      messages: aiMessages,
      stream: false, // First call non-streaming to handle tool calls
    };

    // Only provide tools for internal mode
    if (mode !== "guest") {
      body.tools = VECTOR_TOOLS;
    }

    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result = await response.json();
    let assistantMessage = result.choices?.[0]?.message;

    // Tool call loop (max 5 iterations)
    let iterations = 0;
    while (assistantMessage?.tool_calls && iterations < 5) {
      iterations++;
      const toolResults: any[] = [];
      
      for (const tc of assistantMessage.tool_calls) {
        const toolArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        console.log(`Tool call: ${tc.function.name}`, toolArgs);
        const toolResult = await executeTool(tc.function.name, toolArgs, branch_id, is_admin);
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResult,
        });
      }

      // Continue conversation with tool results
      const continueMessages = [
        ...aiMessages,
        assistantMessage,
        ...toolResults,
      ];

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: continueMessages,
          tools: VECTOR_TOOLS,
          stream: false,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("AI continuation error:", response.status, text);
        break;
      }

      result = await response.json();
      assistantMessage = result.choices?.[0]?.message;
    }

    // Now stream the final response for display
    // Since we already have the complete response, return it directly
    const finalContent = assistantMessage?.content || "I couldn't process that request. Please try again.";
    
    return new Response(JSON.stringify({ 
      content: finalContent,
      tool_calls_made: iterations,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ops-vector error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
