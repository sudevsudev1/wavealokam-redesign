import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';

// ─── Types ───

export interface SurfSchool {
  id: string;
  branch_id: string;
  name: string;
  is_active: boolean;
}

export interface GuestStay {
  id: string;
  branch_id: string;
  name: string;
  default_commission: number;
  is_active: boolean;
}

export interface BoardRental {
  id: string;
  branch_id: string;
  school_id: string;
  rental_date: string;
  num_boards: number;
  rate_per_board: number;
  amount_due: number;
  boards_returned: number;
  all_boards_good_condition: boolean;
  is_paid: boolean;
  paid_at: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
}

export interface BoardPayment {
  id: string;
  branch_id: string;
  school_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface SurfLesson {
  id: string;
  branch_id: string;
  lesson_date: string;
  num_lessons: number;
  guest_name: string;
  guest_stay_id: string;
  fee_per_lesson: number;
  total_fees: number;
  commission_per_lesson: number;
  total_commission: number;
  auto_fare: number;
  is_paid: boolean;
  paid_at: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
}

export interface LessonPayment {
  id: string;
  branch_id: string;
  guest_stay_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface SurfConfig {
  branch_id: string;
  key: string;
  value_json: any;
}

// ─── Hooks ───

export function useSurfSchools() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['surf-schools', profile?.branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_surf_schools')
        .select('*')
        .eq('branch_id', profile!.branchId)
        .order('name');
      if (error) throw error;
      return data as SurfSchool[];
    },
    enabled: !!profile,
  });
}

export function useGuestStays() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['surf-guest-stays', profile?.branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_surf_guest_stays')
        .select('*')
        .eq('branch_id', profile!.branchId)
        .order('name');
      if (error) throw error;
      return data as GuestStay[];
    },
    enabled: !!profile,
  });
}

export function useBoardRentals() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['surf-board-rentals', profile?.branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_surf_board_rentals')
        .select('*')
        .eq('branch_id', profile!.branchId)
        .eq('is_archived', false)
        .order('rental_date', { ascending: false });
      if (error) throw error;
      return data as BoardRental[];
    },
    enabled: !!profile,
  });
}

export function useBoardPayments() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['surf-board-payments', profile?.branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_surf_board_payments')
        .select('*')
        .eq('branch_id', profile!.branchId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as BoardPayment[];
    },
    enabled: !!profile,
  });
}

export function useSurfLessons() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['surf-lessons', profile?.branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_surf_lessons')
        .select('*')
        .eq('branch_id', profile!.branchId)
        .eq('is_archived', false)
        .order('lesson_date', { ascending: false });
      if (error) throw error;
      return data as SurfLesson[];
    },
    enabled: !!profile,
  });
}

export function useLessonPayments() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['surf-lesson-payments', profile?.branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_surf_lesson_payments')
        .select('*')
        .eq('branch_id', profile!.branchId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as LessonPayment[];
    },
    enabled: !!profile,
  });
}

export function useSurfConfig() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['surf-config', profile?.branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_surf_config')
        .select('*')
        .eq('branch_id', profile!.branchId);
      if (error) throw error;
      return data as SurfConfig[];
    },
    enabled: !!profile,
  });
}

// ─── Mutations ───

export function useAddBoardRental() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async (input: { school_id: string; rental_date: string; num_boards: number; rate_per_board: number; boards_returned?: number; all_boards_good_condition?: boolean }) => {
      const { error } = await supabase.from('ops_surf_board_rentals').insert({
        branch_id: profile!.branchId,
        created_by: profile!.userId,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-board-rentals'] }),
  });
}

export function useUpdateBoardRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; school_id?: string; rental_date?: string; num_boards?: number; rate_per_board?: number; amount_due?: number; boards_returned?: number; all_boards_good_condition?: boolean; is_paid?: boolean; paid_at?: string | null }) => {
      const { data, error } = await supabase.from('ops_surf_board_rentals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-board-rentals'] }),
  });
}

export function useDeleteBoardRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_surf_board_rentals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-board-rentals'] }),
  });
}

export function useAddBoardPayment() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async (input: { school_id: string; amount: number; payment_date?: string; notes?: string }) => {
      const { error } = await supabase.from('ops_surf_board_payments').insert({
        branch_id: profile!.branchId,
        created_by: profile!.userId,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surf-board-payments'] });
      qc.invalidateQueries({ queryKey: ['surf-board-rentals'] });
    },
  });
}

export function useAddSurfLesson() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async (input: { lesson_date: string; num_lessons: number; guest_name: string; guest_stay_id: string; fee_per_lesson: number; commission_per_lesson: number; auto_fare: number }) => {
      const { error } = await supabase.from('ops_surf_lessons').insert({
        branch_id: profile!.branchId,
        created_by: profile!.userId,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-lessons'] }),
  });
}

