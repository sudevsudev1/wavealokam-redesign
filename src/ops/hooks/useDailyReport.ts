import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { startOfDay, endOfDay, format } from 'date-fns';

export interface DailyReportData {
  date: string;
  tasks: {
    total: number;
    done: number;
    doing: number;
    blocked: number;
    todo: number;
    cancelled: number;
    overdue: number;
    byCategory: Record<string, { total: number; done: number }>;
    byPriority: Record<string, number>;
  };
  guests: {
    checkedInToday: number;
    checkedOutToday: number;
    currentlyIn: number;
    totalAdults: number;
    totalChildren: number;
  };
  inventory: {
    lowStockItems: Array<{ id: string; name: string; current: number; reorder: number; unit: string }>;
    expiringItems: Array<{ id: string; itemName: string; expiryDate: string; quantity: number }>;
  };
  shifts: {
    clockedIn: number;
    totalWorkedMinutes: number;
    flaggedCount: number;
    staffSummary: Array<{ userId: string; name: string; minutes: number; flagged: boolean }>;
  };
}

export interface DailyReportSubmission {
  id: string;
  branch_id: string;
  report_date: string;
  submitted_by: string;
  revenue_total: number;
  revenue_cash: number;
  revenue_online: number;
  occupancy_notes: string | null;
  kitchen_notes: string | null;
  maintenance_notes: string | null;
  general_notes: string | null;
  highlights: string | null;
  issues: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDailyReport(dateStr: string) {
  const { profile } = useOpsAuth();

  return useQuery({
    queryKey: ['ops_daily_report', dateStr],
    queryFn: async (): Promise<DailyReportData> => {
      const day = new Date(dateStr);
      const dayStart = startOfDay(day).toISOString();
      const dayEnd = endOfDay(day).toISOString();

      const [tasksRes, guestsRes, currentGuestsRes, inventoryRes, expiryRes, shiftsRes, profilesRes] = await Promise.all([
        supabase.from('ops_tasks').select('*'),
        supabase.from('ops_guest_log').select('*')
          .gte('check_in_at', dayStart).lte('check_in_at', dayEnd),
        supabase.from('ops_guest_log').select('*')
          .eq('status', 'checked_in'),
        supabase.from('ops_inventory_items').select('*')
          .eq('is_active', true),
        supabase.from('ops_inventory_expiry').select('*, ops_inventory_items(name_en)')
          .eq('is_disposed', false)
          .lte('expiry_date', format(new Date(day.getTime() + 7 * 86400000), 'yyyy-MM-dd')),
        supabase.from('ops_shift_punches').select('*')
          .gte('clock_in_at', dayStart).lte('clock_in_at', dayEnd),
        supabase.from('ops_user_profiles').select('user_id, display_name').eq('is_active', true),
      ]);

      const tasks = (tasksRes.data || []) as any[];
      const todayGuests = (guestsRes.data || []) as any[];
      const currentGuests = (currentGuestsRes.data || []) as any[];
      const inventory = (inventoryRes.data || []) as any[];
      const expiry = (expiryRes.data || []) as any[];
      const shifts = (shiftsRes.data || []) as any[];
      const profiles = (profilesRes.data || []) as any[];
      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.display_name]));

      const overdue = tasks.filter((t: any) =>
        t.due_datetime && new Date(t.due_datetime) < new Date() && !['Done', 'Cancelled'].includes(t.status)
      ).length;

      const byCategory: Record<string, { total: number; done: number }> = {};
      const byPriority: Record<string, number> = {};
      tasks.forEach((t: any) => {
        if (!byCategory[t.category]) byCategory[t.category] = { total: 0, done: 0 };
        byCategory[t.category].total++;
        if (t.status === 'Done') byCategory[t.category].done++;
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      });

      const checkedOutToday = (await supabase.from('ops_guest_log').select('id', { count: 'exact', head: true })
        .gte('check_out_at', dayStart).lte('check_out_at', dayEnd)).count || 0;

      const lowStockItems = inventory
        .filter((i: any) => i.current_stock <= i.reorder_point)
        .map((i: any) => ({ id: i.id, name: i.name_en, current: i.current_stock, reorder: i.reorder_point, unit: i.unit }));

      const expiringItems = expiry.map((e: any) => ({
        id: e.id,
        itemName: e.ops_inventory_items?.name_en || 'Unknown',
        expiryDate: e.expiry_date,
        quantity: e.quantity,
      }));

      const staffSummary = new Map<string, { minutes: number; flagged: boolean }>();
      shifts.forEach((s: any) => {
        const existing = staffSummary.get(s.user_id) || { minutes: 0, flagged: false };
        if (s.clock_out_at) {
          existing.minutes += (new Date(s.clock_out_at).getTime() - new Date(s.clock_in_at).getTime()) / 60000 - (s.total_break_minutes || 0);
        }
        if (s.flag_type) existing.flagged = true;
        staffSummary.set(s.user_id, existing);
      });

      return {
        date: dateStr,
        tasks: {
          total: tasks.length,
          done: tasks.filter((t: any) => t.status === 'Done').length,
          doing: tasks.filter((t: any) => t.status === 'Doing').length,
          blocked: tasks.filter((t: any) => t.status === 'Blocked').length,
          todo: tasks.filter((t: any) => t.status === 'To Do').length,
          cancelled: tasks.filter((t: any) => t.status === 'Cancelled').length,
          overdue,
          byCategory,
          byPriority,
        },
        guests: {
          checkedInToday: todayGuests.length,
          checkedOutToday,
          currentlyIn: currentGuests.length,
          totalAdults: currentGuests.reduce((a: number, g: any) => a + (g.adults || 0), 0),
          totalChildren: currentGuests.reduce((a: number, g: any) => a + (g.children || 0), 0),
        },
        inventory: { lowStockItems, expiringItems },
        shifts: {
          clockedIn: shifts.filter((s: any) => s.status === 'clocked_in').length,
          totalWorkedMinutes: Math.round(Array.from(staffSummary.values()).reduce((a, v) => a + v.minutes, 0)),
          flaggedCount: shifts.filter((s: any) => s.flag_type).length,
          staffSummary: Array.from(staffSummary.entries()).map(([userId, data]) => ({
            userId,
            name: profileMap.get(userId) || 'Unknown',
            minutes: Math.round(data.minutes),
            flagged: data.flagged,
          })),
        },
      };
    },
    enabled: !!profile && !!dateStr,
  });
}

// Manager submissions
export function useDailyReportSubmissions(dateStr?: string) {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_daily_report_submissions', dateStr],
    queryFn: async () => {
      let q = supabase.from('ops_daily_reports').select('*').order('report_date', { ascending: false });
      if (dateStr) q = q.eq('report_date', dateStr);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as DailyReportSubmission[];
    },
    enabled: !!profile,
  });
}

export function useSubmitDailyReport() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (report: {
      report_date: string;
      revenue_total: number;
      revenue_cash: number;
      revenue_online: number;
      occupancy_notes?: string;
      kitchen_notes?: string;
      maintenance_notes?: string;
      general_notes?: string;
      highlights?: string;
      issues?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('ops_daily_reports').insert({
        branch_id: profile.branchId,
        submitted_by: profile.userId,
        ...report,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_daily_report_submissions'] });
    },
  });
}

export function useReviewDailyReport() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ id, status, review_notes }: { id: string; status: 'approved' | 'needs_revision'; review_notes?: string }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('ops_daily_reports').update({
        status,
        reviewed_by: profile.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_daily_report_submissions'] });
    },
  });
}
