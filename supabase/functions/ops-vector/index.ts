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

// ─── Tool definitions ───

const VECTOR_TOOLS = [
  // ═══ TASKS: Full CRUD ═══
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task and assign it to staff. Parse natural language: 'anandhu - clean kitchen by 2pm' → assign to Anandhu, title='Clean kitchen', due=today 2pm IST→UTC. If assignee missing, ASK. Priority defaults to Medium.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title (short, actionable)" },
          description: { type: "string", description: "Optional longer description" },
          assigned_to_names: { type: "array", items: { type: "string" }, description: "Display names of assignees" },
          due_datetime: { type: "string", description: "ISO datetime for deadline (convert IST to UTC by subtracting 5:30)" },
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
      name: "update_task",
      description: "Update an existing task. Can change title, description, status, priority, due date, assignees, add completion notes, blocked reason. Use search_tasks first to find the task ID if needed.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "UUID of the task to update" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", description: "To Do, In Progress, Done, Blocked, Cancelled" },
          priority: { type: "string", description: "Low, Medium, High, Urgent" },
          due_datetime: { type: "string", description: "ISO datetime (IST→UTC)" },
          assigned_to_names: { type: "array", items: { type: "string" }, description: "Replace assignees with these names" },
          completion_notes: { type: "string", description: "Notes about task completion" },
          blocked_reason: { type: "string", description: "Reason the task is blocked" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a task permanently. Use when user explicitly asks to remove/delete a task.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "UUID of the task to delete" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_delete_tasks",
      description: "Delete multiple tasks at once. Use get_tasks_summary or search_tasks first to collect IDs, then pass them here. Confirms count before executing.",
      parameters: {
        type: "object",
        properties: {
          task_ids: { type: "array", items: { type: "string" }, description: "Array of task UUIDs to delete" },
        },
        required: ["task_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks_summary",
      description: "Get task summary for a user or all users. Use to list tasks before bulk operations like delete.",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string" },
          status: { type: "string", description: "To Do, In Progress, Done, Blocked, Cancelled" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          include_overdue: { type: "boolean" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description: "Search tasks by keyword in title, description, notes. Returns matching tasks with IDs for further operations.",
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

  // ═══ PURCHASE LIST: Full CRUD ═══
  {
    type: "function",
    function: {
      name: "add_to_purchase_list",
      description: "Add items to the shared purchase list. Parse: '2 kg onion, 1 kg tomato' → items array. Matches against inventory catalog. One-time items can be added too.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
              },
              required: ["name", "quantity"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_purchase_item",
      description: "Update quantity or other details of an item already on the purchase list.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Name of item to find on the list" },
          new_quantity: { type: "number", description: "New quantity" },
        },
        required: ["item_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_purchase_item",
      description: "Remove an item from the purchase list.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Name of item to remove" },
        },
        required: ["item_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tick_off_purchase_item",
      description: "Mark a purchase list item as received/completed. This adds the quantity to inventory stock automatically via FIFO batch creation.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Name of item to tick off" },
          received_quantity: { type: "number", description: "Actual quantity received (defaults to ordered quantity)" },
        },
        required: ["item_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_purchase_list",
      description: "Get current purchase list items with their status (pending/completed).",
      parameters: {
        type: "object",
        properties: {
          include_completed: { type: "boolean", description: "Include ticked-off items" },
        },
        required: [],
      },
    },
  },

  // ═══ INVENTORY: Issue & Query ═══
  {
    type: "function",
    function: {
      name: "issue_room_items",
      description: "Issue/deduct inventory items for a room refresh based on the room's refill template. User says 'room 102 refreshed' → deducts all template items from inventory.",
      parameters: {
        type: "object",
        properties: {
          room_id: { type: "string", description: "Room ID (e.g., '102', '202')" },
        },
        required: ["room_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "issue_item",
      description: "Deduct a specific inventory item. Use when user says 'used 2 tissue rolls' or 'issued 1 mop cloth'.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Item name" },
          quantity: { type: "number", description: "Quantity to deduct" },
          reason: { type: "string", description: "Reason/notes (e.g., 'Room 103 refresh', 'kitchen use')" },
        },
        required: ["item_name", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory_status",
      description: "Get inventory items with stock levels, statuses, and expiry warnings.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string" },
          status_filter: { type: "string", description: "due_for_order, ordered, expiring_soon, all" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory_transactions",
      description: "Get transaction history for an inventory item.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          limit: { type: "number" },
        },
        required: ["item_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expiry_batches",
      description: "Get inventory expiry batch details.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Show items expiring within N days (default 7)" },
          include_disposed: { type: "boolean" },
        },
        required: [],
      },
    },
  },

  // ═══ GUEST LOG: Full CRUD ═══
  {
    type: "function",
    function: {
      name: "get_guest_log",
      description: "Search guest log. Find guests by name, date, room, nationality, duration. Returns check-in/out times, room, booking source.",
      parameters: {
        type: "object",
        properties: {
          guest_name: { type: "string" },
          date: { type: "string", description: "Specific date YYYY-MM-DD" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          room_id: { type: "string" },
          nationality: { type: "string" },
          min_nights: { type: "number" },
          export_contacts: { type: "boolean", description: "Admin only" },
          status: { type: "string", description: "checked_in, checked_out, all" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_in_guest",
      description: "Register a new guest check-in. Parse natural language for guest details.",
      parameters: {
        type: "object",
        properties: {
          guest_name: { type: "string" },
          room_id: { type: "string" },
          adults: { type: "number" },
          children: { type: "number" },
          phone: { type: "string" },
          email: { type: "string" },
          source: { type: "string", description: "Walk-in, Booking.com, MMT, Agoda, Direct, etc." },
          number_of_nights: { type: "number" },
          expected_check_out: { type: "string", description: "ISO datetime" },
          expected_check_in: { type: "string", description: "ISO datetime for expected arrival" },
          nationality: { type: "string" },
          purpose: { type: "string" },
          notes: { type: "string" },
        },
        required: ["guest_name", "room_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_out_guest",
      description: "Check out a guest by name or room. Marks status as checked_out.",
      parameters: {
        type: "object",
        properties: {
          guest_name: { type: "string", description: "Guest name to find" },
          room_id: { type: "string", description: "Room ID to find guest" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_room",
      description: "Recommend the best room for a new guest based on check-in/out schedules, occupancy, and room availability. Considers expected check-in/out times of existing guests.",
      parameters: {
        type: "object",
        properties: {
          check_in_date: { type: "string", description: "ISO date or 'tomorrow', 'today'" },
          check_in_time: { type: "string", description: "Expected arrival time e.g. '6 PM', '14:00'" },
          number_of_nights: { type: "number" },
          adults: { type: "number" },
          children: { type: "number" },
          preferences: { type: "string", description: "Any preferences like 'bigger room', 'quiet'" },
        },
        required: ["check_in_date", "number_of_nights"],
      },
    },
  },

  // ═══ SHIFTS ═══
  {
    type: "function",
    function: {
      name: "get_shift_punches",
      description: "Get shift punch records.",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          flagged_only: { type: "boolean" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "end_shift",
      description: "Clock out / end shift for the current user or a specified user. Records clock-out time.",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string", description: "User name. Use 'me' for current user." },
          notes: { type: "string", description: "End-of-shift notes" },
        },
        required: [],
      },
    },
  },

  // ═══ DAILY REPORTS ═══
  {
    type: "function",
    function: {
      name: "get_daily_report_data",
      description: "Compile daily operations data: tasks, occupancy, inventory alerts, shifts.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_daily_report",
      description: "Submit a daily report with the conversationally gathered data. Also ends the user's shift.",
      parameters: {
        type: "object",
        properties: {
          report_date: { type: "string", description: "YYYY-MM-DD" },
          revenue_total: { type: "number" },
          revenue_cash: { type: "number" },
          revenue_online: { type: "number" },
          occupancy_notes: { type: "string" },
          kitchen_notes: { type: "string" },
          maintenance_notes: { type: "string" },
          general_notes: { type: "string" },
          highlights: { type: "string" },
          issues: { type: "string" },
        },
        required: ["report_date"],
      },
    },
  },

  // ═══ LAUNDRY ═══
  {
    type: "function",
    function: {
      name: "send_laundry",
      description: "Record a laundry batch being sent out. Tracks sets count and calculates expected return based on cutoff (before noon = back day-after-tomorrow noon).",
      parameters: {
        type: "object",
        properties: {
          sets_count: { type: "number", description: "Number of linen sets being sent" },
          notes: { type: "string" },
        },
        required: ["sets_count"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "receive_laundry",
      description: "Record a laundry batch being received back.",
      parameters: {
        type: "object",
        properties: {
          batch_id: { type: "string", description: "Laundry batch ID" },
          actual_sets: { type: "number", description: "Actual sets received (if different from sent)" },
          notes: { type: "string" },
        },
        required: ["batch_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "laundry_forecast",
      description: "Analyze laundry availability vs upcoming check-ins. Calculates if there will be enough fresh linen sets. Uses: 8 total sets, 5 rooms, 2-day turnaround, noon cutoff.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Forecast window in days (default 5)" },
        },
        required: [],
      },
    },
  },

  // ═══ UTILITY ═══
  {
    type: "function",
    function: {
      name: "get_audit_log",
      description: "Search audit logs for entity changes.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string" },
          entity_id: { type: "string" },
          action: { type: "string" },
          date_from: { type: "string" },
          limit: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_room_issue_history",
      description: "Get inventory items issued to a specific room.",
      parameters: {
        type: "object",
        properties: {
          room_id: { type: "string" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          item_name: { type: "string" },
        },
        required: ["room_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_bills_and_receipts",
      description: "Search task attachments of type Receipt/Bill.",
      parameters: {
        type: "object",
        properties: {
          vendor: { type: "string" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          limit: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_profiles",
      description: "Get ops user profiles.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Create a reminder. Use ONLY for personal time-based notifications, NOT for work assignments (use create_task for those).",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          reminder_type: { type: "string", description: "one_time or recurring" },
          fire_at: { type: "string", description: "ISO datetime (IST→UTC)" },
          recurrence_rule: {
            type: "object",
            properties: { type: { type: "string" }, interval: { type: "number" }, day_of_month: { type: "number" }, time: { type: "string" } },
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
      description: "List active reminders.",
      parameters: {
        type: "object",
        properties: {
          user_display_name: { type: "string" },
          status: { type: "string" },
          include_completed: { type: "boolean" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_reminder",
      description: "Update a reminder: reschedule, cancel, complete, snooze.",
      parameters: {
        type: "object",
        properties: {
          reminder_id: { type: "string" },
          action: { type: "string", description: "reschedule, cancel, complete, snooze" },
          new_fire_at: { type: "string" },
          follow_up_response: { type: "string" },
        },
        required: ["reminder_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search Vector's knowledge base for specific topics.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_knowledge",
      description: "Admin only: save/update a fact in Vector's knowledge base.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          content: { type: "string" },
          existing_id: { type: "string" },
        },
        required: ["topic", "content"],
      },
    },
  },
];

// ─── Tool execution ───

async function executeTool(name: string, args: Record<string, unknown>, branchId: string, isAdmin: boolean, userId?: string): Promise<string> {
  const sb = getSupabase();
  
  try {
    switch (name) {

      // ═══ TASKS ═══
      
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
          branch_id: branchId, created_by: userId, assigned_to: assignedIds,
          title_original: args.title as string, title_en: args.title as string,
          description_original: (args.description as string) || null, description_en: (args.description as string) || null,
          original_language: "en", category: (args.category as string) || "Operations",
          priority: (args.priority as string) || "Medium", status: "To Do",
          due_datetime: (args.due_datetime as string) || null, proof_required: false, receipt_required: false,
        }).select("id").single();
        if (error) return `Error creating task: ${error.message}`;
        return JSON.stringify({ success: true, task_id: task.id, title: args.title, assigned_to: resolvedNames, due: args.due_datetime || "No deadline", priority: args.priority || "Medium" });
      }

      case "update_task": {
        const taskId = args.task_id as string;
        const updates: any = { updated_at: new Date().toISOString() };
        
        if (args.title) { updates.title_original = args.title; updates.title_en = args.title; }
        if (args.description) { updates.description_original = args.description; updates.description_en = args.description; }
        if (args.status) updates.status = args.status;
        if (args.priority) updates.priority = args.priority;
        if (args.due_datetime) updates.due_datetime = args.due_datetime;
        if (args.completion_notes) { updates.completion_notes_original = args.completion_notes; updates.completion_notes_en = args.completion_notes; }
        if (args.blocked_reason) { updates.blocked_reason_text_original = args.blocked_reason; updates.blocked_reason_text_en = args.blocked_reason; updates.blocked_reason_code = "other"; }
        
        if (args.assigned_to_names) {
          const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).eq("is_active", true);
          const ids: string[] = [];
          for (const n of (args.assigned_to_names as string[])) {
            const match = (profiles || []).find(p => p.display_name.toLowerCase().includes(n.toLowerCase()));
            if (match) ids.push(match.user_id);
            else return `No user found matching "${n}"`;
          }
          updates.assigned_to = ids;
        }
        
        const { error } = await sb.from("ops_tasks").update(updates).eq("id", taskId).eq("branch_id", branchId);
        if (error) return `Error updating task: ${error.message}`;
        
        // Audit
        await sb.from("ops_audit_log").insert({
          entity_type: "task", entity_id: taskId, action: "update",
          performed_by: userId, branch_id: branchId, after_json: updates,
        });
        
        return JSON.stringify({ success: true, task_id: taskId, updates: Object.keys(updates).filter(k => k !== "updated_at") });
      }

      case "delete_task": {
        const taskId = args.task_id as string;
        const { data: existing } = await sb.from("ops_tasks").select("title_en, title_original").eq("id", taskId).eq("branch_id", branchId).single();
        if (!existing) return `Task not found: ${taskId}`;
        
        const { error } = await sb.from("ops_tasks").delete().eq("id", taskId).eq("branch_id", branchId);
        if (error) return `Error deleting task: ${error.message}`;
        
        await sb.from("ops_audit_log").insert({
          entity_type: "task", entity_id: taskId, action: "delete",
          performed_by: userId, branch_id: branchId, before_json: existing,
        });
        
        return JSON.stringify({ success: true, deleted: existing.title_en || existing.title_original });
      }

      case "bulk_delete_tasks": {
        const taskIds = args.task_ids as string[];
        if (!taskIds || taskIds.length === 0) return "No task IDs provided.";
        
        // Fetch all tasks first for audit
        const { data: tasks } = await sb.from("ops_tasks").select("id, title_en, title_original").eq("branch_id", branchId).in("id", taskIds);
        if (!tasks || tasks.length === 0) return "No matching tasks found in this branch.";
        
        const { error } = await sb.from("ops_tasks").delete().eq("branch_id", branchId).in("id", taskIds);
        if (error) return `Error bulk deleting: ${error.message}`;
        
        // Audit log
        for (const t of tasks) {
          await sb.from("ops_audit_log").insert({
            entity_type: "task", entity_id: t.id, action: "bulk_delete",
            performed_by: userId, branch_id: branchId, before_json: { title: t.title_en || t.title_original },
          });
        }
        
        const titles = tasks.map(t => t.title_en || t.title_original);
        return JSON.stringify({ success: true, deleted_count: tasks.length, deleted_titles: titles });
      }

      case "get_tasks_summary": {
        let q = sb.from("ops_tasks").select("*, ops_task_attachments(id, type)").eq("branch_id", branchId).order("created_at", { ascending: false });
        if (args.status) q = q.eq("status", args.status as string);
        if (args.include_overdue) q = q.lt("due_datetime", new Date().toISOString()).not("status", "in", '("Done","Cancelled")');
        if (args.date_from) q = q.gte("created_at", args.date_from as string);
        if (args.date_to) q = q.lte("created_at", args.date_to as string);
        const { data: tasks, error } = await q.limit(100);
        if (error) return `Error: ${error.message}`;
        
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
        };
        filteredTasks.forEach(t => { summary.by_status[t.status] = (summary.by_status[t.status] || 0) + 1; });
        
        return JSON.stringify({
          summary: { total: summary.total, by_status: summary.by_status, overdue_count: summary.overdue.length, blocked_count: summary.blocked.length },
          overdue_tasks: summary.overdue.map(t => ({ id: t.id, title: t.title_en || t.title_original, status: t.status, due: t.due_datetime, assigned_to: t.assigned_to })),
          blocked_tasks: summary.blocked.map(t => ({ id: t.id, title: t.title_en || t.title_original, blocked_reason: t.blocked_reason_text_en || t.blocked_reason_code })),
          tasks: filteredTasks.slice(0, 20).map(t => ({ id: t.id, title: t.title_en || t.title_original, status: t.status, priority: t.priority, due: t.due_datetime, category: t.category, notes: t.completion_notes_en })),
        }, null, 2);
      }
      
      case "search_tasks": {
        const kw = (args.keyword as string).toLowerCase();
        const limit = (args.limit as number) || 10;
        const { data, error } = await sb.from("ops_tasks").select("*").eq("branch_id", branchId).order("created_at", { ascending: false }).limit(200);
        if (error) return `Error: ${error.message}`;
        
        const results = (data || []).filter(t => {
          const fields = [t.title_original, t.title_en, t.title_ml, t.description_original, t.description_en, t.completion_notes_en, t.blocked_reason_text_en].filter(Boolean);
          return fields.some(f => f!.toLowerCase().includes(kw));
        }).slice(0, limit);
        
        const userIds = [...new Set(results.flatMap(t => [...t.assigned_to, t.created_by]))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        return JSON.stringify(results.map(t => ({
          id: t.id, title: t.title_en || t.title_original, description: t.description_en,
          status: t.status, priority: t.priority, due: t.due_datetime, category: t.category,
          assigned_to: t.assigned_to.map((id: string) => nameMap[id] || id),
          created_by: nameMap[t.created_by] || t.created_by, created_at: t.created_at,
          blocked_reason: t.blocked_reason_text_en, completion_notes: t.completion_notes_en,
        })), null, 2);
      }

      // ═══ PURCHASE LIST ═══

      case "add_to_purchase_list": {
        const requestedItems = args.items as { name: string; quantity: number; unit?: string }[];
        const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en, unit").eq("branch_id", branchId).eq("is_active", true);
        
        let { data: orders } = await sb.from("ops_purchase_orders").select("id").eq("branch_id", branchId).eq("status", "Active").limit(1);
        let orderId: string;
        if (orders && orders.length > 0) {
          orderId = orders[0].id;
        } else {
          const { data: newOrder, error: oErr } = await sb.from("ops_purchase_orders").insert({ branch_id: branchId, requested_by: userId, status: "Active" }).select("id").single();
          if (oErr) return `Error creating purchase list: ${oErr.message}`;
          orderId = newOrder.id;
        }

        const { data: existingListItems } = await sb.from("ops_purchase_order_items").select("item_id, quantity, completed_at").eq("order_id", orderId);
        const added: string[] = [];
        const notFound: string[] = [];
        const duplicates: string[] = [];

        for (const ri of requestedItems) {
          const match = (invItems || []).find(i => i.name_en.toLowerCase().includes(ri.name.toLowerCase()));
          if (!match) { notFound.push(ri.name); continue; }
          const existing = (existingListItems || []).find((e: any) => e.item_id === match.id && !e.completed_at);
          if (existing) { duplicates.push(`${match.name_en} (already ${(existing as any).quantity} on list)`); continue; }
          const { error } = await sb.from("ops_purchase_order_items").insert({ order_id: orderId, item_id: match.id, quantity: ri.quantity, branch_id: branchId, added_by: userId });
          if (!error) {
            added.push(`${match.name_en} ×${ri.quantity} ${match.unit}`);
            await sb.from("ops_audit_log").insert({ entity_type: "purchase_list_item", entity_id: orderId, action: "add_item", performed_by: userId, branch_id: branchId, after_json: { item: match.name_en, quantity: ri.quantity } });
          }
        }
        return JSON.stringify({ success: true, added, not_found: notFound, duplicates });
      }

      case "update_purchase_item": {
        const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`);
        if (!invItems?.length) return `Item "${args.item_name}" not found in inventory`;
        
        let { data: orders } = await sb.from("ops_purchase_orders").select("id").eq("branch_id", branchId).eq("status", "Active").limit(1);
        if (!orders?.length) return "No active purchase list found";
        
        const itemIds = invItems.map(i => i.id);
        const { data: listItem } = await sb.from("ops_purchase_order_items").select("*").eq("order_id", orders[0].id).in("item_id", itemIds).is("completed_at", null).limit(1);
        if (!listItem?.length) return `"${args.item_name}" is not on the current purchase list`;
        
        const updates: any = {};
        if (args.new_quantity) updates.quantity = args.new_quantity;
        
        const { error } = await sb.from("ops_purchase_order_items").update(updates).eq("id", listItem[0].id);
        if (error) return `Error: ${error.message}`;
        
        await sb.from("ops_audit_log").insert({ entity_type: "purchase_list_item", entity_id: listItem[0].id, action: "update_item", performed_by: userId, branch_id: branchId, before_json: { quantity: listItem[0].quantity }, after_json: updates });
        return JSON.stringify({ success: true, item: invItems[0].name_en, ...updates });
      }

      case "delete_purchase_item": {
        const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`);
        if (!invItems?.length) return `Item "${args.item_name}" not found`;
        
        let { data: orders } = await sb.from("ops_purchase_orders").select("id").eq("branch_id", branchId).eq("status", "Active").limit(1);
        if (!orders?.length) return "No active purchase list found";
        
        const itemIds = invItems.map(i => i.id);
        const { data: listItem } = await sb.from("ops_purchase_order_items").select("*").eq("order_id", orders[0].id).in("item_id", itemIds).is("completed_at", null).limit(1);
        if (!listItem?.length) return `"${args.item_name}" is not on the current purchase list`;
        
        const { error } = await sb.from("ops_purchase_order_items").delete().eq("id", listItem[0].id);
        if (error) return `Error: ${error.message}`;
        
        await sb.from("ops_audit_log").insert({ entity_type: "purchase_list_item", entity_id: listItem[0].id, action: "delete_item", performed_by: userId, branch_id: branchId, before_json: { item: invItems[0].name_en, quantity: listItem[0].quantity } });
        return JSON.stringify({ success: true, removed: invItems[0].name_en });
      }

      case "tick_off_purchase_item": {
        const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en, unit, current_stock, mfg_offset_days, expiry_warn_days").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`);
        if (!invItems?.length) return `Item "${args.item_name}" not found`;
        
        let { data: orders } = await sb.from("ops_purchase_orders").select("id").eq("branch_id", branchId).eq("status", "Active").limit(1);
        if (!orders?.length) return "No active purchase list found";
        
        const item = invItems[0];
        const itemIds = invItems.map(i => i.id);
        const { data: listItem } = await sb.from("ops_purchase_order_items").select("*").eq("order_id", orders[0].id).in("item_id", itemIds).is("completed_at", null).limit(1);
        if (!listItem?.length) return `"${args.item_name}" is not on the current purchase list`;
        
        const receivedQty = (args.received_quantity as number) || listItem[0].quantity;
        const now = new Date().toISOString();
        
        // Mark as completed
        await sb.from("ops_purchase_order_items").update({ completed_at: now, completed_by: userId, received_quantity: receivedQty }).eq("id", listItem[0].id);
        
        // Add to inventory stock
        await sb.from("ops_inventory_items").update({ current_stock: item.current_stock + receivedQty, last_received_at: now, updated_at: now }).eq("id", item.id);
        
        // Create FIFO batch
        const today = new Date();
        const mfgDate = new Date(today); mfgDate.setDate(mfgDate.getDate() - (item.mfg_offset_days || 2));
        const expiryDate = new Date(today); expiryDate.setDate(expiryDate.getDate() + (item.expiry_warn_days || 30));
        
        await sb.from("ops_inventory_expiry").insert({
          branch_id: branchId, item_id: item.id, quantity: receivedQty,
          received_date: today.toISOString().split("T")[0],
          mfg_date: mfgDate.toISOString().split("T")[0],
          expiry_date: expiryDate.toISOString().split("T")[0],
          batch_label: `PL-${today.toISOString().split("T")[0]}`,
        });
        
        // Transaction log
        await sb.from("ops_inventory_transactions").insert({
          branch_id: branchId, item_id: item.id, quantity: receivedQty,
          type: "receive", performed_by: userId, notes: "Received from purchase list",
          related_order_id: orders[0].id,
        });
        
        await sb.from("ops_audit_log").insert({ entity_type: "purchase_list_item", entity_id: listItem[0].id, action: "tick_off", performed_by: userId, branch_id: branchId, after_json: { item: item.name_en, received: receivedQty } });
        
        return JSON.stringify({ success: true, item: item.name_en, received: receivedQty, new_stock: item.current_stock + receivedQty });
      }

      case "get_purchase_list": {
        let { data: orders } = await sb.from("ops_purchase_orders").select("id").eq("branch_id", branchId).eq("status", "Active").limit(1);
        if (!orders?.length) return JSON.stringify({ items: [], message: "No active purchase list" });
        
        const { data: items } = await sb.from("ops_purchase_order_items").select("*, ops_inventory_items(name_en, unit)").eq("order_id", orders[0].id).order("completed_at", { ascending: true, nullsFirst: true });
        
        const userIds = [...new Set((items || []).map(i => i.added_by).filter(Boolean))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        const result = (items || [])
          .filter(i => args.include_completed || !i.completed_at)
          .map(i => ({
            id: i.id, item: (i.ops_inventory_items as any)?.name_en, unit: (i.ops_inventory_items as any)?.unit,
            quantity: i.quantity, received_quantity: i.received_quantity,
            is_completed: !!i.completed_at, completed_at: i.completed_at,
            added_by: nameMap[i.added_by] || i.added_by,
          }));
        
        return JSON.stringify({ items: result, total_pending: result.filter(i => !i.is_completed).length });
      }

      // ═══ INVENTORY ISSUE ═══

      case "issue_room_items": {
        const roomId = args.room_id as string;
        // Find the room to get its type
        const { data: room } = await sb.from("ops_rooms").select("id, room_type").eq("branch_id", branchId).eq("id", roomId).single();
        if (!room) return `Room ${roomId} not found`;
        
        // Get refill template for this room type
        const { data: template } = await sb.from("ops_room_refill_templates").select("*, ops_inventory_items(id, name_en, current_stock, unit)").eq("branch_id", branchId).eq("room_type", room.room_type).eq("is_active", true);
        if (!template?.length) return `No refill template found for room type ${room.room_type}`;
        
        const issued: string[] = [];
        const insufficient: string[] = [];
        
        for (const t of template) {
          const item = t.ops_inventory_items as any;
          if (!item) continue;
          
          if (item.current_stock < t.quantity) {
            insufficient.push(`${item.name_en}: need ${t.quantity} but only ${item.current_stock} in stock`);
            continue;
          }
          
          // Deduct stock
          await sb.from("ops_inventory_items").update({ current_stock: item.current_stock - t.quantity, updated_at: new Date().toISOString() }).eq("id", item.id);
          
          // FIFO: deduct from oldest batch
          const { data: batches } = await sb.from("ops_inventory_expiry").select("*").eq("item_id", item.id).eq("branch_id", branchId).eq("is_disposed", false).gt("quantity", 0).order("expiry_date", { ascending: true });
          let remaining = t.quantity;
          for (const batch of (batches || [])) {
            if (remaining <= 0) break;
            const deduct = Math.min(remaining, batch.quantity);
            await sb.from("ops_inventory_expiry").update({ quantity: batch.quantity - deduct }).eq("id", batch.id);
            remaining -= deduct;
          }
          
          // Transaction log
          await sb.from("ops_inventory_transactions").insert({
            branch_id: branchId, item_id: item.id, quantity: -t.quantity,
            type: "issue", performed_by: userId, notes: `Room ${roomId} refresh`,
          });
          
          issued.push(`${item.name_en} ×${t.quantity}`);
        }
        
        return JSON.stringify({ success: true, room: roomId, room_type: room.room_type, issued, insufficient: insufficient.length ? insufficient : undefined });
      }

      case "issue_item": {
        const { data: items } = await sb.from("ops_inventory_items").select("id, name_en, current_stock, unit").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`).eq("is_active", true);
        if (!items?.length) return `Item "${args.item_name}" not found`;
        
        const item = items[0];
        const qty = args.quantity as number;
        if (item.current_stock < qty) return `Insufficient stock for ${item.name_en}: have ${item.current_stock}, need ${qty}`;
        
        await sb.from("ops_inventory_items").update({ current_stock: item.current_stock - qty, updated_at: new Date().toISOString() }).eq("id", item.id);
        
        // FIFO deduction
        const { data: batches } = await sb.from("ops_inventory_expiry").select("*").eq("item_id", item.id).eq("branch_id", branchId).eq("is_disposed", false).gt("quantity", 0).order("expiry_date", { ascending: true });
        let remaining = qty;
        for (const batch of (batches || [])) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, batch.quantity);
          await sb.from("ops_inventory_expiry").update({ quantity: batch.quantity - deduct }).eq("id", batch.id);
          remaining -= deduct;
        }
        
        await sb.from("ops_inventory_transactions").insert({
          branch_id: branchId, item_id: item.id, quantity: -qty,
          type: "issue", performed_by: userId, notes: (args.reason as string) || "Manual issue",
        });
        
        return JSON.stringify({ success: true, item: item.name_en, issued: qty, remaining_stock: item.current_stock - qty });
      }

      case "get_inventory_status": {
        let q = sb.from("ops_inventory_items").select("*").eq("branch_id", branchId).eq("is_active", true).order("name_en");
        if (args.item_name) q = q.ilike("name_en", `%${args.item_name}%`);
        const { data: items, error } = await q;
        if (error) return `Error: ${error.message}`;
        
        const { data: activeOrders } = await sb.from("ops_purchase_orders").select("id, status, ops_purchase_order_items(item_id)").eq("branch_id", branchId).eq("status", "Active");
        const onListItemIds = new Set((activeOrders || []).flatMap(o => ((o.ops_purchase_order_items as any[]) || []).map((i: any) => i.item_id)));
        
        const { data: expiryBatches } = await sb.from("ops_inventory_expiry").select("*").eq("branch_id", branchId).eq("is_disposed", false);
        const expiryMap: Record<string, any[]> = {};
        (expiryBatches || []).forEach(b => { if (!expiryMap[b.item_id]) expiryMap[b.item_id] = []; expiryMap[b.item_id].push(b); });
        
        const results = (items || []).map(item => {
          const onList = onListItemIds.has(item.id);
          const isDueForOrder = item.current_stock <= item.reorder_point && !onList;
          const status = onList ? "On Purchase List" : isDueForOrder ? "Due for Order" : "OK";
          const expiring = expiryMap[item.id]?.filter(b => {
            const daysLeft = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / 86400000);
            return daysLeft <= (item.expiry_warn_days || 7);
          }) || [];
          return { id: item.id, name: item.name_en, category: item.category, unit: item.unit, current_stock: item.current_stock, par_level: item.par_level, reorder_point: item.reorder_point, status, expiry_warning: expiring.length > 0, expiring_batches: expiring.map(b => ({ expiry_date: b.expiry_date, qty: b.quantity })) };
        });
        
        if (args.status_filter === "due_for_order") return JSON.stringify(results.filter(r => r.status === "Due for Order"), null, 2);
        if (args.status_filter === "expiring_soon") return JSON.stringify(results.filter(r => r.expiry_warning), null, 2);
        return JSON.stringify(results, null, 2);
      }
      
      case "get_inventory_transactions": {
        const { data: items } = await sb.from("ops_inventory_items").select("id, name_en").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`);
        if (!items?.length) return `No item found matching "${args.item_name}"`;
        const itemIds = items.map(i => i.id);
        let q = sb.from("ops_inventory_transactions").select("*").eq("branch_id", branchId).in("item_id", itemIds).order("created_at", { ascending: false });
        if (args.date_from) q = q.gte("created_at", args.date_from as string);
        if (args.date_to) q = q.lte("created_at", args.date_to as string);
        const { data: txns, error } = await q.limit((args.limit as number) || 20);
        if (error) return `Error: ${error.message}`;
        const userIds = [...new Set((txns || []).map(t => t.performed_by))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        const itemNameMap = Object.fromEntries(items.map(i => [i.id, i.name_en]));
        return JSON.stringify({ items_matched: items.map(i => i.name_en), transactions: (txns || []).map(t => ({ type: t.type, quantity: t.quantity, by: nameMap[t.performed_by] || t.performed_by, date: t.created_at, notes: t.notes })) }, null, 2);
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

      // ═══ GUEST LOG ═══

      case "get_guest_log": {
        let q = sb.from("ops_guest_log").select("*").eq("branch_id", branchId).order("check_in_at", { ascending: false });
        if (args.guest_name) q = q.ilike("guest_name", `%${args.guest_name}%`);
        if (args.room_id) q = q.eq("room_id", args.room_id as string);
        if (args.nationality) q = q.ilike("nationality", `%${args.nationality}%`);
        if (args.status === "checked_in") q = q.eq("status", "checked_in");
        if (args.status === "checked_out") q = q.eq("status", "checked_out");
        
        if (args.date) {
          const dayStart = `${args.date}T00:00:00`;
          const dayEnd = `${args.date}T23:59:59`;
          const { data: allGuests } = await sb.from("ops_guest_log").select("*").eq("branch_id", branchId).or(`check_in_at.gte.${dayStart},check_in_at.lte.${dayEnd},and(check_in_at.lte.${dayEnd},or(check_out_at.is.null,check_out_at.gte.${dayStart}))`).order("check_in_at", { ascending: false }).limit(200);
          const guests = allGuests || [];
          const checkedInOnDay = guests.filter(g => g.check_in_at >= dayStart && g.check_in_at <= dayEnd);
          const checkedOutOnDay = guests.filter(g => g.check_out_at && g.check_out_at >= dayStart && g.check_out_at <= dayEnd);
          const continuing = guests.filter(g => g.check_in_at < dayStart && (!g.check_out_at || g.check_out_at > dayEnd));
          const fmt = (g: any) => ({ id: g.id, name: g.guest_name, room: g.room_id, adults: g.adults, children: g.children, source: g.source, check_in: g.check_in_at, expected_check_in: g.expected_check_in, check_out: g.check_out_at, expected_checkout: g.expected_check_out, nationality: g.nationality });
          return JSON.stringify({ date: args.date, checked_in_on_day: checkedInOnDay.map(fmt), checked_out_on_day: checkedOutOnDay.map(fmt), continuing_guests: continuing.map(fmt), total_in_house: checkedInOnDay.length + continuing.length - checkedOutOnDay.filter(g => checkedInOnDay.some(ci => ci.id === g.id)).length }, null, 2);
        }
        
        if (args.date_from) q = q.gte("check_in_at", args.date_from as string);
        if (args.date_to) q = q.lte("check_in_at", args.date_to as string);
        const { data: guests, error } = await q.limit(100);
        if (error) return `Error: ${error.message}`;
        let filteredGuests = guests || [];
        if (args.min_nights) filteredGuests = filteredGuests.filter(g => (g.number_of_nights || 0) >= (args.min_nights as number));
        if (args.export_contacts) {
          if (!isAdmin) return "Error: Contact export requires admin privileges.";
          return JSON.stringify({ export: filteredGuests.map(g => ({ name: g.guest_name, email: g.email, phone: g.phone, room: g.room_id })), total: filteredGuests.length }, null, 2);
        }
        return JSON.stringify(filteredGuests.slice(0, 50).map(g => ({
          id: g.id, name: g.guest_name, room: g.room_id, adults: g.adults, children: g.children,
          source: g.source, status: g.status, check_in: g.check_in_at, expected_check_in: g.expected_check_in,
          check_out: g.check_out_at, expected_checkout: g.expected_check_out,
          nationality: g.nationality, nights: g.number_of_nights, purpose: g.purpose,
        })), null, 2);
      }

      case "check_in_guest": {
        const { data: guest, error } = await sb.from("ops_guest_log").insert({
          branch_id: branchId, checked_in_by: userId,
          guest_name: args.guest_name as string, room_id: (args.room_id as string) || null,
          adults: (args.adults as number) || 1, children: (args.children as number) || 0,
          phone: (args.phone as string) || null, email: (args.email as string) || null,
          source: (args.source as string) || "Walk-in",
          number_of_nights: (args.number_of_nights as number) || null,
          expected_check_out: (args.expected_check_out as string) || null,
          expected_check_in: (args.expected_check_in as string) || null,
          nationality: (args.nationality as string) || null,
          purpose: (args.purpose as string) || "Leisure",
          notes: (args.notes as string) || null,
          status: "checked_in", submission_source: "staff",
        }).select("id").single();
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, guest_id: guest.id, name: args.guest_name, room: args.room_id });
      }

      case "check_out_guest": {
        let q = sb.from("ops_guest_log").select("id, guest_name, room_id").eq("branch_id", branchId).eq("status", "checked_in");
        if (args.guest_name) q = q.ilike("guest_name", `%${args.guest_name}%`);
        if (args.room_id) q = q.eq("room_id", args.room_id as string);
        const { data: guests } = await q.limit(5);
        if (!guests?.length) return `No checked-in guest found matching the criteria`;
        if (guests.length > 1) return `Multiple guests found: ${guests.map(g => `${g.guest_name} (Room ${g.room_id})`).join(", ")}. Please be more specific.`;
        
        const guest = guests[0];
        const { error } = await sb.from("ops_guest_log").update({ status: "checked_out", check_out_at: new Date().toISOString(), check_out_by: userId, updated_at: new Date().toISOString() }).eq("id", guest.id);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, guest: guest.guest_name, room: guest.room_id, checked_out_at: new Date().toISOString() });
      }

      case "recommend_room": {
        // Get all rooms
        const { data: rooms } = await sb.from("ops_rooms").select("*").eq("branch_id", branchId).eq("is_active", true);
        // Get currently checked-in guests
        const { data: guests } = await sb.from("ops_guest_log").select("*").eq("branch_id", branchId).eq("status", "checked_in");
        
        const occupiedRooms = new Map((guests || []).map(g => [g.room_id, g]));
        const nights = (args.number_of_nights as number) || 1;
        const adults = (args.adults as number) || 1;
        
        // Parse check-in date
        let checkInDate: Date;
        const dateStr = args.check_in_date as string;
        if (dateStr === "tomorrow") { checkInDate = new Date(); checkInDate.setDate(checkInDate.getDate() + 1); }
        else if (dateStr === "today") { checkInDate = new Date(); }
        else { checkInDate = new Date(dateStr); }
        
        // Standard check-in 2 PM IST, check-out 11 AM IST
        const checkInDateTime = new Date(checkInDate);
        if (args.check_in_time) {
          const timeStr = (args.check_in_time as string).toLowerCase();
          let hours = parseInt(timeStr);
          if (timeStr.includes("pm") && hours < 12) hours += 12;
          if (timeStr.includes("am") && hours === 12) hours = 0;
          checkInDateTime.setHours(hours - 5, -30, 0, 0); // IST to UTC approx
        } else {
          checkInDateTime.setHours(8, 30, 0, 0); // 2 PM IST = 8:30 UTC
        }
        
        const checkOutDate = new Date(checkInDateTime);
        checkOutDate.setDate(checkOutDate.getDate() + nights);
        checkOutDate.setHours(5, 30, 0, 0); // 11 AM IST = 5:30 UTC
        
        const recommendations: any[] = [];
        
        for (const room of (rooms || [])) {
          const occupant = occupiedRooms.get(room.id);
          
          if (!occupant) {
            // Room is free
            recommendations.push({
              room_id: room.id, room_type: room.room_type, status: "Available",
              reason: "Room is currently vacant", score: 100,
            });
          } else {
            // Check if current guest will check out before new guest arrives
            const expectedOut = occupant.expected_check_out ? new Date(occupant.expected_check_out) : null;
            if (expectedOut && expectedOut <= checkInDateTime) {
              const hoursGap = (checkInDateTime.getTime() - expectedOut.getTime()) / 3600000;
              recommendations.push({
                room_id: room.id, room_type: room.room_type, status: "Will be free",
                current_guest: occupant.guest_name,
                expected_checkout: occupant.expected_check_out,
                gap_hours: Math.round(hoursGap),
                reason: `Current guest ${occupant.guest_name} expected to check out ${Math.round(hoursGap)}h before new check-in`,
                score: hoursGap >= 3 ? 80 : 50, // More gap = better for cleaning
              });
            } else {
              recommendations.push({
                room_id: room.id, room_type: room.room_type, status: "Occupied",
                current_guest: occupant.guest_name,
                expected_checkout: occupant.expected_check_out || "Unknown",
                reason: "Guest still occupying",
                score: 0,
              });
            }
          }
        }
        
        // Sort by score (best first), prefer King Room for 3+ adults
        recommendations.sort((a, b) => {
          if (adults >= 3 && a.room_type === "King" && b.room_type !== "King") return -1;
          if (adults >= 3 && b.room_type === "King" && a.room_type !== "King") return 1;
          return b.score - a.score;
        });
        
        return JSON.stringify({
          request: { check_in: checkInDateTime.toISOString(), nights, adults, children: args.children || 0 },
          recommendations: recommendations.slice(0, 5),
          best_pick: recommendations[0] || null,
        }, null, 2);
      }

      // ═══ SHIFTS ═══

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
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        return JSON.stringify(filteredPunches.map(p => ({
          id: p.id, user: nameMap[p.user_id] || p.user_id, status: p.status,
          clock_in: p.clock_in_at, clock_out: p.clock_out_at,
          total_break_minutes: p.total_break_minutes, flag_type: p.flag_type, flag_reason: p.flag_reason,
          breaks: ((p.ops_shift_breaks as any[]) || []).map((b: any) => ({ type: b.break_type, start: b.break_start, end: b.break_end })),
        })), null, 2);
      }

      case "end_shift": {
        let targetUserId = userId;
        if (args.user_display_name && (args.user_display_name as string).toLowerCase() !== "me") {
          const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).ilike("display_name", `%${args.user_display_name}%`);
          if (!profiles?.length) return `No user found matching "${args.user_display_name}"`;
          targetUserId = profiles[0].user_id;
        }
        
        const { data: activeShift } = await sb.from("ops_shift_punches").select("*").eq("branch_id", branchId).eq("user_id", targetUserId).eq("status", "clocked_in").order("clock_in_at", { ascending: false }).limit(1);
        if (!activeShift?.length) return "No active shift found to end.";
        
        const now = new Date().toISOString();
        const { error } = await sb.from("ops_shift_punches").update({ clock_out_at: now, status: "clocked_out", notes: (args.notes as string) || null, updated_at: now }).eq("id", activeShift[0].id);
        if (error) return `Error: ${error.message}`;
        
        const clockIn = new Date(activeShift[0].clock_in_at);
        const hoursWorked = ((Date.now() - clockIn.getTime()) / 3600000 - (activeShift[0].total_break_minutes / 60)).toFixed(1);
        
        return JSON.stringify({ success: true, shift_id: activeShift[0].id, clock_out: now, hours_worked: hoursWorked, break_minutes: activeShift[0].total_break_minutes });
      }

      // ═══ DAILY REPORTS ═══

      case "get_daily_report_data": {
        const date = (args.date as string) || new Date().toISOString().split("T")[0];
        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;
        
        const [tasksR, guestsR, shiftsR, lowStockR, expiringR] = await Promise.all([
          sb.from("ops_tasks").select("*").eq("branch_id", branchId).or(`created_at.gte.${dayStart},updated_at.gte.${dayStart}`).limit(200),
          sb.from("ops_guest_log").select("*").eq("branch_id", branchId).or(`check_in_at.gte.${dayStart},and(check_in_at.lte.${dayEnd},or(check_out_at.is.null,check_out_at.gte.${dayStart}))`).limit(200),
          sb.from("ops_shift_punches").select("*").eq("branch_id", branchId).gte("clock_in_at", dayStart).lte("clock_in_at", dayEnd),
          sb.from("ops_inventory_items").select("*").eq("branch_id", branchId).eq("is_active", true),
          sb.from("ops_inventory_expiry").select("*, ops_inventory_items(name_en)").eq("branch_id", branchId).eq("is_disposed", false).lte("expiry_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]),
        ]);
        
        const tasks = tasksR.data || [];
        const guests = guestsR.data || [];
        const shifts = shiftsR.data || [];
        const dueForOrder = (lowStockR.data || []).filter(i => i.current_stock <= i.reorder_point);
        const inHouse = guests.filter(g => g.status === "checked_in");
        
        const userIds = [...new Set([...tasks.flatMap(t => [...t.assigned_to, t.created_by]), ...shifts.map(s => s.user_id)])];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        
        return JSON.stringify({
          date,
          tasks: {
            total: tasks.length,
            completed_today: tasks.filter(t => t.status === "Done" && t.updated_at >= dayStart).length,
            overdue: tasks.filter(t => t.due_datetime && new Date(t.due_datetime) < new Date(dayEnd) && !["Done", "Cancelled"].includes(t.status)).length,
            blocked: tasks.filter(t => t.status === "Blocked").length,
            incomplete: tasks.filter(t => !["Done", "Cancelled"].includes(t.status)).map(t => ({ title: t.title_en || t.title_original, status: t.status, assigned_to: t.assigned_to.map((id: string) => nameMap[id] || id) })),
          },
          occupancy: {
            in_house: inHouse.length, total_adults: inHouse.reduce((s, g) => s + g.adults, 0), total_children: inHouse.reduce((s, g) => s + g.children, 0),
            check_ins_today: guests.filter(g => g.check_in_at >= dayStart && g.check_in_at <= dayEnd).length,
            check_outs_today: guests.filter(g => g.check_out_at && g.check_out_at >= dayStart && g.check_out_at <= dayEnd).length,
          },
          inventory: {
            due_for_order: dueForOrder.map(i => ({ name: i.name_en, stock: i.current_stock, reorder: i.reorder_point })),
            expiring_soon: (expiringR.data || []).map(e => ({ item: (e.ops_inventory_items as any)?.name_en, expiry: e.expiry_date, qty: e.quantity })),
          },
          shifts: shifts.map(s => ({ user: nameMap[s.user_id] || s.user_id, status: s.status, clock_in: s.clock_in_at, clock_out: s.clock_out_at, break_minutes: s.total_break_minutes })),
        }, null, 2);
      }

      case "submit_daily_report": {
        const reportDate = args.report_date as string;
        
        const { data: report, error } = await sb.from("ops_daily_reports").insert({
          branch_id: branchId, submitted_by: userId, report_date: reportDate,
          revenue_total: (args.revenue_total as number) || 0,
          revenue_cash: (args.revenue_cash as number) || 0,
          revenue_online: (args.revenue_online as number) || 0,
          occupancy_notes: (args.occupancy_notes as string) || null,
          kitchen_notes: (args.kitchen_notes as string) || null,
          maintenance_notes: (args.maintenance_notes as string) || null,
          general_notes: (args.general_notes as string) || null,
          highlights: (args.highlights as string) || null,
          issues: (args.issues as string) || null,
          status: "submitted",
        }).select("id").single();
        if (error) return `Error submitting report: ${error.message}`;
        
        // Auto-end shift
        const { data: activeShift } = await sb.from("ops_shift_punches").select("id").eq("branch_id", branchId).eq("user_id", userId).eq("status", "clocked_in").limit(1);
        if (activeShift?.length) {
          const now = new Date().toISOString();
          await sb.from("ops_shift_punches").update({ clock_out_at: now, status: "clocked_out", notes: "Auto-ended on daily report submission", updated_at: now }).eq("id", activeShift[0].id);
        }
        
        return JSON.stringify({ success: true, report_id: report.id, shift_ended: !!activeShift?.length });
      }

      // ═══ LAUNDRY ═══

      case "send_laundry": {
        const setsCount = args.sets_count as number;
        const now = new Date();
        const hour = now.getUTCHours() + 5.5; // Approx IST
        const beforeNoon = hour < 12;
        
        // Turnaround: if sent before noon, returns day-after-tomorrow at noon
        // If sent after noon, returns 3 days later at noon
        const returnDate = new Date(now);
        returnDate.setDate(returnDate.getDate() + (beforeNoon ? 2 : 3));
        returnDate.setUTCHours(6, 30, 0, 0); // 12 noon IST = 6:30 UTC
        
        const { data: batch, error } = await sb.from("ops_laundry_batches").insert({
          branch_id: branchId, sets_count: setsCount,
          sent_at: now.toISOString(), sent_before_noon: beforeNoon,
          expected_return_at: returnDate.toISOString(),
          sent_by: userId, status: "in_transit",
          notes: (args.notes as string) || null,
        }).select("id").single();
        if (error) return `Error: ${error.message}`;
        
        return JSON.stringify({ success: true, batch_id: batch.id, sets: setsCount, sent_before_noon: beforeNoon, expected_return: returnDate.toISOString() });
      }

      case "receive_laundry": {
        const batchId = args.batch_id as string;
        const now = new Date().toISOString();
        
        const { data: batch } = await sb.from("ops_laundry_batches").select("*").eq("id", batchId).single();
        if (!batch) return `Batch ${batchId} not found`;
        
        const { error } = await sb.from("ops_laundry_batches").update({
          actual_return_at: now, status: "returned", received_by: userId,
          notes: batch.notes ? `${batch.notes}\n${(args.notes as string) || ""}` : (args.notes as string) || null,
        }).eq("id", batchId);
        if (error) return `Error: ${error.message}`;
        
        return JSON.stringify({ success: true, batch_id: batchId, sets_returned: (args.actual_sets as number) || batch.sets_count });
      }

      case "laundry_forecast": {
        const daysAhead = (args.days_ahead as number) || 5;
        const TOTAL_SETS = 8;
        const ROOMS = 5;
        
        // Get laundry batches in transit
        const { data: inTransit } = await sb.from("ops_laundry_batches").select("*").eq("branch_id", branchId).eq("status", "in_transit").order("expected_return_at");
        
        // Get upcoming guest check-ins/check-outs
        const now = new Date();
        const futureDate = new Date(now); futureDate.setDate(futureDate.getDate() + daysAhead);
        const { data: guests } = await sb.from("ops_guest_log").select("*").eq("branch_id", branchId).or(`status.eq.checked_in,and(expected_check_in.gte.${now.toISOString()},expected_check_in.lte.${futureDate.toISOString()})`);
        
        // Count sets currently in laundry
        const setsInLaundry = (inTransit || []).reduce((s, b) => s + b.sets_count, 0);
        const setsAvailable = TOTAL_SETS - setsInLaundry;
        
        // Build day-by-day forecast
        const forecast: any[] = [];
        for (let d = 0; d <= daysAhead; d++) {
          const day = new Date(now); day.setDate(day.getDate() + d);
          const dayStr = day.toISOString().split("T")[0];
          
          // Sets returning this day
          const returning = (inTransit || []).filter(b => {
            const ret = new Date(b.expected_return_at);
            return ret.toISOString().split("T")[0] === dayStr;
          }).reduce((s, b) => s + b.sets_count, 0);
          
          // Check-ins needing fresh linen
          const checkIns = (guests || []).filter(g => {
            const ci = g.expected_check_in || g.check_in_at;
            return ci && new Date(ci).toISOString().split("T")[0] === dayStr && g.status !== "checked_out";
          }).length;
          
          // Check-outs generating dirty linen
          const checkOuts = (guests || []).filter(g => {
            return g.expected_check_out && new Date(g.expected_check_out).toISOString().split("T")[0] === dayStr;
          }).length;
          
          forecast.push({ date: dayStr, check_ins: checkIns, check_outs: checkOuts, sets_returning: returning });
        }
        
        // Calculate running availability
        let running = setsAvailable;
        const alerts: string[] = [];
        for (const day of forecast) {
          running += day.sets_returning;
          running -= day.check_ins; // Each check-in needs a fresh set
          day.available_sets = running;
          if (running < 0) {
            alerts.push(`⚠️ ${day.date}: Short by ${Math.abs(running)} set(s)! ${day.check_ins} check-ins but only ${running + day.check_ins} sets available.`);
          }
        }
        
        return JSON.stringify({
          total_sets: TOTAL_SETS, currently_available: setsAvailable, in_laundry: setsInLaundry,
          in_transit_batches: (inTransit || []).map(b => ({ id: b.id, sets: b.sets_count, expected_return: b.expected_return_at })),
          forecast, alerts: alerts.length ? alerts : ["✅ Laundry availability looks good for the forecast period."],
        }, null, 2);
      }

      // ═══ UTILITY ═══

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
        return JSON.stringify((data || []).map(l => ({ entity_type: l.entity_type, entity_id: l.entity_id, action: l.action, by: nameMap[l.performed_by] || l.performed_by, at: l.performed_at, before: l.before_json, after: l.after_json })), null, 2);
      }
      
      case "get_room_issue_history": {
        let q = sb.from("ops_inventory_transactions").select("*, ops_inventory_items(name_en)").eq("branch_id", branchId).ilike("notes", `%${args.room_id}%`).order("created_at", { ascending: false });
        if (args.date_from) q = q.gte("created_at", args.date_from as string);
        if (args.date_to) q = q.lte("created_at", args.date_to as string);
        const { data, error } = await q.limit(50);
        if (error) return `Error: ${error.message}`;
        let filtered = data || [];
        if (args.item_name) filtered = filtered.filter(t => ((t.ops_inventory_items as any)?.name_en || "").toLowerCase().includes((args.item_name as string).toLowerCase()));
        const userIds = [...new Set(filtered.map(t => t.performed_by))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
        return JSON.stringify(filtered.map(t => ({ item: (t.ops_inventory_items as any)?.name_en, type: t.type, quantity: t.quantity, date: t.created_at, by: nameMap[t.performed_by] || t.performed_by, notes: t.notes })), null, 2);
      }
      
      case "get_bills_and_receipts": {
        let q = sb.from("ops_task_attachments").select("*, ops_tasks(title_en, title_original)").eq("branch_id", branchId).in("type", ["Receipt", "Bill"]).order("uploaded_at", { ascending: false });
        if (args.vendor) q = q.ilike("vendor", `%${args.vendor}%`);
        if (args.date_from) q = q.gte("uploaded_at", args.date_from as string);
        if (args.date_to) q = q.lte("uploaded_at", args.date_to as string);
        const { data, error } = await q.limit((args.limit as number) || 20);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify((data || []).map(a => ({ task: (a.ops_tasks as any)?.title_en, vendor: a.vendor, amount: a.amount, bill_date: a.bill_date, file_url: a.file_url })), null, 2);
      }
      
      case "get_user_profiles": {
        let q = sb.from("ops_user_profiles").select("*").eq("branch_id", branchId).eq("is_active", true);
        if (args.name) q = q.ilike("display_name", `%${args.name}%`);
        const { data, error } = await q;
        if (error) return `Error: ${error.message}`;
        return JSON.stringify((data || []).map(p => ({ user_id: p.user_id, name: p.display_name, role: p.role, language: p.preferred_language })), null, 2);
      }

      case "create_reminder": {
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).eq("is_active", true);
        const searchName = (args.user_display_name as string || "").toLowerCase();
        let matched: any = searchName === "me" && userId ? (profiles || []).find(p => p.user_id === userId) : (profiles || []).find(p => p.display_name.toLowerCase().includes(searchName));
        if (!matched) return `No user found matching "${args.user_display_name}"`;
        const { data: rem, error } = await sb.from("ops_reminders").insert({
          branch_id: branchId, user_id: matched.user_id, created_by: matched.user_id,
          title: args.title as string, description: (args.description as string) || null,
          reminder_type: (args.reminder_type as string) || "one_time",
          recurrence_rule: args.recurrence_rule || {}, next_fire_at: args.fire_at as string, status: "active",
        }).select().single();
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, reminder: { id: rem.id, title: rem.title, for: matched.display_name, type: rem.reminder_type, next_fire: rem.next_fire_at } });
      }

      case "get_reminders": {
        let q = sb.from("ops_reminders").select("*").eq("branch_id", branchId).order("next_fire_at");
        if (args.status) q = q.eq("status", args.status as string);
        else if (!args.include_completed) q = q.in("status", ["active", "snoozed"]);
        const { data, error } = await q.limit(50);
        if (error) return `Error: ${error.message}`;
        const userIds = [...new Set((data || []).map(r => r.user_id))];
        const { data: profs } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profs || []).map(p => [p.user_id, p.display_name]));
        let results = (data || []).map(r => ({ id: r.id, title: r.title, for_user: nameMap[r.user_id] || r.user_id, type: r.reminder_type, status: r.status, next_fire: r.next_fire_at, fire_count: r.fire_count }));
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
        else if (action === "complete") updates.follow_up_status = "done";
        else if (action === "snooze") { updates.next_fire_at = new Date(Date.now() + 3600000).toISOString(); updates.status = "active"; }
        else if (action === "reschedule") { if (!args.new_fire_at) return "new_fire_at required"; updates.next_fire_at = args.new_fire_at; updates.status = "active"; updates.follow_up_status = "rescheduled"; }
        if (args.follow_up_response) updates.follow_up_response = args.follow_up_response;
        const { error } = await sb.from("ops_reminders").update(updates).eq("id", remId);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, action, reminder_id: remId });
      }

      case "search_knowledge": {
        const query = (args.query as string || "").toLowerCase();
        const { data, error } = await sb.from("ops_vector_knowledge").select("*").eq("branch_id", branchId).eq("is_active", true);
        if (error) return `Error: ${error.message}`;
        const results = (data || []).filter(e => e.topic.toLowerCase().includes(query) || e.content.toLowerCase().includes(query));
        if (!results.length) return JSON.stringify({ found: false, message: "No knowledge base entries found." });
        return JSON.stringify({ found: true, entries: results.map(e => ({ id: e.id, topic: e.topic, content: e.content })) });
      }

      case "upsert_knowledge": {
        if (!isAdmin) return "Only admins can update the knowledge base.";
        const topic = args.topic as string;
        const content = args.content as string;
        const existingId = args.existing_id as string | undefined;
        if (existingId) {
          const { error } = await sb.from("ops_vector_knowledge").update({ content, topic, updated_by: userId, updated_at: new Date().toISOString() }).eq("id", existingId).eq("branch_id", branchId);
          if (error) return `Error: ${error.message}`;
          return JSON.stringify({ success: true, action: "updated", topic });
        }
        const { data: existing } = await sb.from("ops_vector_knowledge").select("id").eq("branch_id", branchId).ilike("topic", topic).eq("is_active", true).limit(1);
        if (existing?.length) {
          await sb.from("ops_vector_knowledge").update({ content, updated_by: userId, updated_at: new Date().toISOString() }).eq("id", existing[0].id);
          return JSON.stringify({ success: true, action: "updated_existing", topic });
        }
        const { data: newEntry, error } = await sb.from("ops_vector_knowledge").insert({ branch_id: branchId, topic, content, created_by: userId! }).select("id").single();
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, action: "created", topic });
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

const VECTOR_INTERNAL_PROMPT = `You are Vector, the Operational GM AI for Wavealokam — a surf retreat in Varkala, Kerala.

═══ WHO YOU ARE ═══
You're the sharp, composed GM who runs the entire operation. You don't just assist — you execute. You have FULL authority and FULL access to every system: tasks, inventory, purchase list, guest log, rooms, shifts, daily reports, laundry, and audit trails. You use service_role access. You ARE the system.

You talk like a person — a smart friend at chai break, not a LinkedIn post. Short sentences. No frameworks. No "Great question!" No walls of text. You match energy: stressed person gets grounded, fired-up person gets productive direction.

Your voice:
- Direct, confident, warm but not soft
- Humor: dry, well-timed, never at anyone's expense
- Never hedge: "I think maybe we could potentially..." — never
- You say what you mean. You act before you explain

═══ EXECUTION PHILOSOPHY ═══
YOU ACT FIRST, EXPLAIN AFTER. When a user tells you to do something:
1. Parse what they want
2. Fill in reasonable defaults for anything missing
3. Execute using your tools
4. Confirm what you did

You DO NOT ask clarifying questions unless the request is genuinely ambiguous. Examples:
- "Add deadline to the kitchen task — tomorrow 2pm" → search for the kitchen task, update its due_datetime. Done.
- "Delete that old task" → if context is clear from conversation, delete it. If multiple matches, ask WHICH one.
- "Room 102 refreshed" → issue all template items for room 102. Done.
- "We need more coffee" → add coffee to purchase list with reasonable quantity. Done.
- "Check out the guest in 103" → find the checked-in guest in room 103, check them out. Done.
- "How many people checked in today?" → query guest log for today, give the count with details.

═══ WHAT YOU CAN DO (your full toolkit) ═══
TASKS: Create, update (title/status/deadline/assignees/notes), delete, search, get summaries
PURCHASE LIST: Add items, update quantities, delete items, tick off (auto-adds to inventory), get list
INVENTORY: Issue items for room refresh (knows templates), issue individual items, check stock, view transactions, check expiry
GUESTS: Query log, check in new guests, check out guests, recommend rooms based on occupancy patterns
SHIFTS: View punches, end shifts
DAILY REPORTS: Compile report data, submit reports (auto-ends shift)
LAUNDRY: Send batches, receive batches, forecast availability vs check-ins
REMINDERS: Create, update, reschedule, cancel
KNOWLEDGE BASE: Search and update (admin only)
AUDIT: View all system changes

═══ WAVEALOKAM CONTEXT ═══
Surf retreat in Varkala, Kerala. "Lokam" = "world" in Malayalam — "World of Waves."
- Owners: Sudev Nair & Amardeep Nair
- Key staff: Anandhu (Guest Manager), Jeevan (Ops Manager), Lekha Chechi (Chef)
- Rooms: 101-104 (Double with Balcony), 202 (King with Balcony). 5 rooms total.
- Check-in: 2 PM IST, Check-out: 11 AM IST
- 8 total linen sets. Laundry turnaround: 2 days (if sent before noon → back day-after-tomorrow noon)
- Resident dogs: Nero & Ishtu

═══ SMART DECISIONS ═══
When users ask complex operational questions, USE your tools to gather data and reason:
- "Which room for a late 6 PM check-in tomorrow, 3 nights?" → use recommend_room, factor in expected check-outs
- "Are we going to have enough clean linen this week?" → use laundry_forecast
- "What's Anandhu's task load like?" → use get_tasks_summary filtered by Anandhu
- "How much coffee have we used since last order?" → use get_inventory_transactions

═══ DAILY REPORT FLOW ═══
When a user triggers "Daily Report", start a CONVERSATIONAL flow:
1. First, use get_daily_report_data to see the full picture
2. Ask about incomplete tasks: "I see X tasks still open. Did you finish any of these?" — list them
3. Ask about revenue: "What's today's revenue? Cash and online separately?"
4. Probe for observations: kitchen issues, maintenance, guest behavior, anything unusual
5. Don't go point-by-point. Flow naturally. Extract what you need.
6. When you have enough, use submit_daily_report. This auto-ends the shift.
7. Confirm: "Report submitted. Shift ended. Here's your summary: [brief]"

═══ ACCOUNTABILITY ═══
Valid delay reasons: vendor delay, delivery delay, need parts, guest emergency, safety risk.
Invalid: "forgot" → fix the system. "busy" → what specifically? Pattern of excuses → name it warmly.

═══ TASK vs REMINDER ═══
- TASK = work assignment: "clean kitchen", "add task for anandhu"
- REMINDER = personal notification: "remind me at 5pm", "set alarm"
- When in doubt → create_task

═══ PURCHASE LIST ═══
One shared global list. Items added → purchased → ticked off (auto-adds to inventory with FIFO batch).
When user says "buy", "need", "purchase", "add to list" → add_to_purchase_list.
When user says "got it", "received", "tick off" → tick_off_purchase_item.

═══ ROOM REFRESH / ISSUE ═══
When user says "room X refreshed" or "cleaned room X" → issue_room_items. You know the template.
When user says "used 2 tissue rolls" → issue_item.

═══ LAUNDRY ═══
Track linen: 8 total sets, 5 rooms. Turnaround = 2 days (before noon cutoff).
Run laundry_forecast daily to proactively flag shortages.
"Sent 3 sets to laundry" → send_laundry.
"Laundry came back" → receive_laundry (need batch_id, get from forecast data).

═══ BULK OPERATIONS ═══
When asked to do something across "all" tasks/items (e.g., "delete all pending tasks"):
1. Use get_tasks_summary (with status filter if applicable) to get the list and IDs
2. Confirm with the user: "Found X tasks with status Y. Shall I delete all of them?" — list titles briefly
3. On confirmation, use bulk_delete_tasks with all the IDs
NEVER say you can't do bulk operations. You CAN. Chain your tools: query first, then act.

═══ ANSWERING RULES ═══
- ALWAYS use tools. Never guess data. Never fabricate stock levels, guest counts, or task statuses.
- Provide evidence: IDs, timestamps, who did what.
- Use display names, never raw UUIDs.
- Respond in the user's language. Malayalam input → Malayalam response.

═══ ESCALATION ═══
Report to admins: late tasks, ignored reminders, inventory anomalies, suspicious patterns.
Frame systemic issues as process improvements, not blame.`;

const VECTOR_GUEST_PROMPT = `You are Vector, writing guest replies for Wavealokam staff to copy-paste and send directly.

Your output IS the message the guest will receive. Write it exactly as it should be sent — no preamble, no "here's a draft", no meta-commentary. Just the reply itself, ready to copy-paste.

═══ TONE ═══
Warm, polite, clear, confident. No emojis. Concise. Professional hospitality.

═══ WAVEALOKAM CONTEXT ═══
Surf retreat in Varkala, Kerala. "World of Waves."
- Rooms: Double (28m², ~₹3,500), King (45m², ~₹4,500). Prices vary by season.
- Extra bed: ₹1,500/night (King Room recommended). Pet-friendly: ₹500/night.
- Surf lessons: ₹1,500 for 1.5 hours.
- WhatsApp: +91 8606164606. Check-in: 2 PM, Check-out: 11 AM.
- Breakfast included. Private beach. Resident dogs: Nero & Ishtu.
- Airport: TRV, ~1.5h. Pre-arranged taxi recommended. Uber/Ola unreliable.
- Toddy NOT served — available at partner Mangrove Adventure Village.

═══ FORMAT ═══
Output ONLY the reply. Full URLs (not markdown). Include https://wavealokam.com/#itinerary when relevant.`;


// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, branch_id, user_id, is_admin, ui_language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isDirectMode = mode === "direct";
    
    let systemPrompt = isDirectMode ? null : (mode === "guest" ? VECTOR_GUEST_PROMPT : VECTOR_INTERNAL_PROMPT);

    // Inject user context and knowledge base for non-direct modes
    if (!isDirectMode && mode !== "guest") {
      const sb = getSupabase();
      
      const [profileResult, knowledgeResult] = await Promise.all([
        sb.from("ops_user_profiles").select("display_name, role").eq("user_id", user_id).single(),
        sb.from("ops_vector_knowledge").select("topic, content, updated_at").eq("branch_id", branch_id).eq("is_active", true).order("updated_at", { ascending: false }),
      ]);
      
      // Inject current time awareness
      const nowIST = new Date(Date.now() + 5.5 * 3600000);
      const timeStr = nowIST.toISOString().replace('T', ' ').slice(0, 19);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][nowIST.getUTCDay()];
      systemPrompt += `\n\n═══ CURRENT TIME ═══\nRight now: ${timeStr} IST (${dayOfWeek}). Use this for ALL time calculations. When user says "two hours ago" = ${new Date(nowIST.getTime() - 2 * 3600000).toISOString().replace('T', ' ').slice(0, 16)} IST. "In 45 minutes" = ${new Date(nowIST.getTime() + 45 * 60000).toISOString().replace('T', ' ').slice(0, 16)} IST. Always resolve relative times to absolute timestamps before making decisions.`;
      
      if (profileResult.data) {
        systemPrompt += `\n\n═══ CURRENT USER ═══\nChatting with: ${profileResult.data.display_name} (role: ${profileResult.data.role}, user_id: ${user_id}). "remind me" / "my tasks" = this person.`;
      }
      
      const kbEntries = knowledgeResult.data || [];
      if (kbEntries.length > 0) {
        const kbText = kbEntries.map(e => `• ${e.topic}: ${e.content}`).join("\n");
        systemPrompt += `\n\n═══ KNOWLEDGE BASE (OVERRIDE built-in knowledge) ═══\n${kbText}\n\nUse these facts. When an admin corrects you, use upsert_knowledge to save it.`;
      }
    }
    
    if (!isDirectMode && mode === "guest") {
      const sb = getSupabase();
      const { data: kbEntries } = await sb.from("ops_vector_knowledge").select("topic, content").eq("branch_id", branch_id).eq("is_active", true);
      if (kbEntries?.length) {
        systemPrompt += `\n\n═══ KNOWLEDGE BASE ═══\n${kbEntries.map(e => `• ${e.topic}: ${e.content}`).join("\n")}`;
      }
    }

    if (systemPrompt && ui_language === 'ml') {
      systemPrompt += `\n\n═══ LANGUAGE ═══\nUser's UI is Malayalam. Respond in Malayalam unless task requires English.`;
    }

    const aiMessages = isDirectMode
      ? [...messages]
      : [{ role: "system", content: systemPrompt }, ...messages];

    const body: any = {
      model: "google/gemini-2.5-flash",
      messages: aiMessages,
      stream: false,
    };

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
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result = await response.json();
    let assistantMessage = result.choices?.[0]?.message;

    // Tool call loop (max 8 iterations for complex multi-step operations)
    let iterations = 0;
    while (assistantMessage?.tool_calls && iterations < 8) {
      iterations++;
      const toolResults: any[] = [];
      
      for (const tc of assistantMessage.tool_calls) {
        const toolArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        console.log(`Tool call: ${tc.function.name}`, toolArgs);
        const toolResult = await executeTool(tc.function.name, toolArgs, branch_id, is_admin, user_id);
        toolResults.push({ role: "tool", tool_call_id: tc.id, content: toolResult });
      }

      const continueMessages = [...aiMessages, assistantMessage, ...toolResults];

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: continueMessages, tools: VECTOR_TOOLS, stream: false }),
      });

      if (!response.ok) {
        console.error("AI continuation error:", response.status, await response.text());
        break;
      }

      result = await response.json();
      assistantMessage = result.choices?.[0]?.message;
    }

    const finalContent = assistantMessage?.content || "I couldn't process that. Try again.";
    
    return new Response(JSON.stringify({ content: finalContent, tool_calls_made: iterations }), {
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