export function useUpdateSurfLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; lesson_date?: string; num_lessons?: number; guest_name?: string; guest_stay_id?: string; fee_per_lesson?: number; total_fees?: number; commission_per_lesson?: number; total_commission?: number; auto_fare?: number; is_paid?: boolean; paid_at?: string | null }) => {
      const { data, error } = await supabase.from('ops_surf_lessons').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-lessons'] }),
  });
}

export function useDeleteSurfLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_surf_lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-lessons'] }),
  });
}

export function useAddLessonPayment() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async (input: { guest_stay_id: string; amount: number; payment_date?: string; notes?: string }) => {
      const { error } = await supabase.from('ops_surf_lesson_payments').insert({
        branch_id: profile!.branchId,
        created_by: profile!.userId,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surf-lesson-payments'] });
      qc.invalidateQueries({ queryKey: ['surf-lessons'] });
    },
  });
}

// Admin mutations
export function useUpsertSurfSchool() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; is_active?: boolean }) => {
      if (input.id) {
        const { error } = await supabase.from('ops_surf_schools').update({ name: input.name, is_active: input.is_active ?? true }).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ops_surf_schools').insert({ branch_id: profile!.branchId, name: input.name });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-schools'] }),
  });
}

export function useDeleteSurfSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_surf_schools').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-schools'] }),
  });
}

export function useUpsertGuestStay() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; default_commission?: number; is_active?: boolean }) => {
      if (input.id) {
        const { error } = await supabase.from('ops_surf_guest_stays').update({ name: input.name, default_commission: input.default_commission ?? 0, is_active: input.is_active ?? true }).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ops_surf_guest_stays').insert({ branch_id: profile!.branchId, name: input.name, default_commission: input.default_commission ?? 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-guest-stays'] }),
  });
}

export function useUpdateSurfConfig() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async (input: { key: string; value_json: any }) => {
      const { error } = await supabase.from('ops_surf_config').upsert({
        branch_id: profile!.branchId,
        key: input.key,
        value_json: input.value_json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surf-config'] }),
  });
}

// Mark rentals as paid based on FIFO payment
export function useApplyBoardPayment() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async ({ school_id, amount, notes }: { school_id: string; amount: number; notes?: string }) => {
      // 1. Record the payment
      const { error: payErr } = await supabase.from('ops_surf_board_payments').insert({
        branch_id: profile!.branchId,
        school_id,
        amount,
        created_by: profile!.userId,
        notes,
      });
      if (payErr) throw payErr;

      // 2. Get unpaid rentals for this school (oldest first)
      const { data: unpaid, error: fetchErr } = await supabase
        .from('ops_surf_board_rentals')
        .select('id, amount_due')
        .eq('branch_id', profile!.branchId)
        .eq('school_id', school_id)
        .eq('is_paid', false)
        .eq('is_archived', false)
        .order('rental_date', { ascending: true });
      if (fetchErr) throw fetchErr;

      // 3. FIFO: mark earliest entries as paid until amount is exhausted
      let remaining = amount;
      for (const rental of (unpaid || [])) {
        if (remaining <= 0) break;
        if (remaining >= rental.amount_due) {
          await supabase.from('ops_surf_board_rentals').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', rental.id);
          remaining -= rental.amount_due;
        } else {
          // partial — leave as unpaid (the payment has been recorded separately)
          break;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surf-board-rentals'] });
      qc.invalidateQueries({ queryKey: ['surf-board-payments'] });
    },
  });
}

// Mark lesson commissions as paid for a guest stay
export function useApplyLessonPayment() {
  const qc = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async ({ guest_stay_id, amount, notes }: { guest_stay_id: string; amount: number; notes?: string }) => {
      const { error: payErr } = await supabase.from('ops_surf_lesson_payments').insert({
        branch_id: profile!.branchId,
        guest_stay_id,
        amount,
        created_by: profile!.userId,
        notes,
      });
      if (payErr) throw payErr;

      // Get unpaid lessons for this guest stay (oldest first)
      const { data: unpaid, error: fetchErr } = await supabase
        .from('ops_surf_lessons')
        .select('id, total_commission')
        .eq('branch_id', profile!.branchId)
        .eq('guest_stay_id', guest_stay_id)
        .eq('is_paid', false)
        .eq('is_archived', false)
        .order('lesson_date', { ascending: true });
      if (fetchErr) throw fetchErr;

      let remaining = amount;
      for (const lesson of (unpaid || [])) {
        if (remaining <= 0) break;
        if (remaining >= lesson.total_commission) {
          await supabase.from('ops_surf_lessons').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', lesson.id);
          remaining -= lesson.total_commission;
        } else {
          break;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surf-lessons'] });
      qc.invalidateQueries({ queryKey: ['surf-lesson-payments'] });
    },
  });
}
