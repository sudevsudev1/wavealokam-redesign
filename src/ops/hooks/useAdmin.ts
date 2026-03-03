import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  performed_by: string;
  branch_id: string;
  performed_at: string;
}

export function useAuditLog(limit = 50) {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_audit_log', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_audit_log')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as AuditLogEntry[];
    },
    enabled: !!profile,
  });
}

export function useConfigRegistry() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_config_registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_config_registry')
        .select('*')
        .order('key');
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async ({ key, value, branchId }: { key: string; value: unknown; branchId: string }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('ops_config_registry')
        .upsert({
          key,
          value_json: value as any,
          branch_id: branchId,
          updated_by: profile.userId,
        } as any, { onConflict: 'key,branch_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_config_registry'] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ops_user_profiles')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_user_profiles'] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ops_branches')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_branches'] });
    },
  });
}

export function useBranches() {
  return useQuery({
    queryKey: ['ops_branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_branches')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}
