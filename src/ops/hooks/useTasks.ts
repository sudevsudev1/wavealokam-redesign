import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { translateText } from '../lib/translate';
import { useEffect } from 'react';
import { extractPhotoMetadata } from '../lib/exifExtractor';

export interface OpsTask {
  id: string;
  title_original: string;
  title_en: string | null;
  title_ml: string | null;
  description_original: string | null;
  description_en: string | null;
  description_ml: string | null;
  original_language: string;
  category: string;
  priority: string;
  status: string;
  due_datetime: string | null;
  assigned_to: string[];
  created_by: string;
  branch_id: string;
  template_id: string | null;
  blocked_reason_code: string | null;
  blocked_reason_text_original: string | null;
  blocked_reason_text_en: string | null;
  blocked_reason_text_ml: string | null;
  completion_notes_original: string | null;
  completion_notes_en: string | null;
  completion_notes_ml: string | null;
  proof_required: boolean;
  receipt_required: boolean;
  tags: string[];
  related_room_id: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpsTaskAttachment {
  id: string;
  task_id: string;
  type: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
  vendor: string | null;
  amount: number | null;
  bill_date: string | null;
  tags: string[];
  branch_id: string;
  photo_taken_at: string | null;
  photo_lat: number | null;
  photo_lng: number | null;
  photo_device: string | null;
  upload_timestamp: string | null;
  metadata_json: Record<string, unknown> | null;
}

export function useTasks(filters?: { assignedTo?: string; status?: string }) {
  const { profile } = useOpsAuth();

  const query = useQuery({
    queryKey: ['ops_tasks', filters],
    queryFn: async () => {
      let q = supabase
        .from('ops_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.assignedTo) {
        q = q.contains('assigned_to', [filters.assignedTo]);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as OpsTask[];
    },
    enabled: !!profile,
  });

  // Realtime subscription
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('ops_tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_tasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ops_tasks'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useMyTasks() {
  const { profile } = useOpsAuth();
  return useTasks(profile ? { assignedTo: profile.userId } : undefined);
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      category: string;
      priority: string;
      due_datetime?: string;
      assigned_to: string[];
      proof_required: boolean;
      receipt_required: boolean;
      related_room_id?: string;
      template_id?: string;
      is_hidden?: boolean;
    }) => {
      if (!profile) throw new Error('Not authenticated');

      // Admin creates in English, auto-translate to Malayalam
      const titleMl = await translateText(task.title, 'en', 'ml');
      const descMl = task.description ? await translateText(task.description, 'en', 'ml') : null;

      const { data, error } = await supabase.from('ops_tasks').insert({
        title_original: task.title,
        title_en: task.title,
        title_ml: titleMl,
        description_original: task.description || null,
        description_en: task.description || null,
        description_ml: descMl,
        original_language: 'en',
        category: task.category,
        priority: task.priority,
        due_datetime: task.due_datetime || null,
        assigned_to: task.assigned_to,
        created_by: profile.userId,
        branch_id: profile.branchId,
        proof_required: task.proof_required,
        receipt_required: task.receipt_required,
        related_room_id: task.related_room_id || null,
        template_id: task.template_id || null,
        is_hidden: task.is_hidden || false,
      } as any).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      if (!profile) throw new Error('Not authenticated');

      // Handle translation for text fields if updated
      const translatedUpdates: Record<string, unknown> = { ...updates };

      if (updates.blocked_reason_text_original && typeof updates.blocked_reason_text_original === 'string') {
        const lang = (updates.original_language as string) || 'en';
        if (lang === 'en') {
          translatedUpdates.blocked_reason_text_en = updates.blocked_reason_text_original;
          translatedUpdates.blocked_reason_text_ml = await translateText(updates.blocked_reason_text_original as string, 'en', 'ml');
        } else {
          translatedUpdates.blocked_reason_text_ml = updates.blocked_reason_text_original;
          translatedUpdates.blocked_reason_text_en = await translateText(updates.blocked_reason_text_original as string, 'ml', 'en');
        }
      }

      if (updates.completion_notes_original && typeof updates.completion_notes_original === 'string') {
        const lang = (updates.original_language as string) || 'en';
        if (lang === 'en') {
          translatedUpdates.completion_notes_en = updates.completion_notes_original;
          translatedUpdates.completion_notes_ml = await translateText(updates.completion_notes_original as string, 'en', 'ml');
        } else {
          translatedUpdates.completion_notes_ml = updates.completion_notes_original;
          translatedUpdates.completion_notes_en = await translateText(updates.completion_notes_original as string, 'ml', 'en');
        }
      }

      const { error } = await supabase
        .from('ops_tasks')
        .update(translatedUpdates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_tasks'] });
    },
  });
}

export function useTaskAttachments(taskId: string) {
  return useQuery({
    queryKey: ['ops_task_attachments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OpsTaskAttachment[];
    },
    enabled: !!taskId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ taskId, file, type, vendor, amount, billDate }: {
      taskId: string;
      file: File;
      type: string;
      vendor?: string;
      amount?: number;
      billDate?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');

      const filePath = `${profile.branchId}/${taskId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('ops-attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('ops-attachments')
        .getPublicUrl(filePath);

      // Extract EXIF metadata from image files
      const meta = file.type.startsWith('image/') ? await extractPhotoMetadata(file) : null;

      const { error: insertError } = await supabase.from('ops_task_attachments').insert({
        task_id: taskId,
        type,
        file_url: urlData.publicUrl,
        uploaded_by: profile.userId,
        branch_id: profile.branchId,
        vendor: vendor || null,
        amount: amount || null,
        bill_date: billDate || null,
        photo_taken_at: meta?.takenAt || null,
        photo_lat: meta?.lat || null,
        photo_lng: meta?.lng || null,
        photo_device: meta?.device || null,
        upload_timestamp: new Date().toISOString(),
        metadata_json: meta?.raw || {},
      } as any);
      if (insertError) throw insertError;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ops_task_attachments', vars.taskId] });
    },
  });
}

export function useOpsProfiles() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_user_profiles')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });
}
