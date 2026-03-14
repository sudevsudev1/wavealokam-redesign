import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useEffect } from 'react';
import { IdProofSlot } from '../components/IdProofUpload';

export interface GuestEntry {
  id: string;
  branch_id: string;
  guest_name: string;
  phone: string | null;
  email: string | null;
  adults: number;
  children: number;
  room_id: string | null;
  id_proof_type: string | null;
  id_proof_url: string | null;
  id_proof_urls: { label: string; url: string }[];
  purpose: string | null;
  source: string | null;
  check_in_at: string;
  expected_check_out: string | null;
  check_out_at: string | null;
  check_out_by: string | null;
  notes: string | null;
  checked_in_by: string;
  status: string;
  created_at: string;
  updated_at: string;
  guest_type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  arriving_from: string | null;
  heading_to: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  evisa_number: string | null;
  nationality: string | null;
  payment_mode: string | null;
  transaction_id: string | null;
  number_of_nights: number | null;
  submission_source: string;
  approval_status: string | null;
  share_token: string | null;
}

export function useGuestLog(statusFilter?: string) {
  const { profile } = useOpsAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ops_guest_log', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('ops_guest_log')
        .select('*')
        .order('check_in_at', { ascending: false });
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return ((data || []) as unknown as GuestEntry[]).map(g => ({
        ...g,
        id_proof_urls: Array.isArray(g.id_proof_urls) ? g.id_proof_urls : [],
      }));
    },
    enabled: !!profile,
  });

  useEffect(() => {
    const channel = supabase
      .channel('ops_guest_log_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_guest_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ops_guest_log'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export interface CheckInPayload {
  guest_name: string;
  guest_type: string;
  phone?: string;
  email?: string;
  adults: number;
  children: number;
  room_id?: string;
  id_proof_type?: string;
  id_proof_slots?: IdProofSlot[];
  purpose?: string;
  source?: string;
  expected_check_out?: string;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  arriving_from?: string;
  heading_to?: string;
  date_of_birth?: string;
  passport_number?: string;
  evisa_number?: string;
  nationality?: string;
  payment_mode?: string;
  transaction_id?: string;
  number_of_nights?: number;
  save_as_draft?: boolean;
}

async function uploadIdProofFiles(branchId: string, slots: IdProofSlot[]): Promise<{ label: string; url: string }[]> {
  const results: { label: string; url: string }[] = [];
  for (const slot of slots) {
    if (slot.file) {
      const filePath = `${branchId}/id-proofs/${crypto.randomUUID()}-${slot.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('ops-attachments')
        .upload(filePath, slot.file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('ops-attachments').getPublicUrl(filePath);
      results.push({ label: slot.label, url: urlData.publicUrl });
    } else if (slot.existingUrl) {
      results.push({ label: slot.label, url: slot.existingUrl });
    }
  }
  return results;
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (guest: CheckInPayload) => {
      if (!profile) throw new Error('Not authenticated');

      let idProofUrls: { label: string; url: string }[] = [];
      if (guest.id_proof_slots && guest.id_proof_slots.length > 0) {
        idProofUrls = await uploadIdProofFiles(profile.branchId, guest.id_proof_slots);
      }

      // Legacy single URL for backward compat
      const firstUrl = idProofUrls.length > 0 ? idProofUrls[0].url : null;
      const isDraft = guest.save_as_draft === true;

      const { data, error } = await supabase.from('ops_guest_log').insert({
        branch_id: profile.branchId,
        guest_name: guest.guest_name,
        guest_type: guest.guest_type,
        phone: guest.phone || null,
        email: guest.email || null,
        adults: guest.adults,
        children: guest.children,
        room_id: guest.room_id || null,
        id_proof_type: guest.id_proof_type || null,
        id_proof_url: firstUrl,
        id_proof_urls: idProofUrls,
        purpose: guest.purpose || 'Leisure',
        source: guest.source || 'Walk-in',
        expected_check_out: guest.expected_check_out || null,
        notes: guest.notes || null,
        checked_in_by: profile.userId,
        status: isDraft ? 'draft' : 'checked_in',
        address: guest.address || null,
        city: guest.city || null,
        state: guest.state || null,
        pincode: guest.pincode || null,
        arriving_from: guest.arriving_from || null,
        heading_to: guest.heading_to || null,
        date_of_birth: guest.date_of_birth || null,
        passport_number: guest.passport_number || null,
        evisa_number: guest.evisa_number || null,
        nationality: guest.nationality || null,
        payment_mode: guest.payment_mode || null,
        transaction_id: guest.transaction_id || null,
        number_of_nights: guest.number_of_nights || null,
      } as any).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_guest_log'] });
    },
  });
}

export function useUpdateGuestIdProofs() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async ({ guestId, slots, idProofType }: { guestId: string; slots: IdProofSlot[]; idProofType: string }) => {
      if (!profile) throw new Error('Not authenticated');

      const idProofUrls = await uploadIdProofFiles(profile.branchId, slots);
      const requiredFilled = slots.filter(s => s.required).every(s => s.file || s.existingUrl);

      const updatePayload: any = {
        id_proof_urls: idProofUrls,
        id_proof_type: idProofType,
        id_proof_url: idProofUrls.length > 0 ? idProofUrls[0].url : null,
      };

      // If all required proofs are now filled and status is draft, upgrade to checked_in
      if (requiredFilled) {
        // Only upgrade draft entries
        const { data: current } = await supabase.from('ops_guest_log').select('status').eq('id', guestId).single();
        if (current && (current as any).status === 'draft') {
          updatePayload.status = 'checked_in';
        }
      }

      const { error } = await supabase.from('ops_guest_log')
        .update(updatePayload)
        .eq('id', guestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_guest_log'] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();

  return useMutation({
    mutationFn: async (guestId: string) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('ops_guest_log')
        .update({
          status: 'checked_out',
          check_out_at: new Date().toISOString(),
          check_out_by: profile.userId,
        } as any)
        .eq('id', guestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_guest_log'] });
    },
  });
}
