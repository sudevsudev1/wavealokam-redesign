import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';

export interface RecurringMetaTask {
  id: string;
  branch_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringTask {
  id: string;
  meta_task_id: string | null;
  branch_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  frequency_days: number;
  assigned_to: string[];
  related_room_id: string | null;
  is_active: boolean;
  last_executed_at: string | null;
  next_execution_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useRecurringMetaTasks() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_recurring_meta_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_recurring_meta_tasks')
        .select('*')
        .order('title');
      if (error) throw error;
      return (data || []) as unknown as RecurringMetaTask[];
    },
    enabled: !!profile,
  });
}

export function useRecurringTasks() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_recurring_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_recurring_tasks')
        .select('*')
        .order('next_execution_at');
      if (error) throw error;
      return (data || []) as unknown as RecurringTask[];
    },
    enabled: !!profile,
  });
}

export function useCreateRecurringTask() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      category: string;
      priority: string;
      frequency_days: number;
      assigned_to: string[];
      related_room_id?: string;
      meta_task_id?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');
      const nextExec = new Date();
      nextExec.setDate(nextExec.getDate() + task.frequency_days);

      const { error } = await supabase.from('ops_recurring_tasks').insert({
        title: task.title,
        description: task.description || null,
        category: task.category,
        priority: task.priority,
        frequency_days: task.frequency_days,
        assigned_to: task.assigned_to,
        related_room_id: task.related_room_id || null,
        meta_task_id: task.meta_task_id || null,
        next_execution_at: nextExec.toISOString(),
        branch_id: profile.branchId,
        created_by: profile.userId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_recurring_tasks'] });
    },
  });
}

export function useCreateRecurringMetaTask() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (meta: {
      title: string;
      description?: string;
      category: string;
      priority: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('ops_recurring_meta_tasks').insert({
        title: meta.title,
        description: meta.description || null,
        category: meta.category,
        priority: meta.priority,
        branch_id: profile.branchId,
        created_by: profile.userId,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_recurring_meta_tasks'] });
    },
  });
}

export function useUpdateRecurringTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ops_recurring_tasks')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_recurring_tasks'] });
    },
  });
}

export function useDeleteRecurringTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ops_recurring_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_recurring_tasks'] });
    },
  });
}

export function useDeleteRecurringMetaTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ops_recurring_meta_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_recurring_meta_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ops_recurring_tasks'] });
    },
  });
}
