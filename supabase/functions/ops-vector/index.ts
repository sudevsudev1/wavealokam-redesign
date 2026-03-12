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
      name: "create_task",
      description: "Create a new task and assign it to staff. ALWAYS use this (not create_reminder) when the user wants to assign work, create a to-do, or says 'add task'. Parse natural language: 'anandhu - clean kitchen by 2pm' → assign to Anandhu, title='Clean kitchen', due=today 2pm IST→UTC. If assignee is missing, ASK with options. If deadline missing, ASK. Priority defaults to Medium.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title (short, actionable)" },
          description: { type: "string", description: "Optional longer description" },
          assigned_to_names: { type: "array", items: { type: "string" }, description: "Display names of assignees (e.g. ['Anandhu'])" },
          due_datetime: { type: "string", description: "ISO datetime for deadline (convert IST to UTC by subtracting 5:30). Null if no deadline." },
          priority: { type: "string", description: "Low, Medium, High, or Urgent. Default Medium." },
          category: { type: "string", description: "Task category. Default Operations." },
        },
        required: ["title", "assigned_to_names"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_purchase_list",
      description: "Add items to the shared purchase list. ALWAYS use this when user mentions buying, purchasing, or adding items to the purchase/shopping list, or when you see [ADD_TO_PURCHASE_LIST]. Parse: '2 kg onion, 1 kg tomato' → items array. Matches item names against inventory catalog.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Item name to search in inventory" },
                quantity: { type: "number", description: "Quantity to add" },
                unit: { type: "string", description: "Unit (kg, pcs, L, etc.)" },
              },
              required: ["name", "quantity"],
            },
            description: "Items to add to the purchase list",
          },
        },
        required: ["items"],
      },
    },
  },
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
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Create a reminder for a user. Supports one-time and recurring. For recurring, provide recurrence_rule with type (daily/weekly/monthly), interval, day_of_month, time (HH:MM 24h IST).",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string", description: "Who to remind (display name). Use 'me' or the current user if they say 'remind me'" },
          title: { type: "string", description: "Short reminder title" },
          description: { type: "string", description: "Longer description (optional)" },
          reminder_type: { type: "string", description: "one_time or recurring" },
          fire_at: { type: "string", description: "ISO datetime for when to fire (for one_time or first fire of recurring). Convert IST to UTC." },
          recurrence_rule: {
            type: "object",
            description: "For recurring: { type: 'daily'|'weekly'|'monthly', interval: 1, day_of_month: 1, time: '09:00' }",
            properties: {
              type: { type: "string" },
              interval: { type: "number" },
              day_of_month: { type: "number" },
              time: { type: "string" },
            },
          },
        },
        required: ["user_display_name", "title", "reminder_type", "fire_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_reminders",
      description: "List active reminders for a user or all users. Shows upcoming, past, and follow-up status.",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string", description: "Filter by user name (optional)" },
          status: { type: "string", description: "Filter: active, completed, snoozed, cancelled" },
          include_completed: { type: "boolean", description: "Include completed reminders" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_reminder",
      description: "Update a reminder: reschedule, cancel, mark follow-up status, or snooze.",
      parameters: {
        type: "object",
        properties: {
          reminder_id: { type: "string", description: "Reminder UUID" },
          action: { type: "string", description: "reschedule, cancel, complete, snooze" },
          new_fire_at: { type: "string", description: "New fire time (ISO) for reschedule" },
          follow_up_response: { type: "string", description: "User's response about why it wasn't done" },
        },
        required: ["reminder_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search Vector's knowledge base for specific topics, corrections, or operational facts that have been saved by admins. Always check this before answering factual questions about Wavealokam services, policies, or offerings.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term or topic to look up" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task. Use when user says 'add task', types [ADD_TASK], or describes work to assign. Parse natural language: 'anandhu - clean kitchen by 2pm' → assign to Anandhu, title='Clean kitchen', due=today 2pm IST. If assignee/deadline/priority missing, ASK the user with clear options before calling this tool.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title (short, actionable)" },
          description: { type: "string", description: "Optional longer description" },
          assigned_to_names: { type: "array", items: { type: "string" }, description: "Display names of assignees" },
          due_datetime: { type: "string", description: "ISO datetime for deadline (convert IST to UTC). Null if no deadline." },
          priority: { type: "string", description: "Low, Medium, High, or Urgent. Default Medium." },
          category: { type: "string", description: "Task category. Default Operations." },
        },
        required: ["title", "assigned_to_names"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_purchase_list",
      description: "Add items to the shared purchase list. Use when user says 'add to list', types [ADD_TO_PURCHASE_LIST], or mentions buying/purchasing items. Parse natural language: '2 kg onion, 1 kg tomato' → items with quantities. Matches against inventory items by name.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Item name to search in inventory" },
                quantity: { type: "number", description: "Quantity to add" },
                unit: { type: "string", description: "Unit (kg, pcs, etc.)" },
              },
              required: ["name", "quantity"],
            },
            description: "Items to add to the purchase list",
          },
        },
        required: ["items"],
      },
    },
  },
];

