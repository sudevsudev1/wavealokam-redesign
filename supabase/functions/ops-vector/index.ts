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

const ACTIVE_PURCHASE_ORDER_STATUSES = ["Draft", "Requested", "Approved", "Ordered", "Active"] as const;

type PurchaseItemInput = { name: string; quantity: number; unit?: string };
type MissingResolutionInput = {
  name: string;
  action: "catalog" | "one_time";
  category?: string;
  unit?: string;
  par_level?: number;
  reorder_point?: number;
  expiry_warn_days?: number | null;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findInventoryMatch(items: { id: string; name_en: string; unit: string }[], query: string) {
  const q = normalizeText(query);
  if (!q) return null;

  const exact = items.find((item) => normalizeText(item.name_en) === q);
  if (exact) return exact;

  const includes = items.find((item) => normalizeText(item.name_en).includes(q) || q.includes(normalizeText(item.name_en)));
  return includes || null;
}

function getMissingResolution(missingResolutions: MissingResolutionInput[], itemName: string) {
  const target = normalizeText(itemName);
  return missingResolutions.find((r) => normalizeText(r.name) === target || target.includes(normalizeText(r.name)) || normalizeText(r.name).includes(target)) || null;
}

async function getLatestActiveOrderId(sb: ReturnType<typeof getSupabase>, branchId: string) {
  const { data: orders } = await sb
    .from("ops_purchase_orders")
    .select("id")
    .eq("branch_id", branchId)
    .in("status", [...ACTIVE_PURCHASE_ORDER_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1);

  return orders?.[0]?.id ?? null;
}

async function getOrCreateActiveOrderId(sb: ReturnType<typeof getSupabase>, branchId: string, userId?: string) {
  const existingOrderId = await getLatestActiveOrderId(sb, branchId);
  if (existingOrderId) return existingOrderId;

  if (!userId) {
    throw new Error("Missing user context for creating purchase list");
  }

  const { data: newOrder, error: orderError } = await sb
    .from("ops_purchase_orders")
    .insert({ branch_id: branchId, requested_by: userId, status: "Draft" })
    .select("id")
    .single();

  if (orderError || !newOrder) {
    throw new Error(orderError?.message || "Failed to create purchase list");
  }

  return newOrder.id;
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
      name: "bulk_update_tasks",
      description: "Update multiple tasks at once (e.g., cancel all blocked tasks, mark several as done). Use get_tasks_summary first to collect IDs.",
      parameters: {
        type: "object",
        properties: {
          task_ids: { type: "array", items: { type: "string" }, description: "Array of task UUIDs" },
          updates: {
            type: "object",
            properties: {
              status: { type: "string", description: "To Do, Doing, Done, Blocked, Cancelled" },
              priority: { type: "string" },
              category: { type: "string" },
            },
          },
        },
        required: ["task_ids", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_delete_purchase_items",
      description: "Delete multiple items from the purchase list at once.",
      parameters: {
        type: "object",
        properties: {
          item_ids: { type: "array", items: { type: "string" }, description: "Array of purchase order item row UUIDs" },
        },
        required: ["item_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_laundry",
      description: "Update multiple laundry batches at once (e.g., mark all as returned).",
      parameters: {
        type: "object",
        properties: {
          batch_ids: { type: "array", items: { type: "string" }, description: "Array of laundry batch UUIDs" },
          action: { type: "string", description: "receive (mark as returned)" },
        },
        required: ["batch_ids", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_inventory",
      description: "Bulk deactivate or reactivate inventory items.",
      parameters: {
        type: "object",
        properties: {
          item_ids: { type: "array", items: { type: "string" }, description: "Array of inventory item UUIDs" },
          action: { type: "string", description: "deactivate or reactivate" },
        },
        required: ["item_ids", "action"],
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
      description: "Add items to the shared purchase list. Parse: '2 kg onion, 1 kg tomato' → items array. If an item is missing from inventory, first ask user: add to catalog or one-time, then call this tool again with missing_resolution.",
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
          missing_resolution: {
            type: "array",
            description: "Optional decisions for previously missing items. Use after user confirms catalog vs one-time.",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                action: { type: "string", description: "catalog or one_time" },
                category: { type: "string" },
                unit: { type: "string" },
                par_level: { type: "number" },
                reorder_point: { type: "number" },
                expiry_warn_days: { type: "number" },
              },
              required: ["name", "action"],
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

  // ═══ INVENTORY: Full CRUD ═══
  {
    type: "function",
    function: {
      name: "create_inventory_item",
      description: "Add a new item to the inventory catalog. Admin only. Parse: 'add hand soap to inventory, category toiletries, unit pcs, par 10' → create item.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Item name in English" },
          category: { type: "string", description: "Category from: Vegetables, Fruits, Dairy & Eggs, Staples, Pulses, Spices, Oils & Condiments, Proteins, Packaging & Cleaning, Toiletries, Linens, Cleaning, F&B, Maintenance, Stationery, Safety" },
          unit: { type: "string", description: "Unit: pcs, kg, liter, bunch, pack, loaf, roll, bottles, cans, reams, boxes, books, kits" },
          par_level: { type: "number", description: "Ideal stock level. Default 5." },
          reorder_point: { type: "number", description: "When to reorder. Default 2." },
          shelf_life_days: { type: "number", description: "Shelf life in days (optional)" },
          mfg_offset_days: { type: "number", description: "Days before received_date for mfg date. Default 2." },
          initial_stock: { type: "number", description: "Starting stock count. Default 0." },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_inventory_item",
      description: "Update an inventory item's parameters: par level, reorder point, shelf life, mfg offset, category, unit, name, current stock. Admin only.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Name of item to find" },
          par_level: { type: "number" },
          reorder_point: { type: "number" },
          shelf_life_days: { type: "number" },
          mfg_offset_days: { type: "number" },
          category: { type: "string" },
          unit: { type: "string" },
          current_stock: { type: "number" },
          new_name: { type: "string", description: "Rename the item" },
        },
        required: ["item_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_inventory_item",
      description: "Deactivate an inventory item (soft delete). Admin only.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string", description: "Name of item to deactivate" },
        },
        required: ["item_name"],
      },
    },
  },
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
      name: "get_room_readiness",
      description: "Check which rooms have been refreshed today vs which rooms had checkouts. Returns readiness status per room. Use for walk-in inquiries, daily report mismatch detection, and room allocation.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "ISO date string. Defaults to today." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_room",
      description: "Recommend the best room for a new guest based on check-in/out schedules, occupancy, room availability, AND room readiness (whether it has been refreshed after last checkout). Considers expected check-in/out times of existing guests.",
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
  {
    type: "function",
    function: {
      name: "create_issue_template",
      description: "Create an issue template for grouped stock deductions. Use when user says 'create an issue template for kitchen daily with soap, sponge, dish cloth' or 'make a room refill template for Room 101'. The template name can be anything: room ID, 'Kitchen Daily', 'Office', etc.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Template name (e.g., 'Kitchen Daily', 'Room 101', 'Office Supplies')" },
          items: {
            type: "array",
            description: "Items to include in the template",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
              },
              required: ["name", "quantity"],
            },
          },
        },
        required: ["name", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_purchase_template",
      description: "Create a purchase list template from the current purchase list or from specified items. When user says 'save current list as template' or 'create template from purchase list', use this. Can also create from scratch with item names.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Template name" },
          description: { type: "string", description: "Optional description" },
          from_current_list: { type: "boolean", description: "If true, copies all pending items from the current purchase list into the template" },
          items: {
            type: "array",
            description: "Manual item list (used if from_current_list is false)",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
              },
              required: ["name", "quantity"],
            },
          },
        },
        required: ["name"],
      },
    },
  },

  // ═══ LINEN LIFECYCLE ═══
  {
    type: "function",
    function: {
      name: "get_linen_status",
      description: "Get all linen items grouped by status (fresh, in_use, need_laundry, awaiting_return). Use for 'how many bedsheets are clean?', 'linen status', 'what's in laundry?'",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", description: "Optional: fresh, in_use, need_laundry, awaiting_return" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_linen_status",
      description: "Change the status of one or more linen items. Use for 'bedsheet from 102 is now in laundry', 'mark all need_laundry items as awaiting_return', 'room 102 linens need washing'. Can target by item type, room, or specific IDs.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "How to find items: 'room:102', 'type:Bedsheet', 'status:need_laundry', or 'id:<uuid>'" },
          new_status: { type: "string", description: "fresh, in_use, need_laundry, or awaiting_return" },
          room_id: { type: "string", description: "Optional: assign/change room (set null to clear)" },
          notes: { type: "string", description: "Optional note" },
        },
        required: ["target", "new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "issue_linens_to_room",
      description: "Issue fresh linens to a room. Changes their status to in_use and assigns the room. Links to guest if one is checked into that room. Use for 'issued linens to 102', 'room 102 got fresh sheets'.",
      parameters: {
        type: "object",
        properties: {
          room_id: { type: "string", description: "Room ID e.g. '102'" },
          items: {
            type: "array",
            description: "Specific items to issue. If empty, issues all available fresh items needed.",
            items: {
              type: "object",
              properties: {
                item_type: { type: "string" },
                count: { type: "number" },
              },
              required: ["item_type"],
            },
          },
        },
        required: ["room_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_linen_item",
      description: "Add a new linen item to the tracking system. Use for 'add 2 bedsheets to linen inventory', 'we got new towels'.",
      parameters: {
        type: "object",
        properties: {
          item_type: { type: "string", description: "Bedsheet, Pillow Cover, Towel, Bath Towel, Hand Towel, Blanket, Duvet Cover, Mattress Protector" },
          count: { type: "number", description: "How many to add. Default 1." },
          label: { type: "string", description: "Optional label (e.g., '#1', 'Blue')" },
        },
        required: ["item_type"],
      },
    },
  },

  // ═══ RECURRING TASKS ═══
  {
    type: "function",
    function: {
      name: "get_recurring_tasks",
      description: "Get recurring tasks and meta task groups. Shows frequency, next execution, assignees, due/overdue status.",
      parameters: {
        type: "object",
        properties: {
          meta_task_id: { type: "string", description: "Filter by meta task group ID" },
          include_inactive: { type: "boolean", description: "Include deactivated tasks" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_recurring_meta_task",
      description: "Create a meta task group for organizing related recurring tasks (e.g., 'AC Filter Cleaning' groups per-room tasks).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Meta task group name" },
          description: { type: "string" },
          category: { type: "string", description: "Default: Operations" },
          priority: { type: "string", description: "Default: Medium" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_recurring_task",
      description: "Create a recurring task with a frequency in days. Can be standalone or part of a meta task group. Parse: 'clean AC filter in 101 every 7 days' → title, frequency_days=7, room=101.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string", description: "Default: Operations" },
          priority: { type: "string", description: "Default: Medium" },
          frequency_days: { type: "number", description: "How often in days (e.g., 7 for weekly, 90 for quarterly)" },
          assigned_to_names: { type: "array", items: { type: "string" }, description: "Display names of assignees" },
          related_room_id: { type: "string", description: "Room ID if room-specific" },
          meta_task_id: { type: "string", description: "UUID of meta task group to attach to" },
        },
        required: ["title", "frequency_days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_recurring_task",
      description: "Update a recurring task: change title, frequency, assignees, active status, or mark as executed (resets next_execution_at).",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "UUID of the recurring task" },
          title: { type: "string" },
          frequency_days: { type: "number" },
          assigned_to_names: { type: "array", items: { type: "string" } },
          is_active: { type: "boolean" },
          mark_executed: { type: "boolean", description: "Mark as just executed — resets next_execution_at to now + frequency_days" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_recurring_task",
      description: "Delete a recurring task. Admin only.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_recurring_meta_task",
      description: "Delete a meta task group and all its sub-tasks. Admin only.",
      parameters: {
        type: "object",
        properties: {
          meta_task_id: { type: "string" },
        },
        required: ["meta_task_id"],
      },
    },
  },
  // ═══ SURFING TOOLS ═══
  {
    type: "function",
    function: {
      name: "add_board_rental",
      description: "Add a board rental entry. Ask for school name, number of boards, and date if not provided.",
      parameters: {
        type: "object",
        properties: {
          school_name: { type: "string", description: "Surf school name (e.g. Paddle Cult, Elixir)" },
          num_boards: { type: "number" },
          rental_date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
          boards_returned: { type: "number" },
          all_boards_good_condition: { type: "boolean" },
        },
        required: ["school_name", "num_boards"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_board_rental",
      description: "Update an existing board rental entry. Can change school, boards, date, returned count, condition, paid status, and rate.",
      parameters: {
        type: "object",
        properties: {
          rental_id: { type: "string", description: "ID of the rental to update" },
          school_name: { type: "string" },
          num_boards: { type: "number" },
          rate_per_board: { type: "number" },
          rental_date: { type: "string" },
          boards_returned: { type: "number" },
          all_boards_good_condition: { type: "boolean" },
          is_paid: { type: "boolean" },
        },
        required: ["rental_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_board_rentals",
      description: "Query board rentals. Filter by school, date range, paid status. Returns totals and details.",
      parameters: {
        type: "object",
        properties: {
          school_name: { type: "string" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          is_paid: { type: "boolean" },
          include_archived: { type: "boolean" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_surf_lesson",
      description: "Add a surf lesson entry. Ask for guest name, guest stay, number of lessons, fee, commission, and auto fare if not provided.",
      parameters: {
        type: "object",
        properties: {
          guest_name: { type: "string" },
          guest_stay_name: { type: "string", description: "Guest stay type (In house, Casa Maya, Kerala Cottage, Others)" },
          num_lessons: { type: "number" },
          fee_per_lesson: { type: "number" },
          commission_per_lesson: { type: "number" },
          auto_fare: { type: "number" },
          lesson_date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
        },
        required: ["guest_name", "guest_stay_name", "num_lessons"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_surf_lesson",
      description: "Update an existing surf lesson entry. Can change all fields including guest name, stay, fees, commission, auto fare, paid status.",
      parameters: {
        type: "object",
        properties: {
          lesson_id: { type: "string", description: "ID of the lesson to update" },
          guest_name: { type: "string" },
          guest_stay_name: { type: "string" },
          num_lessons: { type: "number" },
          fee_per_lesson: { type: "number" },
          commission_per_lesson: { type: "number" },
          auto_fare: { type: "number" },
          lesson_date: { type: "string" },
          is_paid: { type: "boolean" },
        },
        required: ["lesson_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_surf_lessons",
      description: "Query surf lessons. Filter by guest stay, date range, paid status. Returns totals and details.",
      parameters: {
        type: "object",
        properties: {
          guest_stay_name: { type: "string" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          is_paid: { type: "boolean" },
          include_archived: { type: "boolean" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_surfing_summary",
      description: "Get surfing revenue summary: total board income, lesson fees, commissions, auto fare, amounts owed by schools and guest stays, unreturned boards.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
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

      case "bulk_update_tasks": {
        if (!isAdmin) return "Only admins can perform bulk updates.";
        const taskIds = args.task_ids as string[];
        const updates = args.updates as Record<string, unknown>;
        if (!taskIds?.length) return "No task IDs provided.";
        
        const { data: tasks } = await sb.from("ops_tasks").select("id, title_en, title_original, status").eq("branch_id", branchId).in("id", taskIds);
        if (!tasks?.length) return "No matching tasks found.";
        
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.priority) dbUpdates.priority = updates.priority;
        if (updates.category) dbUpdates.category = updates.category;
        
        const { error } = await sb.from("ops_tasks").update(dbUpdates).eq("branch_id", branchId).in("id", taskIds);
        if (error) return `Error: ${error.message}`;
        
        for (const t of tasks) {
          await sb.from("ops_audit_log").insert({
            entity_type: "task", entity_id: t.id, action: "bulk_update",
            performed_by: userId, branch_id: branchId,
            before_json: { status: t.status }, after_json: dbUpdates,
          });
        }
        
        return JSON.stringify({ success: true, updated_count: tasks.length, updates: Object.keys(dbUpdates).filter(k => k !== "updated_at"), titles: tasks.map(t => t.title_en || t.title_original) });
      }

      case "bulk_delete_purchase_items": {
        if (!isAdmin) return "Only admins can bulk delete purchase items.";
        const itemIds = args.item_ids as string[];
        if (!itemIds?.length) return "No item IDs provided.";
        
        const { data: items } = await sb.from("ops_purchase_order_items").select("id, item_id, quantity, ops_inventory_items(name_en)").in("id", itemIds);
        if (!items?.length) return "No matching items found.";
        
        const { error } = await sb.from("ops_purchase_order_items").delete().in("id", itemIds);
        if (error) return `Error: ${error.message}`;
        
        for (const i of items) {
          await sb.from("ops_audit_log").insert({
            entity_type: "purchase_list_item", entity_id: i.id, action: "bulk_delete",
            performed_by: userId, branch_id: branchId,
            before_json: { item: (i.ops_inventory_items as any)?.name_en, quantity: i.quantity },
          });
        }
        
        return JSON.stringify({ success: true, deleted_count: items.length, items: items.map(i => (i.ops_inventory_items as any)?.name_en) });
      }

      case "bulk_update_laundry": {
        const batchIds = args.batch_ids as string[];
        const action = args.action as string;
        if (!batchIds?.length) return "No batch IDs provided.";
        
        if (action === "receive") {
          const now = new Date().toISOString();
          const { error } = await sb.from("ops_laundry_batches").update({
            actual_return_at: now, status: "returned", received_by: userId,
          }).eq("branch_id", branchId).in("id", batchIds);
          if (error) return `Error: ${error.message}`;
          return JSON.stringify({ success: true, action: "received", count: batchIds.length });
        }
        return `Unknown laundry action: ${action}`;
      }

      case "bulk_update_inventory": {
        if (!isAdmin) return "Only admins can bulk update inventory.";
        const itemIds = args.item_ids as string[];
        const action = args.action as string;
        if (!itemIds?.length) return "No item IDs provided.";
        
        const isActive = action === "reactivate";
        const { error } = await sb.from("ops_inventory_items").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("branch_id", branchId).in("id", itemIds);
        if (error) return `Error: ${error.message}`;
        
        for (const id of itemIds) {
          await sb.from("ops_audit_log").insert({
            entity_type: "inventory_item", entity_id: id, action: `bulk_${action}`,
            performed_by: userId, branch_id: branchId, after_json: { is_active: isActive },
          });
        }
        
        return JSON.stringify({ success: true, action, count: itemIds.length });
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
        const requestedItems = (args.items as PurchaseItemInput[]) || [];
        const missingResolutions = ((args.missing_resolution as MissingResolutionInput[]) || []);

        if (!requestedItems.length) {
          return JSON.stringify({ success: false, error: "No items provided" });
        }

        const { data: invItems } = await sb
          .from("ops_inventory_items")
          .select("id, name_en, unit")
          .eq("branch_id", branchId)
          .eq("is_active", true);

        const inventoryItems = [...(invItems || [])];
        const orderId = await getOrCreateActiveOrderId(sb, branchId, userId);

        const { data: existingListItems } = await sb
          .from("ops_purchase_order_items")
          .select("item_id, quantity, completed_at")
          .eq("order_id", orderId);

        const added: string[] = [];
        const duplicates: string[] = [];
        const unresolvedMissing: Array<{ name: string; quantity: number; unit: string }> = [];
        const autoCreated: Array<{ name: string; mode: "catalog" | "one_time" }> = [];

        for (const requestedItem of requestedItems) {
          const normalizedQty = Number(requestedItem.quantity) > 0 ? Number(requestedItem.quantity) : 1;
          let match = findInventoryMatch(inventoryItems, requestedItem.name);

          if (!match) {
            const resolution = getMissingResolution(missingResolutions, requestedItem.name);

            if (!resolution) {
              unresolvedMissing.push({
                name: requestedItem.name,
                quantity: normalizedQty,
                unit: requestedItem.unit || "pcs",
              });
              continue;
            }

            const defaultPar = resolution.action === "one_time" ? 1 : 5;
            const defaultReorder = resolution.action === "one_time" ? 0 : 2;
            const parLevel = resolution.par_level !== undefined ? Math.max(0, Math.round(resolution.par_level)) : defaultPar;
            const reorderPoint = resolution.reorder_point !== undefined
              ? Math.max(0, Math.round(resolution.reorder_point))
              : Math.min(parLevel, defaultReorder);

            const { data: createdItem, error: createError } = await sb
              .from("ops_inventory_items")
              .insert({
                branch_id: branchId,
                name_en: requestedItem.name,
                category: resolution.category || "F&B",
                unit: resolution.unit || requestedItem.unit || "pcs",
                par_level: parLevel,
                reorder_point: reorderPoint,
                expiry_warn_days: resolution.expiry_warn_days ?? null,
                current_stock: 0,
                is_active: true,
              })
              .select("id, name_en, unit")
              .single();

            if (createError || !createdItem) {
              unresolvedMissing.push({
                name: requestedItem.name,
                quantity: normalizedQty,
                unit: requestedItem.unit || "pcs",
              });
              continue;
            }

            match = createdItem;
            inventoryItems.push(createdItem);
            autoCreated.push({ name: createdItem.name_en, mode: resolution.action });
          }

          const existing = (existingListItems || []).find((entry: any) => entry.item_id === match.id && !entry.completed_at);
          if (existing) {
            duplicates.push(`${match.name_en} (already ${(existing as any).quantity} on list)`);
            continue;
          }

          const { error: insertError } = await sb.from("ops_purchase_order_items").insert({
            order_id: orderId,
            item_id: match.id,
            quantity: normalizedQty,
            branch_id: branchId,
            added_by: userId,
          });

          if (!insertError) {
            added.push(`${match.name_en} ×${normalizedQty} ${match.unit}`);
            await sb.from("ops_audit_log").insert({
              entity_type: "purchase_list_item",
              entity_id: orderId,
              action: "add_item",
              performed_by: userId,
              branch_id: branchId,
              after_json: { item: match.name_en, quantity: normalizedQty },
            });
          }
        }

        return JSON.stringify({
          success: true,
          added,
          duplicates,
          auto_created: autoCreated,
          requires_decision: unresolvedMissing.length > 0,
          unresolved_missing: unresolvedMissing,
          prompt: unresolvedMissing.length
            ? `Missing: ${unresolvedMissing.map((item) => `${item.name} (${item.quantity} ${item.unit})`).join(", ")}. Should I add each to catalog or as one-time?`
            : undefined,
        });
      }

      case "update_purchase_item": {
        const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`);
        if (!invItems?.length) return `Item "${args.item_name}" not found in inventory`;
        
        const orderId = await getLatestActiveOrderId(sb, branchId);
        if (!orderId) return "No active purchase list found";
        
        const itemIds = invItems.map(i => i.id);
        const { data: listItem } = await sb.from("ops_purchase_order_items").select("*").eq("order_id", orderId).in("item_id", itemIds).is("completed_at", null).limit(1);
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
        
        const orderId = await getLatestActiveOrderId(sb, branchId);
        if (!orderId) return "No active purchase list found";
        
        const itemIds = invItems.map(i => i.id);
        const { data: listItem } = await sb.from("ops_purchase_order_items").select("*").eq("order_id", orderId).in("item_id", itemIds).is("completed_at", null).limit(1);
        if (!listItem?.length) return `"${args.item_name}" is not on the current purchase list`;
        
        const { error } = await sb.from("ops_purchase_order_items").delete().eq("id", listItem[0].id);
        if (error) return `Error: ${error.message}`;
        
        await sb.from("ops_audit_log").insert({ entity_type: "purchase_list_item", entity_id: listItem[0].id, action: "delete_item", performed_by: userId, branch_id: branchId, before_json: { item: invItems[0].name_en, quantity: listItem[0].quantity } });
        return JSON.stringify({ success: true, removed: invItems[0].name_en });
      }

      case "tick_off_purchase_item": {
        const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en, unit, current_stock, mfg_offset_days, expiry_warn_days").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`);
        if (!invItems?.length) return `Item "${args.item_name}" not found`;
        
        const orderId = await getLatestActiveOrderId(sb, branchId);
        if (!orderId) return "No active purchase list found";
        
        const item = invItems[0];
        const itemIds = invItems.map(i => i.id);
        const { data: listItem } = await sb.from("ops_purchase_order_items").select("*").eq("order_id", orderId).in("item_id", itemIds).is("completed_at", null).limit(1);
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
          related_order_id: orderId,
        });
        
        await sb.from("ops_audit_log").insert({ entity_type: "purchase_list_item", entity_id: listItem[0].id, action: "tick_off", performed_by: userId, branch_id: branchId, after_json: { item: item.name_en, received: receivedQty } });
        
        return JSON.stringify({ success: true, item: item.name_en, received: receivedQty, new_stock: item.current_stock + receivedQty });
      }

      case "get_purchase_list": {
        const orderId = await getLatestActiveOrderId(sb, branchId);
        if (!orderId) return JSON.stringify({ items: [], message: "No active purchase list" });
        
        const { data: items } = await sb.from("ops_purchase_order_items").select("*, ops_inventory_items(name_en, unit)").eq("order_id", orderId).order("completed_at", { ascending: true, nullsFirst: true });
        
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

      // ═══ INVENTORY CRUD ═══

      case "create_inventory_item": {
        if (!isAdmin) return "Only admins can add inventory items.";
        const name = args.name as string;
        const category = (args.category as string) || "F&B";
        const unit = (args.unit as string) || "pcs";
        const parLevel = (args.par_level as number) || 5;
        const reorderPoint = (args.reorder_point as number) || 2;
        const shelfLife = args.shelf_life_days as number | undefined;
        const mfgOffset = (args.mfg_offset_days as number) || 2;
        const initialStock = (args.initial_stock as number) || 0;

        // Check for duplicate
        const { data: existing } = await sb.from("ops_inventory_items").select("id, name_en").eq("branch_id", branchId).ilike("name_en", name).eq("is_active", true).limit(1);
        if (existing?.length) return `Item "${existing[0].name_en}" already exists in inventory.`;

        const { data: newItem, error } = await sb.from("ops_inventory_items").insert({
          branch_id: branchId, name_en: name, category, unit,
          par_level: parLevel, reorder_point: reorderPoint,
          expiry_warn_days: shelfLife || null, mfg_offset_days: mfgOffset,
          current_stock: initialStock, is_active: true,
        }).select("id, name_en").single();
        if (error) return `Error: ${error.message}`;

        await sb.from("ops_audit_log").insert({
          entity_type: "inventory_item", entity_id: newItem.id, action: "create",
          performed_by: userId, branch_id: branchId,
          after_json: { name, category, unit, par_level: parLevel, reorder_point: reorderPoint },
        });

        return JSON.stringify({ success: true, item_id: newItem.id, name, category, unit, par_level: parLevel, reorder_point: reorderPoint, current_stock: initialStock });
      }

      case "update_inventory_item": {
        if (!isAdmin) return "Only admins can edit inventory items.";
        const { data: items } = await sb.from("ops_inventory_items").select("*").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`).eq("is_active", true);
        if (!items?.length) return `Item "${args.item_name}" not found in inventory.`;
        const item = items[0];
        const updates: any = { updated_at: new Date().toISOString() };
        if (args.par_level !== undefined) updates.par_level = args.par_level;
        if (args.reorder_point !== undefined) updates.reorder_point = args.reorder_point;
        if (args.shelf_life_days !== undefined) updates.expiry_warn_days = args.shelf_life_days || null;
        if (args.mfg_offset_days !== undefined) updates.mfg_offset_days = args.mfg_offset_days;
        if (args.category) updates.category = args.category;
        if (args.unit) updates.unit = args.unit;
        if (args.current_stock !== undefined) updates.current_stock = args.current_stock;
        if (args.new_name) updates.name_en = args.new_name;

        const { error } = await sb.from("ops_inventory_items").update(updates).eq("id", item.id);
        if (error) return `Error: ${error.message}`;

        // Recalculate batches if mfg or shelf life changed
        if (args.mfg_offset_days !== undefined || args.shelf_life_days !== undefined) {
          const newMfg = args.mfg_offset_days !== undefined ? (args.mfg_offset_days as number) : item.mfg_offset_days;
          const newShelf = args.shelf_life_days !== undefined ? (args.shelf_life_days as number) : item.expiry_warn_days;
          const { data: batches } = await sb.from("ops_inventory_expiry").select("id, received_date").eq("item_id", item.id).eq("is_disposed", false);
          for (const batch of (batches || [])) {
            if (batch.received_date) {
              const rcvd = new Date(batch.received_date);
              const batchUp: any = {};
              const mfgDate = new Date(rcvd); mfgDate.setDate(mfgDate.getDate() - newMfg);
              batchUp.mfg_date = mfgDate.toISOString().split("T")[0];
              if (newShelf) {
                const expDate = new Date(rcvd); expDate.setDate(expDate.getDate() + newShelf);
                batchUp.expiry_date = expDate.toISOString().split("T")[0];
              }
              await sb.from("ops_inventory_expiry").update(batchUp).eq("id", batch.id);
            }
          }
        }

        await sb.from("ops_audit_log").insert({
          entity_type: "inventory_item", entity_id: item.id, action: "update",
          performed_by: userId, branch_id: branchId,
          before_json: { name: item.name_en, par_level: item.par_level, reorder_point: item.reorder_point },
          after_json: updates,
        });

        return JSON.stringify({ success: true, item: args.new_name || item.name_en, updated_fields: Object.keys(updates).filter(k => k !== "updated_at") });
      }

      case "delete_inventory_item": {
        if (!isAdmin) return "Only admins can delete inventory items.";
        const { data: items } = await sb.from("ops_inventory_items").select("id, name_en").eq("branch_id", branchId).ilike("name_en", `%${args.item_name}%`).eq("is_active", true);
        if (!items?.length) return `Item "${args.item_name}" not found.`;
        if (items.length > 1) return `Multiple items match "${args.item_name}": ${items.map(i => i.name_en).join(", ")}. Be more specific.`;

        const item = items[0];
        const { error } = await sb.from("ops_inventory_items").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", item.id);
        if (error) return `Error: ${error.message}`;

        await sb.from("ops_audit_log").insert({
          entity_type: "inventory_item", entity_id: item.id, action: "delete",
          performed_by: userId, branch_id: branchId, before_json: { name: item.name_en },
        });

        return JSON.stringify({ success: true, deleted: item.name_en });
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
        
        const { data: activeOrders } = await sb.from("ops_purchase_orders").select("id, status, ops_purchase_order_items(item_id)").eq("branch_id", branchId).in("status", [...ACTIVE_PURCHASE_ORDER_STATUSES]);
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

      case "get_room_readiness": {
        const date = (args.date as string) || new Date().toISOString().split("T")[0];
        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;

        // Get all rooms
        const { data: allRooms } = await sb.from("ops_rooms").select("id, room_type").eq("branch_id", branchId).eq("is_active", true);

        // Get today's checkouts
        const { data: checkouts } = await sb.from("ops_guest_log").select("id, guest_name, room_id, check_out_at")
          .eq("branch_id", branchId).eq("status", "checked_out")
          .gte("check_out_at", dayStart).lte("check_out_at", dayEnd);

        // Get today's room refresh transactions (notes contain "Room XXX refresh")
        const { data: refreshTxns } = await sb.from("ops_inventory_transactions").select("notes, created_at")
          .eq("branch_id", branchId).eq("type", "issue")
          .gte("created_at", dayStart).lte("created_at", dayEnd)
          .ilike("notes", "%Room % refresh%");

        // Parse which rooms were refreshed today
        const refreshedRooms = new Set<string>();
        for (const tx of (refreshTxns || [])) {
          const match = (tx.notes || "").match(/Room (\S+) refresh/i);
          if (match) refreshedRooms.add(match[1]);
        }

        // Get currently checked-in guests for occupancy
        const { data: inHouse } = await sb.from("ops_guest_log").select("room_id, guest_name, expected_check_out")
          .eq("branch_id", branchId).eq("status", "checked_in");
        const occupiedMap = new Map((inHouse || []).map(g => [g.room_id, g]));

        // Also check "Issue template" transactions for room refreshes
        const { data: templateTxns } = await sb.from("ops_inventory_transactions").select("notes, created_at")
          .eq("branch_id", branchId).eq("type", "out")
          .gte("created_at", dayStart).lte("created_at", dayEnd)
          .ilike("notes", "%Issue template:%");

        // Room refreshes via issue template (notes like "Issue template: Room")
        for (const tx of (templateTxns || [])) {
          const match = (tx.notes || "").match(/Issue template:\s*(.+)/i);
          if (match) {
            const tplName = match[1].trim();
            // If template name matches a room ID
            if ((allRooms || []).some(r => r.id === tplName)) {
              refreshedRooms.add(tplName);
            }
          }
        }

        const checkedOutRooms = new Set((checkouts || []).map(c => c.room_id).filter(Boolean));
        const unrefreshedCheckouts = [...checkedOutRooms].filter(r => !refreshedRooms.has(r!));

        const roomStatuses = (allRooms || []).map(room => {
          const occupant = occupiedMap.get(room.id);
          const wasCheckedOut = checkedOutRooms.has(room.id);
          const wasRefreshed = refreshedRooms.has(room.id);

          let readiness: string;
          if (occupant) {
            readiness = "occupied";
          } else if (wasCheckedOut && wasRefreshed) {
            readiness = "ready"; // Checked out AND refreshed
          } else if (wasCheckedOut && !wasRefreshed) {
            readiness = "needs_refresh"; // Checked out but NOT refreshed
          } else if (wasRefreshed) {
            readiness = "ready"; // Was refreshed (maybe from yesterday's checkout)
          } else if (!occupant) {
            readiness = "vacant_unknown"; // Vacant, no checkout or refresh today
          } else {
            readiness = "unknown";
          }

          return {
            room_id: room.id, room_type: room.room_type, readiness,
            current_guest: occupant?.guest_name || null,
            expected_checkout: occupant?.expected_check_out || null,
            checked_out_today: wasCheckedOut,
            refreshed_today: wasRefreshed,
          };
        });

        return JSON.stringify({
          date,
          rooms: roomStatuses,
          summary: {
            total_rooms: (allRooms || []).length,
            occupied: roomStatuses.filter(r => r.readiness === "occupied").length,
            ready: roomStatuses.filter(r => r.readiness === "ready").length,
            needs_refresh: roomStatuses.filter(r => r.readiness === "needs_refresh").length,
            checkouts_today: checkedOutRooms.size,
            refreshes_today: refreshedRooms.size,
            unrefreshed_rooms: unrefreshedCheckouts,
            mismatch: unrefreshedCheckouts.length > 0,
          },
        }, null, 2);
      }

      case "recommend_room": {
        // Get all rooms
        const { data: rooms } = await sb.from("ops_rooms").select("*").eq("branch_id", branchId).eq("is_active", true);
        // Get currently checked-in guests
        const { data: guests } = await sb.from("ops_guest_log").select("*").eq("branch_id", branchId).eq("status", "checked_in");

        // Check room readiness — which rooms were refreshed today
        const today = new Date().toISOString().split("T")[0];
        const todayStart = `${today}T00:00:00`;
        const todayEnd = `${today}T23:59:59`;
        const { data: refreshTxns } = await sb.from("ops_inventory_transactions").select("notes")
          .eq("branch_id", branchId).or("type.eq.issue,type.eq.out")
          .gte("created_at", todayStart).lte("created_at", todayEnd)
          .or("notes.ilike.%Room % refresh%,notes.ilike.%Issue template:%");

        const refreshedRooms = new Set<string>();
        for (const tx of (refreshTxns || [])) {
          const match1 = (tx.notes || "").match(/Room (\S+) refresh/i);
          if (match1) refreshedRooms.add(match1[1]);
          const match2 = (tx.notes || "").match(/Issue template:\s*(.+)/i);
          if (match2 && (rooms || []).some(r => r.id === match2[1].trim())) {
            refreshedRooms.add(match2[1].trim());
          }
        }

        // Also check recent refresh transactions (last 24h for rooms that haven't been occupied since)
        const { data: recentRefresh } = await sb.from("ops_inventory_transactions").select("notes")
          .eq("branch_id", branchId).or("type.eq.issue,type.eq.out")
          .gte("created_at", new Date(Date.now() - 48 * 3600000).toISOString())
          .or("notes.ilike.%Room % refresh%,notes.ilike.%Issue template:%");

        for (const tx of (recentRefresh || [])) {
          const match1 = (tx.notes || "").match(/Room (\S+) refresh/i);
          if (match1) refreshedRooms.add(match1[1]);
        }

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
          const isRefreshed = refreshedRooms.has(room.id);

          if (!occupant) {
            // Room is free
            recommendations.push({
              room_id: room.id, room_type: room.room_type,
              status: isRefreshed ? "Available & Ready" : "Available (not refreshed)",
              is_refreshed: isRefreshed,
              reason: isRefreshed ? "Room is vacant and freshly refreshed" : "Room is vacant but has NOT been refreshed yet",
              score: isRefreshed ? 100 : 60,
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
                is_refreshed: false,
                reason: `Current guest ${occupant.guest_name} expected to check out ${Math.round(hoursGap)}h before new check-in. Will need refresh.`,
                score: hoursGap >= 3 ? 75 : 45,
              });
            } else {
              recommendations.push({
                room_id: room.id, room_type: room.room_type, status: "Occupied",
                current_guest: occupant.guest_name,
                expected_checkout: occupant.expected_check_out || "Unknown",
                is_refreshed: false,
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
        
        const [tasksR, guestsR, shiftsR, lowStockR, expiringR, refreshTxnsR] = await Promise.all([
          sb.from("ops_tasks").select("*").eq("branch_id", branchId).or(`created_at.gte.${dayStart},updated_at.gte.${dayStart}`).limit(200),
          sb.from("ops_guest_log").select("*").eq("branch_id", branchId).or(`check_in_at.gte.${dayStart},and(check_in_at.lte.${dayEnd},or(check_out_at.is.null,check_out_at.gte.${dayStart}))`).limit(200),
          sb.from("ops_shift_punches").select("*").eq("branch_id", branchId).gte("clock_in_at", dayStart).lte("clock_in_at", dayEnd),
          sb.from("ops_inventory_items").select("*").eq("branch_id", branchId).eq("is_active", true),
          sb.from("ops_inventory_expiry").select("*, ops_inventory_items(name_en)").eq("branch_id", branchId).eq("is_disposed", false).lte("expiry_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]),
          // Room refresh transactions today
          sb.from("ops_inventory_transactions").select("notes, created_at").eq("branch_id", branchId).gte("created_at", dayStart).lte("created_at", dayEnd).or("notes.ilike.%Room % refresh%,notes.ilike.%Issue template:%"),
        ]);
        
        const tasks = tasksR.data || [];
        const guests = guestsR.data || [];
        const shifts = shiftsR.data || [];
        const dueForOrder = (lowStockR.data || []).filter(i => i.current_stock <= i.reorder_point);
        const inHouse = guests.filter(g => g.status === "checked_in");

        // Room readiness analysis
        const checkedOutRooms = guests.filter(g => g.check_out_at && g.check_out_at >= dayStart && g.check_out_at <= dayEnd).map(g => g.room_id).filter(Boolean);
        const refreshedRooms = new Set<string>();
        for (const tx of (refreshTxnsR.data || [])) {
          const match1 = (tx.notes || "").match(/Room (\S+) refresh/i);
          if (match1) refreshedRooms.add(match1[1]);
          const match2 = (tx.notes || "").match(/Issue template:\s*(.+)/i);
          if (match2) refreshedRooms.add(match2[1].trim());
        }
        const uniqueCheckedOutRooms = [...new Set(checkedOutRooms)];
        const unrefreshedRooms = uniqueCheckedOutRooms.filter(r => !refreshedRooms.has(r!));
        
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
            check_outs_today: uniqueCheckedOutRooms.length,
            checked_out_rooms: uniqueCheckedOutRooms,
          },
          room_readiness: {
            refreshed_rooms: [...refreshedRooms],
            unrefreshed_after_checkout: unrefreshedRooms,
            mismatch: unrefreshedRooms.length > 0,
            alert: unrefreshedRooms.length > 0 ? `⚠️ ${unrefreshedRooms.length} room(s) checked out but NOT refreshed: ${unrefreshedRooms.join(", ")}` : null,
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

      case "create_issue_template": {
        const templateName = args.name as string;
        const templateItemsInput = args.items as { name: string; quantity: number }[];
        if (!templateItemsInput?.length) return "No items specified for the issue template.";

        const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en, unit").eq("branch_id", branchId).eq("is_active", true);
        const resolvedItems: { item_id: string; quantity: number; name: string }[] = [];
        const missing: string[] = [];

        for (const item of templateItemsInput) {
          const match = findInventoryMatch(invItems || [], item.name);
          if (match) {
            resolvedItems.push({ item_id: match.id, quantity: item.quantity, name: match.name_en });
          } else {
            missing.push(item.name);
          }
        }

        if (missing.length > 0) {
          return `These items were not found in the catalog: ${missing.join(", ")}. Add them first or check spelling.`;
        }

        // Insert each item as a row in ops_room_refill_templates with room_type = template name
        for (const ri of resolvedItems) {
          const { error } = await sb.from("ops_room_refill_templates").insert({
            branch_id: branchId,
            room_type: templateName,
            item_id: ri.item_id,
            quantity: ri.quantity,
          });
          if (error) return `Error adding ${ri.name}: ${error.message}`;
        }

        return JSON.stringify({ success: true, template_name: templateName, items: resolvedItems.map(r => ({ name: r.name, quantity: r.quantity })) });
      }

      case "create_purchase_template": {
        const templateName = args.name as string;
        const description = (args.description as string) || null;
        const fromCurrentList = args.from_current_list as boolean | undefined;

        let templateItems: { item_id: string; quantity: number }[] = [];

        if (fromCurrentList) {
          const orderId = await getLatestActiveOrderId(sb, branchId);
          if (!orderId) return "No active purchase list found to create template from.";

          const { data: orderItems } = await sb
            .from("ops_purchase_order_items")
            .select("item_id, quantity")
            .eq("order_id", orderId)
            .is("completed_at", null);

          if (!orderItems?.length) return "Purchase list is empty — nothing to create a template from.";
          templateItems = orderItems.map(oi => ({ item_id: oi.item_id, quantity: oi.quantity }));
        } else if (args.items) {
          const { data: invItems } = await sb.from("ops_inventory_items").select("id, name_en, unit").eq("branch_id", branchId).eq("is_active", true);
          for (const item of (args.items as { name: string; quantity: number }[])) {
            const match = findInventoryMatch(invItems || [], item.name);
            if (match) {
              templateItems.push({ item_id: match.id, quantity: item.quantity });
            } else {
              return `Item "${item.name}" not found in inventory catalog. Add it first or check spelling.`;
            }
          }
        }

        if (templateItems.length === 0) return "No items resolved for the template.";

        const { error } = await sb.from("ops_purchase_templates").insert({
          branch_id: branchId,
          name: templateName,
          description,
          items_json: templateItems,
          created_by: userId!,
        });
        if (error) return `Error creating template: ${error.message}`;

        return JSON.stringify({ success: true, name: templateName, item_count: templateItems.length });
      }

      // ═══ LINEN LIFECYCLE ═══

      case "get_linen_status": {
        const statusFilter = args.status_filter as string | undefined;
        let q = sb.from("ops_linen_items").select("*").eq("branch_id", branchId);
        if (statusFilter) q = q.eq("status", statusFilter);
        const { data, error } = await q.order("item_type");
        if (error) return `Error: ${error.message}`;
        
        const items = data || [];
        const grouped: Record<string, typeof items> = { fresh: [], in_use: [], need_laundry: [], awaiting_return: [] };
        for (const item of items) {
          if (grouped[item.status]) grouped[item.status].push(item);
        }
        
        const summary = Object.entries(grouped)
          .filter(([_, v]) => v.length > 0)
          .map(([status, items]) => {
            const labels: Record<string, string> = { fresh: "✅ Fresh/Ready", in_use: "🛏️ In Use", need_laundry: "🧺 Need Laundry", awaiting_return: "⏳ Awaiting Return" };
            const itemList = items.map(i => `  - ${i.item_type}${i.item_label ? ` (${i.item_label})` : ""}${i.room_id ? ` → Room ${i.room_id}` : ""}`).join("\n");
            return `${labels[status] || status} (${items.length}):\n${itemList}`;
          }).join("\n\n");
        
        return summary || "No linen items tracked.";
      }

      case "update_linen_status": {
        const target = args.target as string;
        const newStatus = args.new_status as string;
        const roomId = args.room_id as string | undefined;
        const notes = args.notes as string | undefined;
        
        let q = sb.from("ops_linen_items").select("*").eq("branch_id", branchId);
        
        if (target.startsWith("room:")) {
          q = q.eq("room_id", target.replace("room:", ""));
        } else if (target.startsWith("type:")) {
          q = q.ilike("item_type", `%${target.replace("type:", "")}%`);
        } else if (target.startsWith("status:")) {
          q = q.eq("status", target.replace("status:", ""));
        } else if (target.startsWith("id:")) {
          q = q.eq("id", target.replace("id:", ""));
        } else {
          // Try to match by type name
          q = q.ilike("item_type", `%${target}%`);
        }
        
        const { data: items, error: fetchErr } = await q;
        if (fetchErr) return `Error: ${fetchErr.message}`;
        if (!items?.length) return `No linen items found matching "${target}".`;
        
        const updatePayload: Record<string, any> = {
          status: newStatus,
          status_changed_at: new Date().toISOString(),
          status_changed_by: userId,
          updated_at: new Date().toISOString(),
        };
        if (roomId !== undefined) updatePayload.room_id = roomId === "null" ? null : roomId;
        if (notes) updatePayload.notes = notes;
        if (newStatus === "fresh") {
          updatePayload.room_id = null;
          updatePayload.guest_id = null;
          updatePayload.expected_free_at = null;
        }
        
        const ids = items.map(i => i.id);
        const { error: updateErr } = await sb.from("ops_linen_items").update(updatePayload).in("id", ids);
        if (updateErr) return `Error: ${updateErr.message}`;
        
        return JSON.stringify({ success: true, updated: ids.length, items: items.map(i => `${i.item_type}${i.item_label ? ` (${i.item_label})` : ""}`), new_status: newStatus });
      }

      case "issue_linens_to_room": {
        const roomId = args.room_id as string;
        const specificItems = args.items as { item_type: string; count?: number }[] | undefined;
        
        // Find guest in this room
        const { data: guests } = await sb.from("ops_guest_log").select("id, guest_name, expected_check_out")
          .eq("branch_id", branchId).eq("room_id", roomId).eq("status", "checked_in").limit(1);
        const guest = guests?.[0];
        
        // Find fresh items to issue
        let freshQuery = sb.from("ops_linen_items").select("*").eq("branch_id", branchId).eq("status", "fresh");
        const { data: freshItems, error } = await freshQuery;
        if (error) return `Error: ${error.message}`;
        if (!freshItems?.length) return "No fresh linen items available to issue.";
        
        let toIssue: typeof freshItems = [];
        
        if (specificItems?.length) {
          for (const spec of specificItems) {
            const count = spec.count || 1;
            const matching = freshItems.filter(f => f.item_type.toLowerCase().includes(spec.item_type.toLowerCase()) && !toIssue.some(ti => ti.id === f.id));
            toIssue.push(...matching.slice(0, count));
          }
        } else {
          // Issue one of each type available
          const seen = new Set<string>();
          for (const f of freshItems) {
            if (!seen.has(f.item_type)) {
              toIssue.push(f);
              seen.add(f.item_type);
            }
          }
        }
        
        if (toIssue.length === 0) return "No matching fresh linen items found.";
        
        const ids = toIssue.map(i => i.id);
        const updatePayload: Record<string, any> = {
          status: "in_use",
          room_id: roomId,
          status_changed_at: new Date().toISOString(),
          status_changed_by: userId,
          updated_at: new Date().toISOString(),
        };
        if (guest) {
          updatePayload.guest_id = guest.id;
          if (guest.expected_check_out) updatePayload.expected_free_at = guest.expected_check_out;
        }
        
        const { error: updateErr } = await sb.from("ops_linen_items").update(updatePayload).in("id", ids);
        if (updateErr) return `Error: ${updateErr.message}`;
        
        const summary = toIssue.map(i => i.item_type).join(", ");
        return JSON.stringify({ success: true, room: roomId, issued: toIssue.length, items: summary, guest: guest?.guest_name || "No guest" });
      }

      case "add_linen_item": {
        const itemType = args.item_type as string;
        const count = (args.count as number) || 1;
        const label = args.label as string | undefined;
        
        const inserts = [];
        for (let i = 0; i < count; i++) {
          inserts.push({
            branch_id: branchId,
            item_type: itemType,
            item_label: label ? (count > 1 ? `${label} #${i + 1}` : label) : (count > 1 ? `#${i + 1}` : null),
            status: "fresh",
            status_changed_by: userId,
          });
        }
        
        const { error } = await sb.from("ops_linen_items").insert(inserts);
        if (error) return `Error: ${error.message}`;
        
        return JSON.stringify({ success: true, added: count, type: itemType });
      }

      // ═══ RECURRING TASKS ═══

      case "get_recurring_tasks": {
        const [metaResult, tasksResult] = await Promise.all([
          sb.from("ops_recurring_meta_tasks").select("*").eq("branch_id", branchId).order("title"),
          sb.from("ops_recurring_tasks").select("*").eq("branch_id", branchId).order("next_execution_at"),
        ]);
        const metas = metaResult.data || [];
        let tasks = tasksResult.data || [];
        if (!args.include_inactive) tasks = tasks.filter((t: any) => t.is_active);
        if (args.meta_task_id) tasks = tasks.filter((t: any) => t.meta_task_id === args.meta_task_id);

        const userIds = [...new Set(tasks.flatMap((t: any) => t.assigned_to))];
        const { data: profiles } = await sb.from("ops_user_profiles").select("user_id, display_name").in("user_id", userIds.length ? userIds : ["none"]);
        const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));

        const now = new Date();
        const tasksByMeta = new Map<string, any[]>();
        const standalone: any[] = [];
        for (const t of tasks) {
          const daysUntil = Math.ceil((new Date(t.next_execution_at).getTime() - now.getTime()) / 86400000);
          const mapped = {
            id: t.id, title: t.title, frequency_days: t.frequency_days,
            next_execution: t.next_execution_at, last_executed: t.last_executed_at,
            assigned_to: t.assigned_to.map((id: string) => nameMap[id] || id),
            room: t.related_room_id, is_active: t.is_active,
            status: daysUntil < 0 ? "OVERDUE" : daysUntil <= 1 ? "DUE_SOON" : "OK",
            days_until_next: daysUntil,
          };
          if (t.meta_task_id) {
            const arr = tasksByMeta.get(t.meta_task_id) || [];
            arr.push(mapped);
            tasksByMeta.set(t.meta_task_id, arr);
          } else {
            standalone.push(mapped);
          }
        }

        return JSON.stringify({
          meta_tasks: metas.map((m: any) => ({
            id: m.id, title: m.title, description: m.description,
            category: m.category, priority: m.priority,
            sub_tasks: tasksByMeta.get(m.id) || [],
          })),
          standalone_tasks: standalone,
        }, null, 2);
      }

      case "create_recurring_meta_task": {
        const { data, error } = await sb.from("ops_recurring_meta_tasks").insert({
          branch_id: branchId, created_by: userId,
          title: args.title as string,
          description: (args.description as string) || null,
          category: (args.category as string) || "Operations",
          priority: (args.priority as string) || "Medium",
        }).select("id").single();
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, meta_task_id: data.id, title: args.title });
      }

      case "create_recurring_task": {
        const freqDays = (args.frequency_days as number) || 7;
        const nextExec = new Date();
        nextExec.setDate(nextExec.getDate() + freqDays);

        let assignedIds: string[] = [];
        if (args.assigned_to_names) {
          const { data: profs } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).eq("is_active", true);
          for (const n of (args.assigned_to_names as string[])) {
            const match = (profs || []).find((p: any) => p.display_name.toLowerCase().includes(n.toLowerCase()));
            if (match) assignedIds.push(match.user_id);
            else return `No user found matching "${n}". Available: ${(profs || []).map((p: any) => p.display_name).join(", ")}`;
          }
        }

        const { data, error } = await sb.from("ops_recurring_tasks").insert({
          branch_id: branchId, created_by: userId,
          title: args.title as string,
          description: (args.description as string) || null,
          category: (args.category as string) || "Operations",
          priority: (args.priority as string) || "Medium",
          frequency_days: freqDays,
          assigned_to: assignedIds,
          related_room_id: (args.related_room_id as string) || null,
          meta_task_id: (args.meta_task_id as string) || null,
          next_execution_at: nextExec.toISOString(),
        }).select("id").single();
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, task_id: data.id, title: args.title, frequency_days: freqDays, next_execution: nextExec.toISOString() });
      }

      case "update_recurring_task": {
        const taskId = args.task_id as string;
        const updates: any = { updated_at: new Date().toISOString() };

        if (args.title) updates.title = args.title;
        if (args.frequency_days) updates.frequency_days = args.frequency_days;
        if (args.is_active !== undefined) updates.is_active = args.is_active;

        if (args.assigned_to_names) {
          const { data: profs } = await sb.from("ops_user_profiles").select("user_id, display_name").eq("branch_id", branchId).eq("is_active", true);
          const ids: string[] = [];
          for (const n of (args.assigned_to_names as string[])) {
            const match = (profs || []).find((p: any) => p.display_name.toLowerCase().includes(n.toLowerCase()));
            if (match) ids.push(match.user_id);
            else return `No user found matching "${n}"`;
          }
          updates.assigned_to = ids;
        }

        if (args.mark_executed) {
          const { data: existing } = await sb.from("ops_recurring_tasks").select("frequency_days").eq("id", taskId).single();
          if (existing) {
            const freq = (args.frequency_days as number) || existing.frequency_days;
            const next = new Date();
            next.setDate(next.getDate() + freq);
            updates.last_executed_at = new Date().toISOString();
            updates.next_execution_at = next.toISOString();
          }
        }

        const { error } = await sb.from("ops_recurring_tasks").update(updates).eq("id", taskId).eq("branch_id", branchId);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, task_id: taskId, updated: Object.keys(updates).filter(k => k !== "updated_at") });
      }

      case "delete_recurring_task": {
        if (!isAdmin) return "Only admins can delete recurring tasks.";
        const taskId = args.task_id as string;
        const { data: existing } = await sb.from("ops_recurring_tasks").select("title").eq("id", taskId).eq("branch_id", branchId).single();
        if (!existing) return `Recurring task not found: ${taskId}`;
        const { error } = await sb.from("ops_recurring_tasks").delete().eq("id", taskId).eq("branch_id", branchId);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, deleted: existing.title });
      }

      case "delete_recurring_meta_task": {
        if (!isAdmin) return "Only admins can delete meta tasks.";
        const metaId = args.meta_task_id as string;
        const { data: existing } = await sb.from("ops_recurring_meta_tasks").select("title").eq("id", metaId).eq("branch_id", branchId).single();
        if (!existing) return `Meta task not found: ${metaId}`;
        // CASCADE will delete sub-tasks
        const { error } = await sb.from("ops_recurring_meta_tasks").delete().eq("id", metaId).eq("branch_id", branchId);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, deleted: existing.title, note: "All sub-tasks also deleted" });
      }

      // ═══ SURFING ═══
      case "add_board_rental": {
        const schoolName = (args.school_name as string || "").trim();
        const { data: schools } = await sb.from("ops_surf_schools").select("id, name").eq("branch_id", branchId).eq("is_active", true);
        const school = (schools || []).find(s => s.name.toLowerCase() === schoolName.toLowerCase());
        if (!school) return `School "${schoolName}" not found. Available: ${(schools || []).map(s => s.name).join(", ")}`;
        const { data: config } = await sb.from("ops_surf_config").select("value_json").eq("branch_id", branchId).eq("key", "board_rate").single();
        const rate = config?.value_json?.rate ?? 500;
        const numBoards = (args.num_boards as number) || 1;
        const rentalDate = (args.rental_date as string) || new Date().toISOString().slice(0, 10);
        const { data: rental, error } = await sb.from("ops_surf_board_rentals").insert({
          branch_id: branchId, school_id: school.id, num_boards: numBoards, rate_per_board: rate,
          rental_date: rentalDate, created_by: userId || branchId,
          boards_returned: (args.boards_returned as number) ?? 0,
          all_boards_good_condition: (args.all_boards_good_condition as boolean) ?? true,
        }).select().single();
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, id: rental.id, school: school.name, boards: numBoards, amount: rental.amount_due, date: rentalDate });
      }

      case "update_board_rental": {
        const rentalId = args.rental_id as string;
        if (!rentalId) return "rental_id is required";
        const updates: Record<string, unknown> = {};
        if (args.school_name) {
          const { data: schools } = await sb.from("ops_surf_schools").select("id, name").eq("branch_id", branchId).eq("is_active", true);
          const school = (schools || []).find(s => s.name.toLowerCase() === (args.school_name as string).toLowerCase());
          if (!school) return `School not found. Available: ${(schools || []).map(s => s.name).join(", ")}`;
          updates.school_id = school.id;
        }
        if (args.num_boards !== undefined) updates.num_boards = args.num_boards;
        if (args.rate_per_board !== undefined) updates.rate_per_board = args.rate_per_board;
        if (args.rental_date) updates.rental_date = args.rental_date;
        if (args.boards_returned !== undefined) updates.boards_returned = args.boards_returned;
        if (args.all_boards_good_condition !== undefined) updates.all_boards_good_condition = args.all_boards_good_condition;
        if (args.is_paid !== undefined) {
          updates.is_paid = args.is_paid;
          updates.paid_at = args.is_paid ? new Date().toISOString() : null;
        }
        // Recalculate amount_due if boards or rate changed
        if (updates.num_boards !== undefined || updates.rate_per_board !== undefined) {
          const { data: existing } = await sb.from("ops_surf_board_rentals").select("num_boards, rate_per_board").eq("id", rentalId).single();
          if (existing) {
            const boards = (updates.num_boards as number) ?? existing.num_boards;
            const rate = (updates.rate_per_board as number) ?? existing.rate_per_board;
            updates.amount_due = boards * rate;
          }
        }
        const { error } = await sb.from("ops_surf_board_rentals").update(updates).eq("id", rentalId).eq("branch_id", branchId);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, updated: rentalId, changes: Object.keys(updates) });
      }

      case "get_board_rentals": {
        let query = sb.from("ops_surf_board_rentals").select("*, ops_surf_schools(name)").eq("branch_id", branchId);
        if (!args.include_archived) query = query.eq("is_archived", false);
        if (args.is_paid !== undefined) query = query.eq("is_paid", args.is_paid as boolean);
        if (args.date_from) query = query.gte("rental_date", args.date_from as string);
        if (args.date_to) query = query.lte("rental_date", args.date_to as string);
        if (args.school_name) {
          const { data: schools } = await sb.from("ops_surf_schools").select("id, name").eq("branch_id", branchId);
          const school = (schools || []).find(s => s.name.toLowerCase() === (args.school_name as string).toLowerCase());
          if (school) query = query.eq("school_id", school.id);
        }
        const { data, error } = await query.order("rental_date", { ascending: false });
        if (error) return `Error: ${error.message}`;
        const rentals = data || [];
        const total = rentals.reduce((s, r) => s + (r.amount_due || 0), 0);
        const unpaid = rentals.filter(r => !r.is_paid).reduce((s, r) => s + (r.amount_due || 0), 0);
        const unreturned = rentals.filter(r => r.boards_returned < r.num_boards && !r.is_paid);
        return JSON.stringify({
          count: rentals.length, total_amount: total, unpaid_amount: unpaid,
          unreturned_boards: unreturned.map(r => ({ id: r.id, school: r.ops_surf_schools?.name, date: r.rental_date, boards: r.num_boards, returned: r.boards_returned })),
          entries: rentals.slice(0, 50).map(r => ({ id: r.id, school: r.ops_surf_schools?.name, date: r.rental_date, boards: r.num_boards, returned: r.boards_returned, condition_ok: r.all_boards_good_condition, amount: r.amount_due, paid: r.is_paid })),
        });
      }

      case "add_surf_lesson": {
        const stayName = (args.guest_stay_name as string || "").trim();
        const { data: stays } = await sb.from("ops_surf_guest_stays").select("id, name, default_commission").eq("branch_id", branchId).eq("is_active", true);
        const stay = (stays || []).find(s => s.name.toLowerCase() === stayName.toLowerCase());
        if (!stay) return `Guest stay "${stayName}" not found. Available: ${(stays || []).map(s => s.name).join(", ")}`;
        const numLessons = (args.num_lessons as number) || 1;
        const feePerLesson = (args.fee_per_lesson as number) ?? 1500;
        const commPerLesson = (args.commission_per_lesson as number) ?? stay.default_commission;
        const autoFare = (args.auto_fare as number) ?? 0;
        const lessonDate = (args.lesson_date as string) || new Date().toISOString().slice(0, 10);
        const { data: lesson, error } = await sb.from("ops_surf_lessons").insert({
          branch_id: branchId, guest_name: args.guest_name as string, guest_stay_id: stay.id,
          num_lessons: numLessons, fee_per_lesson: feePerLesson, commission_per_lesson: commPerLesson,
          auto_fare: autoFare, lesson_date: lessonDate, created_by: userId || branchId,
        }).select().single();
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, id: lesson.id, guest: args.guest_name, stay: stay.name, lessons: numLessons, total_fees: lesson.total_fees, total_commission: lesson.total_commission });
      }

      case "update_surf_lesson": {
        const lessonId = args.lesson_id as string;
        if (!lessonId) return "lesson_id is required";
        const updates: Record<string, unknown> = {};
        if (args.guest_name) updates.guest_name = args.guest_name;
        if (args.guest_stay_name) {
          const { data: stays } = await sb.from("ops_surf_guest_stays").select("id, name").eq("branch_id", branchId).eq("is_active", true);
          const stay = (stays || []).find(s => s.name.toLowerCase() === (args.guest_stay_name as string).toLowerCase());
          if (!stay) return `Guest stay not found. Available: ${(stays || []).map(s => s.name).join(", ")}`;
          updates.guest_stay_id = stay.id;
        }
        if (args.num_lessons !== undefined) updates.num_lessons = args.num_lessons;
        if (args.fee_per_lesson !== undefined) updates.fee_per_lesson = args.fee_per_lesson;
        if (args.commission_per_lesson !== undefined) updates.commission_per_lesson = args.commission_per_lesson;
        if (args.auto_fare !== undefined) updates.auto_fare = args.auto_fare;
        if (args.lesson_date) updates.lesson_date = args.lesson_date;
        if (args.is_paid !== undefined) {
          updates.is_paid = args.is_paid;
          updates.paid_at = args.is_paid ? new Date().toISOString() : null;
        }
        // Recalculate totals if relevant fields changed
        if (updates.num_lessons !== undefined || updates.fee_per_lesson !== undefined || updates.commission_per_lesson !== undefined) {
          const { data: existing } = await sb.from("ops_surf_lessons").select("num_lessons, fee_per_lesson, commission_per_lesson").eq("id", lessonId).single();
          if (existing) {
            const n = (updates.num_lessons as number) ?? existing.num_lessons;
            const f = (updates.fee_per_lesson as number) ?? existing.fee_per_lesson;
            const c = (updates.commission_per_lesson as number) ?? existing.commission_per_lesson;
            updates.total_fees = n * f;
            updates.total_commission = n * c;
          }
        }
        const { error } = await sb.from("ops_surf_lessons").update(updates).eq("id", lessonId).eq("branch_id", branchId);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ success: true, updated: lessonId, changes: Object.keys(updates) });
      }

      case "get_surf_lessons": {
        let query = sb.from("ops_surf_lessons").select("*, ops_surf_guest_stays(name)").eq("branch_id", branchId);
        if (!args.include_archived) query = query.eq("is_archived", false);
        if (args.is_paid !== undefined) query = query.eq("is_paid", args.is_paid as boolean);
        if (args.date_from) query = query.gte("lesson_date", args.date_from as string);
        if (args.date_to) query = query.lte("lesson_date", args.date_to as string);
        if (args.guest_stay_name) {
          const { data: stays } = await sb.from("ops_surf_guest_stays").select("id, name").eq("branch_id", branchId);
          const stay = (stays || []).find(s => s.name.toLowerCase() === (args.guest_stay_name as string).toLowerCase());
          if (stay) query = query.eq("guest_stay_id", stay.id);
        }
        const { data, error } = await query.order("lesson_date", { ascending: false });
        if (error) return `Error: ${error.message}`;
        const lessons = data || [];
        return JSON.stringify({
          count: lessons.length,
          total_fees: lessons.reduce((s, l) => s + (l.total_fees || 0), 0),
          total_commission: lessons.reduce((s, l) => s + (l.total_commission || 0), 0),
          total_auto_fare: lessons.reduce((s, l) => s + (l.auto_fare || 0), 0),
          entries: lessons.slice(0, 50).map(l => ({ id: l.id, guest: l.guest_name, stay: l.ops_surf_guest_stays?.name, date: l.lesson_date, lessons: l.num_lessons, fees: l.total_fees, commission: l.total_commission, auto_fare: l.auto_fare, paid: l.is_paid })),
        });
      }

      case "get_surfing_summary": {
        const [{ data: rentals }, { data: lessons }, { data: schools }, { data: stays }] = await Promise.all([
          sb.from("ops_surf_board_rentals").select("school_id, amount_due, is_paid, num_boards, boards_returned, rental_date").eq("branch_id", branchId).eq("is_archived", false),
          sb.from("ops_surf_lessons").select("guest_stay_id, total_fees, total_commission, auto_fare, is_paid").eq("branch_id", branchId).eq("is_archived", false),
          sb.from("ops_surf_schools").select("id, name").eq("branch_id", branchId).eq("is_active", true),
          sb.from("ops_surf_guest_stays").select("id, name").eq("branch_id", branchId).eq("is_active", true),
        ]);
        const schoolMap = new Map((schools || []).map(s => [s.id, s.name]));
        const stayMap = new Map((stays || []).map(s => [s.id, s.name]));
        const r = rentals || []; const l = lessons || [];
        const boardIncome = r.reduce((s, x) => s + (x.amount_due || 0), 0);
        const lessonFees = l.reduce((s, x) => s + (x.total_fees || 0), 0);
        const commissions = l.reduce((s, x) => s + (x.total_commission || 0), 0);
        const autoFare = l.reduce((s, x) => s + (x.auto_fare || 0), 0);
        // Owed by school
        const owedBySchool: Record<string, number> = {};
        r.filter(x => !x.is_paid).forEach(x => { const n = schoolMap.get(x.school_id) || "?"; owedBySchool[n] = (owedBySchool[n] || 0) + (x.amount_due || 0); });
        // Owed by stay
        const owedByStay: Record<string, number> = {};
        l.filter(x => !x.is_paid).forEach(x => { const n = stayMap.get(x.guest_stay_id) || "?"; owedByStay[n] = (owedByStay[n] || 0) + (x.total_commission || 0); });
        // Unreturned boards > 48h
        const now = Date.now();
        const unreturned = r.filter(x => x.boards_returned < x.num_boards && (now - new Date(x.rental_date).getTime()) > 48 * 3600 * 1000)
          .map(x => ({ school: schoolMap.get(x.school_id), date: x.rental_date, boards: x.num_boards, returned: x.boards_returned }));
        return JSON.stringify({ board_income: boardIncome, lesson_fees: lessonFees, commissions, auto_fare: autoFare, total_revenue: boardIncome + lessonFees, owed_by_school: owedBySchool, owed_by_stay: owedByStay, unreturned_boards_48h: unreturned });
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
RECURRING TASKS: Create recurring tasks & meta task groups, update (frequency/assignees/mark executed), delete (admin), query with due/overdue status
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
2. **ROOM READINESS CHECK**: If there were checkouts today, compare against room refreshes. If ANY rooms were checked out but NOT refreshed (room_readiness.mismatch is true), IMMEDIATELY ask: "I see rooms [X, Y] were checked out today but haven't been refreshed yet. Were they cleaned and restocked?" This is critical — flag it clearly.
3. Ask about incomplete tasks: "I see X tasks still open. Did you finish any of these?" — list them
4. Ask about revenue: "What's today's revenue? Cash and online separately?"
5. Probe for observations: kitchen issues, maintenance, guest behavior, anything unusual
6. Don't go point-by-point. Flow naturally. Extract what you need.
7. When you have enough, use submit_daily_report. This auto-ends the shift.
8. If room readiness mismatch exists and user confirms rooms were NOT refreshed, flag this in the report notes for admin review: "⚠️ ADMIN ALERT: Rooms [X] not refreshed after checkout."
9. Confirm: "Report submitted. Shift ended. Here's your summary: [brief]"

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
If add_to_purchase_list returns unresolved_missing/requires_decision, ALWAYS ask: "Should I add [item] to catalog or as one-time?"
After user answers, call add_to_purchase_list again with missing_resolution for each missing item and execute immediately.
When user says "got it", "received", "tick off" → tick_off_purchase_item.

═══ ROOM REFRESH / ISSUE ═══
When user says "room X refreshed" or "cleaned room X" → issue_room_items. You know the template.
When user says "used 2 tissue rolls" → issue_item.
ALL rooms MUST be refreshed immediately after checkout, regardless of whether there's a same-day check-in.
Use get_room_readiness to check which rooms are ready vs which need refresh.

═══ ROOM READINESS & WALK-INS ═══
For walk-in room inquiries, ALWAYS use recommend_room which now factors in room readiness.
A room that has been checked out but NOT refreshed should be flagged — you can still offer it but note it needs prep time.
Prefer rooms that are both vacant AND refreshed (score 100) over vacant but unrefreshed (score 60).
Use get_room_readiness proactively when anyone asks about available rooms.
Track readiness status: "ready" (refreshed), "needs_refresh" (checkout but no refresh), "occupied", "vacant_unknown".

═══ LAUNDRY & LINEN LIFECYCLE ═══
Track individual linen items through their lifecycle: fresh → in_use → need_laundry → awaiting_return → fresh.
- "Issued linens to 102" → issue_linens_to_room. Links to current guest, sets expected_free_at to checkout date.
- "Room 102 checked out, linens need washing" → update_linen_status target:room:102 new_status:need_laundry.
- "Sent bedsheets to laundry" → update_linen_status target:type:Bedsheet new_status:awaiting_return (for items in need_laundry).
- "Laundry returned the towels" → update_linen_status target:type:Towel new_status:fresh (for items awaiting_return).
- "How many clean bedsheets?" → get_linen_status status_filter:fresh.
- Guest checkout should trigger linens moving to need_laundry.
- Guest stay extension should update expected_free_at.
- Individual items can have different statuses — e.g., laundry returned without one bedsheet, so only update the ones that came back.
Track linen sets (legacy): 8 total sets, 5 rooms. Turnaround = 2 days (before noon cutoff).
Run laundry_forecast daily to proactively flag shortages.
"Sent 3 sets to laundry" → send_laundry.
"Laundry came back" → receive_laundry (need batch_id, get from forecast data).

═══ RECURRING TASKS ═══
Recurring tasks are scheduled maintenance duties with a set frequency (e.g., every 7 days, every 90 days).
Meta tasks GROUP related recurring tasks (e.g., "AC Filter Cleaning" groups per-room tasks for 101-104, 202).
- "Show recurring tasks" / "what's due soon?" → get_recurring_tasks
- "Create a recurring task to clean kitchen every 30 days" → create_recurring_task
- "Create a group for bathroom deep clean" → create_recurring_meta_task, then create sub-tasks
- "Mark AC filter 101 as done" → update_recurring_task with mark_executed=true (resets next_execution_at)
- "Assign AC filter cleaning to Anandhu" → update_recurring_task with assigned_to_names
- "What recurring tasks are overdue?" → get_recurring_tasks, filter for OVERDUE status
- Delete recurring task/meta task → admin only via delete_recurring_task / delete_recurring_meta_task
When a recurring task is marked executed, next_execution_at advances by frequency_days.

═══ BULK OPERATIONS ═══
When asked to do something across "all" tasks/items (e.g., "delete all pending tasks", "cancel all blocked tasks"):
1. Query first: get_tasks_summary, get_purchase_list, laundry_forecast, get_inventory_status
2. Confirm: "Found X items matching. Shall I proceed?" — list briefly
3. Execute: bulk_delete_tasks, bulk_update_tasks, bulk_delete_purchase_items, bulk_update_laundry, bulk_update_inventory
Available bulk tools:
- bulk_update_tasks: change status/priority/category of multiple tasks
- bulk_delete_tasks: delete multiple tasks
- bulk_delete_purchase_items: remove multiple items from purchase list
- bulk_update_laundry: mark multiple batches as received
- bulk_update_inventory: deactivate/reactivate multiple inventory items
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