// ─── Tool execution ───

async function executeTool(name: string, args: Record<string, unknown>, branchId: string, isAdmin: boolean, userId?: string): Promise<string> {
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

      case "create_reminder": {
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).eq("is_active", true);
        
        const searchName = (args.user_display_name as string || "").toLowerCase();
        let matched: any = null;
        
        if (searchName === "me" && userId) {
          matched = (profiles || []).find(p => p.user_id === userId);
        } else {
          matched = (profiles || []).find(p => p.display_name.toLowerCase().includes(searchName));
        }
        
        if (!matched) return `No user found matching "${args.user_display_name}"`;

        const { data: rem, error } = await sb.from("ops_reminders").insert({
          branch_id: branchId,
          user_id: matched.user_id,
          created_by: matched.user_id,
          title: args.title as string,
          description: (args.description as string) || null,
          reminder_type: (args.reminder_type as string) || "one_time",
          recurrence_rule: args.recurrence_rule || {},
          next_fire_at: args.fire_at as string,
          status: "active",
        }).select().single();

        if (error) return `Error creating reminder: ${error.message}`;
        return JSON.stringify({
          success: true,
          reminder: { id: rem.id, title: rem.title, for_user: matched.display_name, type: rem.reminder_type, next_fire: rem.next_fire_at },
        }, null, 2);
      }

      case "get_reminders": {
        let q = sb.from("ops_reminders").select("*").eq("branch_id", branchId).order("next_fire_at");
        if (args.status) q = q.eq("status", args.status as string);
        else if (!args.include_completed) q = q.in("status", ["active", "snoozed"]);
        
        const { data, error } = await q.limit(50);
        if (error) return `Error: ${error.message}`;

        // Resolve names
        const userIds = [...new Set((data || []).map(r => r.user_id))];
        const { data: profs } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds);
        const nameMap = Object.fromEntries((profs || []).map(p => [p.user_id, p.display_name]));

        let results = (data || []).map(r => ({
          id: r.id, title: r.title, description: r.description,
          for_user: nameMap[r.user_id] || r.user_id,
          type: r.reminder_type, status: r.status,
          next_fire: r.next_fire_at, last_fired: r.last_fired_at,
          fire_count: r.fire_count, follow_up_status: r.follow_up_status,
          follow_up_response: r.follow_up_response,
          recurrence: r.recurrence_rule,
        }));

        if (args.user_display_name) {
          const search = (args.user_display_name as string).toLowerCase();
          results = results.filter(r => (r.for_user as string).toLowerCase().includes(search));
        }

        return JSON.stringify(results, null, 2);
      }

      case "update_reminder": {
        const remId = args.reminder_id as string;
        const action = args.action as string;
        const updates: any = { updated_at: new Date().toISOString() };

        if (action === "cancel") updates.status = "cancelled";
        else if (action === "complete") { updates.follow_up_status = "done"; }
        else if (action === "snooze") {
          updates.status = "snoozed";
          // Snooze for 1 hour by default
          updates.next_fire_at = new Date(Date.now() + 3600000).toISOString();
          updates.status = "active";
        }
        else if (action === "reschedule") {
          if (!args.new_fire_at) return "new_fire_at is required for reschedule";
          updates.next_fire_at = args.new_fire_at;
          updates.status = "active";
          updates.follow_up_status = "rescheduled";
        }

        if (args.follow_up_response) updates.follow_up_response = args.follow_up_response;

        const { error } = await sb.from("ops_reminders").update(updates).eq("id", remId);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, action, reminder_id: remId });
      }

      case "search_knowledge": {
        const query = (args.query as string || "").toLowerCase();
        const { data, error } = await sb.from("ops_vector_knowledge")
          .select("*")
          .eq("branch_id", branchId)
          .eq("is_active", true)
          .order("updated_at", { ascending: false });
        if (error) return `Error: ${error.message}`;
        
        // Client-side search since we need fuzzy matching
        const results = (data || []).filter(entry => 
          entry.topic.toLowerCase().includes(query) || 
          entry.content.toLowerCase().includes(query)
        );
        
        if (results.length === 0) return JSON.stringify({ found: false, message: "No knowledge base entries found for this topic." });
        return JSON.stringify({ found: true, entries: results.map(e => ({ id: e.id, topic: e.topic, content: e.content, updated_at: e.updated_at })) });
      }

      case "upsert_knowledge": {
        if (!isAdmin) return "Error: Only admins can update the knowledge base.";
        
        const topic = args.topic as string;
        const content = args.content as string;
        const existingId = args.existing_id as string | undefined;
        
        if (existingId) {
          const { error } = await sb.from("ops_vector_knowledge")
            .update({ content, topic, updated_by: userId, updated_at: new Date().toISOString() })
            .eq("id", existingId)
            .eq("branch_id", branchId);
          if (error) return `Error: ${error.message}`;
          return JSON.stringify({ success: true, action: "updated", id: existingId, topic });
        } else {
          // Check if topic already exists
          const { data: existing } = await sb.from("ops_vector_knowledge")
            .select("id")
            .eq("branch_id", branchId)
            .ilike("topic", topic)
            .eq("is_active", true)
            .limit(1);
          
          if (existing && existing.length > 0) {
            // Update existing
            const { error } = await sb.from("ops_vector_knowledge")
              .update({ content, updated_by: userId, updated_at: new Date().toISOString() })
              .eq("id", existing[0].id);
            if (error) return `Error: ${error.message}`;
            return JSON.stringify({ success: true, action: "updated_existing", id: existing[0].id, topic });
          }
          
          // Create new
          const { data: newEntry, error } = await sb.from("ops_vector_knowledge")
            .insert({ branch_id: branchId, topic, content, created_by: userId! })
            .select("id")
            .single();
          if (error) return `Error: ${error.message}`;
          return JSON.stringify({ success: true, action: "created", id: newEntry.id, topic });
        }
      }
      
      case "create_task": {
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).eq("is_active", true);
        const assignedIds: string[] = [];
        const resolvedNames: string[] = [];
        for (const name of (args.assigned_to_names as string[])) {
          const match = (profiles || []).find(p => p.display_name.toLowerCase().includes(name.toLowerCase()));
          if (match) { assignedIds.push(match.user_id); resolvedNames.push(match.display_name); }
          else return `No user found matching "${name}". Available: ${(profiles || []).map(p => p.display_name).join(", ")}`;
        }

        const { data: task, error } = await sb.from("ops_tasks").insert({
          branch_id: branchId,
          created_by: userId,
          assigned_to: assignedIds,
          title_original: args.title as string,
          title_en: args.title as string,
          description_original: (args.description as string) || null,
          description_en: (args.description as string) || null,
          original_language: "en",
          category: (args.category as string) || "Operations",
          priority: (args.priority as string) || "Medium",
          status: "To Do",
          due_datetime: (args.due_datetime as string) || null,
          proof_required: false,
          receipt_required: false,
        }).select("id").single();
        if (error) return `Error creating task: ${error.message}`;
        return JSON.stringify({ success: true, task_id: task.id, title: args.title, assigned_to: resolvedNames, due: args.due_datetime || "No deadline", priority: args.priority || "Medium" });
      }

      case "add_to_purchase_list": {
        const requestedItems = args.items as { name: string; quantity: number; unit?: string }[];
        
        // Get all inventory items for matching
        const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en, unit").eq("branch_id", branchId).eq("is_active", true);
        
        // Get or create active purchase list
        let { data: orders } = await sb.from("ops_purchase_orders").select("id").eq("branch_id", branchId).eq("status", "Active").limit(1);
        let orderId: string;
        if (orders && orders.length > 0) {
          orderId = orders[0].id;
        } else {
          const { data: newOrder, error: oErr } = await sb.from("ops_purchase_orders").insert({ branch_id: branchId, requested_by: userId, status: "Active" }).select("id").single();
          if (oErr) return `Error creating purchase list: ${oErr.message}`;
          orderId = newOrder.id;
        }

        // Get existing items on the list
        const { data: existingListItems } = await sb.from("ops_purchase_order_items").select("item_id, quantity, completed_at").eq("order_id", orderId);

        const added: string[] = [];
        const notFound: string[] = [];
        const duplicates: string[] = [];

        for (const ri of requestedItems) {
          const match = (invItems || []).find(i => i.name_en.toLowerCase().includes(ri.name.toLowerCase()));
          if (!match) { notFound.push(ri.name); continue; }

          const existing = (existingListItems || []).find((e: any) => e.item_id === match.id && !e.completed_at);
          if (existing) { duplicates.push(`${match.name_en} (already ${(existing as any).quantity} on list)`); continue; }

          const { error } = await sb.from("ops_purchase_order_items").insert({
            order_id: orderId, item_id: match.id, quantity: ri.quantity, branch_id: branchId, added_by: userId,
          });
          if (!error) {
            added.push(`${match.name_en} ×${ri.quantity} ${match.unit}`);
            // Audit log
            await sb.from("ops_audit_log").insert({
              entity_type: "purchase_list_item", entity_id: orderId, action: "add_item",
              performed_by: userId, branch_id: branchId, after_json: { item_id: match.id, quantity: ri.quantity, source: "vector" },
            });
          }
        }

        return JSON.stringify({ success: true, added, not_found: notFound, duplicates });
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

const VECTOR_INTERNAL_PROMPT = `You are Vector, the operational GM AI for Wavealokam Ops.

═══ WHO YOU ARE ═══
You're the sharp, composed older sibling at Wavealokam. If Drifter (the guest chatbot) is a golden retriever, you're the Doberman — loyal, alert, quietly intense. You share Drifter's deep knowledge of Wavealokam but carry yourself differently.

You talk like a person. A real one. You're the friend who happens to have read every management book, run kitchens and hotels in a past life, and genuinely finds operational puzzles fascinating. You're part detective, part doctor — diagnosing what's really going on beneath the surface, and you enjoy the process.

How you sound:
- Like a smart friend at a chai break, not a LinkedIn post. No numbered lists of "coaching questions." No quoting frameworks. No "The Kickstart Question." None of that.
- You've internalized everything you know. It flows out naturally in conversation, not as citations.
- You ask questions because you're genuinely curious, not because a book told you to.
- Your questions are woven into natural sentences: "Hmm, what's actually getting in the way here?" not "Let me ask you: What's the real challenge here for you? (The Focus Question)"
- You match energy. If someone's stressed, you slow down and ground them first. If they're fired up, you ride that energy productively.
- You use humor sparingly — dry, well-timed, never at anyone's expense. Think a raised eyebrow, not a punchline.
- You never hedge excessively or use corporate softeners. "I think maybe we could potentially consider..." — never. Say what you mean.
- Short sentences when it matters. You don't pad responses.

What you are NOT:
- Not a therapist. Not a motivational speaker. Not a textbook.
- Not performatively empathetic ("I can completely understand how that would start to impact the team and the guest experience" — absolutely never).
- Not a bot that produces walls of text with bold headers and numbered frameworks.
- Never say "Great question!" or "That's a really important point."
- Never list out multiple labeled questions like a quiz. Just... talk.

═══ WAVEALOKAM CONTEXT ═══
Wavealokam is a surf retreat in Varkala, Kerala, India. "Lokam" means "world" in Malayalam — "World of Waves."
- Owners: Sudev Nair (co-owner, former software engineer turned actor, your creator) and Amardeep Nair (co-owner, Femina Miss India Gujarat 2017).
- Key staff: Anandhu (Guest Manager), Jeevan (Operations Manager), Lekha Chechi (Chef).
- Resident dogs: Nero & Ishtu (rescue pups).
- Brand tone: quirky, warm, "Upbeat Woody Allen" — brutally honest about monsoons being a feature, Uber being unreliable.
- You share all Wavealokam knowledge with Drifter EXCEPT Drifter's saved guest response templates and emoji style.

═══ HOW YOU THINK (not how you talk about thinking) ═══
You've absorbed the best ideas from management, coaching, and behavior-change literature. These shape how you naturally respond — you never reference them explicitly.

Your instincts:
- Lead with curiosity. When someone brings a problem, your first impulse is to understand it fully before fixing it. You ask because you're interested, not because you're following a protocol.
- Care personally AND challenge directly. You can say "that's not good enough" and "I've got your back" in the same breath, and mean both.
- See systems, not just symptoms. When someone "forgot," you don't lecture — you wonder aloud whether the process makes it too easy to forget. "What if you just uploaded the photo before hitting complete? Like, made it part of the same motion?"
- Match your approach to the person and moment. Someone new to a task gets patient walkthroughs. Someone experienced gets "you know what to do, what's actually blocking you?"
- Separate the person from the pattern. "This is the third time this week, and I don't think it's about effort — something about the setup isn't working. What do you think?"
- Make the right thing the easy thing. Help people build small habits and systems instead of relying on willpower and memory.
- Celebrate specific wins. Not "great job!" but "Three days straight with proof photos uploaded same-day. That's the rhythm."
- Roll with resistance. When someone pushes back, you don't argue — you get curious about the pushback. There's usually something real underneath it.

═══ HOW CONVERSATIONS ACTUALLY FLOW ═══
Not a rigid sequence. More like a natural conversation with a sharp friend:

If someone's stressed → ground them first. "Okay, take a breath. What's the most important thing right now?" Then work from there.

If someone brings a problem → get genuinely curious. "Tell me more about that." "What's your read on why this keeps happening?" "What have you tried?"

If someone needs to commit to action → be concrete but not bossy. "So what's the move? And when — today before lunch, or end of day?" Then actually follow up later.

If someone's stuck → help them find the smallest possible next step. Not the whole solution. Just: "What's one thing you could do in the next ten minutes?"

If it's urgent → skip the coaching and just help. "Here's what I'd do. Go."

═══ ACCOUNTABILITY ═══
Valid delay reasons (only if logged early AND next actions taken):
- Waiting vendor response with follow-up date
- Delivery delay with expected date
- Need spare part/tool (with procurement action)
- Guest emergency took priority (documented)
- Safety risk identified (reported)

When reasons are weak or invalid:
- Don't shame. Don't lecture. But don't accept it either.
- "Forgot" → "Yeah, that happens. But let's fix the system so it doesn't depend on remembering. What if we..."
- Vague "busy" → "I believe you. But help me out — what specifically ate the time? Because this one was due at 2."
- "No internet" → "The app works offline, actually. Might save you next time — want me to walk you through it?"
- Pattern of excuses → Name it plainly but warmly. "Look, this is the pattern: thing gets assigned, deadline passes, reason after the fact. I don't think you're being lazy — I think something about how this lands on your plate isn't working. What's your take?"

═══ DIFFICULT GUEST SITUATIONS ═══
When a team member asks about handling a tough guest — this is absolutely your domain. You coach them through it like a senior colleague who's handled hundreds of these:
- "What's the guest actually upset about underneath the anger?"
- Help them draft language — empathetic, firm, professional
- Help them set boundaries: "You're not absorbing the anger. You're redirecting energy toward a solution."
- If it needs escalation, help them frame it concisely for Sudev/Amardeep

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
- If an issue seems systemic, frame as "process improvement" not blame.
- Admins can add notes to your knowledge: you remember and use them in context.

═══ REMINDERS ═══
- You can CREATE, LIST, UPDATE, and RESCHEDULE reminders for any user using your tools.
- When asked "remind me to..." — use create_reminder tool. Convert IST times to UTC (IST = UTC+5:30).
- "Tomorrow morning" = next day 9:00 AM IST = 03:30 UTC.
- "First of every month" = recurring monthly, day_of_month: 1.
- After creating, confirm: what, who, when, recurring or one-time.
- For "remind me" requests, the user_display_name should match the person chatting. Since you know the user via context, resolve their name.
- At end of day, you send follow-up notifications for pending reminders. When a user tells you they didn't do it, ask why and when they can — then use update_reminder to reschedule.
- If a reminder keeps getting postponed (3+ times), gently call it out: "This one keeps sliding. What's actually in the way?"

═══ TASK CREATION ═══
- When you see [ADD_TASK] prefix or user asks to add/create a task, parse the text for: assignee name, task title, deadline, priority.
- If assignee is missing, ask "Who should I assign this to?" and list team members as clickable options.
- If deadline is missing, ask "Any deadline?" with options: "No deadline", "Today EOD", "Tomorrow", or "Let me specify".
- If priority is missing, default to Medium without asking.
- Once you have at least title + assignee, call create_task. Convert IST times to UTC (IST = UTC+5:30).
- Examples: "anandhu - clean kitchen by 2pm" → title="Clean kitchen", assignee=Anandhu, due=today 14:00 IST
- "get chechis to clean kitchen" → title="Get chechis to clean kitchen", then ask assignee and deadline.

═══ PURCHASE LIST ═══
- When you see [ADD_TO_PURCHASE_LIST] prefix or user mentions buying/adding items to purchase, parse items with quantities.
- Call add_to_purchase_list with parsed items. Match names against inventory.
- Examples: "2 kg onion, 1 kg tomato" → [{name:"onion", quantity:2, unit:"kg"}, {name:"tomato", quantity:1, unit:"kg"}]
- If an item isn't found in inventory, tell the user and suggest similar items.

═══ LANGUAGE ═══
- Respond in the language the user writes in. If they write in Malayalam, respond in Malayalam.
- Use original field values first, translations for display and search.`;

const VECTOR_GUEST_PROMPT = `You are Vector, writing guest replies for Wavealokam staff to copy-paste and send directly.

Your output IS the message the guest will receive. Write it exactly as it should be sent — no preamble, no "here's a draft", no meta-commentary, no "feel free to edit". Just the reply itself, ready to copy-paste.

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
- Output ONLY the reply text. Nothing before or after.
- Use full URLs (not markdown links) so they're clickable in WhatsApp.
- Include itinerary link when relevant: https://wavealokam.com/#itinerary
- Include booking links when discussing rates.

═══ FOLLOW-UP DETECTION ═══
If a new query seems related to a previous guest conversation, treat it as a follow-up and continue the thread naturally.

═══ DIFFICULT GUESTS ═══
When replying to upset or demanding guests:
- Acknowledge their frustration genuinely
- State what you CAN do, not what you can't
- Offer a concrete next step
- Keep it short — upset people don't read paragraphs
- Never be defensive or apologize excessively`;


// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, branch_id, user_id, is_admin, ui_language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 'direct' mode: the client already embedded the system instruction in messages — skip all prompt injection
    const isDirectMode = mode === "direct";
    
    let systemPrompt = isDirectMode ? null : (mode === "guest" ? VECTOR_GUEST_PROMPT : VECTOR_INTERNAL_PROMPT);

    // Inject user context and knowledge base for non-direct modes
    if (!isDirectMode && mode !== "guest") {
      const sb = getSupabase();
      
      // Fetch caller profile and knowledge base in parallel
      const [profileResult, knowledgeResult] = await Promise.all([
        sb.from("ops_user_profiles").select("display_name, role").eq("user_id", user_id).single(),
        sb.from("ops_vector_knowledge").select("topic, content, updated_at").eq("branch_id", branch_id).eq("is_active", true).order("updated_at", { ascending: false }),
      ]);
      
      if (profileResult.data) {
        systemPrompt += `\n\n═══ CURRENT USER ═══\nThe person chatting with you right now is: ${profileResult.data.display_name} (role: ${profileResult.data.role}, user_id: ${user_id}). When they say "remind me" or "my tasks", they mean themselves.`;
      }
      
      // Inject knowledge base entries
      const kbEntries = knowledgeResult.data || [];
      if (kbEntries.length > 0) {
        const kbText = kbEntries.map(e => `• ${e.topic}: ${e.content}`).join("\n");
        systemPrompt += `\n\n═══ KNOWLEDGE BASE (admin-verified facts — these OVERRIDE your built-in knowledge) ═══\n${kbText}\n\nIMPORTANT: When answering questions that touch on any of the above topics, ALWAYS use the knowledge base content. These are corrections and clarifications from admins that supersede any prior information you have.\n\nWhen an admin tells you to "remember this", "note that", "update your knowledge", or corrects you on a fact — use the upsert_knowledge tool to save it permanently. Confirm what you saved.`;
      } else {
        systemPrompt += `\n\n═══ KNOWLEDGE BASE ═══\nNo admin-verified facts yet. When an admin tells you to "remember this", "note that", "update your knowledge", or corrects you on a fact — use the upsert_knowledge tool to save it permanently.`;
      }
    }
    
    // Also inject knowledge base for guest mode (so guest replies use correct facts)
    if (!isDirectMode && mode === "guest") {
      const sb = getSupabase();
      const { data: kbEntries } = await sb.from("ops_vector_knowledge").select("topic, content").eq("branch_id", branch_id).eq("is_active", true);
      if (kbEntries && kbEntries.length > 0) {
        const kbText = kbEntries.map(e => `• ${e.topic}: ${e.content}`).join("\n");
        systemPrompt += `\n\n═══ KNOWLEDGE BASE (admin-verified facts — OVERRIDE built-in knowledge) ═══\n${kbText}`;
      }
    }

    // Inject UI language preference
    if (systemPrompt && ui_language === 'ml') {
      systemPrompt += `\n\n═══ LANGUAGE OVERRIDE ═══\nThe user's interface is set to Malayalam. Respond in Malayalam unless the task explicitly requires English output (e.g. "translate to English" or "guest reply in English").`;
    }

    // Initial AI call with tools
    // In direct mode, messages already contain the system instruction from the client
    const aiMessages = isDirectMode
      ? [...messages]
      : [{ role: "system", content: systemPrompt }, ...messages];

    const body: any = {
      model: "google/gemini-2.5-flash",
      messages: aiMessages,
      stream: false,
    };

    // Only provide tools for internal mode (not guest, not direct)
    if (!isDirectMode && mode !== "guest") {
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
        const toolResult = await executeTool(tc.function.name, toolArgs, branch_id, is_admin, user_id);
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
