import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useEffect } from 'react';

export interface ShiftPunch {
  id: string;
  user_id: string;
  branch_id: string;
  clock_in_at: string;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_at: string | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  status: string;
  total_break_minutes: number;
  notes: string | null;
  flag_type: string | null;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftBreak {
  id: string;
  shift_id: string;
  break_start: string;
  break_end: string | null;
  break_type: string;
  branch_id: string;
}

// Property coords: Wavealokam, Varkala
const PROPERTY_LAT = 8.7616;
const PROPERTY_LNG = 76.6885;
const MAX_DISTANCE_KM = 0.5; // 500m radius

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function checkOffSite(lat: number | null, lng: number | null): { offSite: boolean; distance?: number } {
  if (lat == null || lng == null) return { offSite: false };
  const dist = getDistanceKm(lat, lng, PROPERTY_LAT, PROPERTY_LNG);
  return { offSite: dist > MAX_DISTANCE_KM, distance: Math.round(dist * 1000) };
}

function getGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function useMyActiveShift() {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_active_shift', profile?.userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_shift_punches')
        .select('*')
        .eq('user_id', profile!.userId)
        .eq('status', 'clocked_in')
        .order('clock_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ShiftPunch | null;
    },
    enabled: !!profile,
  });
}

export function useMyShifts(dateFrom?: string, dateTo?: string) {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_my_shifts', profile?.userId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from('ops_shift_punches')
        .select('*')
        .eq('user_id', profile!.userId)
        .order('clock_in_at', { ascending: false });
      if (dateFrom) q = q.gte('clock_in_at', dateFrom);
      if (dateTo) q = q.lte('clock_in_at', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ShiftPunch[];
    },
    enabled: !!profile,
  });
}

export function useAllShifts(dateFrom?: string, dateTo?: string) {
  const { profile } = useOpsAuth();
  return useQuery({
    queryKey: ['ops_all_shifts', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from('ops_shift_punches')
        .select('*')
        .order('clock_in_at', { ascending: false });
      if (dateFrom) q = q.gte('clock_in_at', dateFrom);
      if (dateTo) q = q.lte('clock_in_at', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ShiftPunch[];
    },
    enabled: !!profile,
  });
}

export function useShiftBreaks(shiftId: string) {
  return useQuery({
    queryKey: ['ops_shift_breaks', shiftId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_shift_breaks')
        .select('*')
        .eq('shift_id', shiftId)
        .order('break_start', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ShiftBreak[];
    },
    enabled: !!shiftId,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Not authenticated');
      const gps = await getGPS();
      const flagData: Record<string, unknown> = {};
      if (gps) {
        const { offSite, distance } = checkOffSite(gps.lat, gps.lng);
        if (offSite) {
          flagData.flag_type = 'off_site';
          flagData.flag_reason = `Clocked in ${distance}m from property`;
        }
      }
      const { data, error } = await supabase.from('ops_shift_punches').insert({
        user_id: profile.userId,
        branch_id: profile.branchId,
        clock_in_lat: gps?.lat || null,
        clock_in_lng: gps?.lng || null,
        ...flagData,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_active_shift'] });
      queryClient.invalidateQueries({ queryKey: ['ops_my_shifts'] });
      queryClient.invalidateQueries({ queryKey: ['ops_all_shifts'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, notes }: { shiftId: string; notes?: string }) => {
      const gps = await getGPS();
      const flagData: Record<string, unknown> = {};
      if (gps) {
        const { offSite, distance } = checkOffSite(gps.lat, gps.lng);
        if (offSite) {
          flagData.flag_type = 'off_site';
          flagData.flag_reason = `Clocked out ${distance}m from property`;
        }
      }
      const { error } = await supabase.from('ops_shift_punches').update({
        clock_out_at: new Date().toISOString(),
        clock_out_lat: gps?.lat || null,
        clock_out_lng: gps?.lng || null,
        status: 'clocked_out',
        notes: notes || null,
        ...flagData,
      } as any).eq('id', shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_active_shift'] });
      queryClient.invalidateQueries({ queryKey: ['ops_my_shifts'] });
      queryClient.invalidateQueries({ queryKey: ['ops_all_shifts'] });
    },
  });
}

export function useStartBreak() {
  const queryClient = useQueryClient();
  const { profile } = useOpsAuth();
  return useMutation({
    mutationFn: async ({ shiftId, breakType }: { shiftId: string; breakType?: string }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('ops_shift_breaks').insert({
        shift_id: shiftId,
        break_type: breakType || 'general',
        branch_id: profile.branchId,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ops_shift_breaks', vars.shiftId] });
    },
  });
}

export function useEndBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ breakId, shiftId }: { breakId: string; shiftId: string }) => {
      const { error } = await supabase.from('ops_shift_breaks').update({
        break_end: new Date().toISOString(),
      } as any).eq('id', breakId);
      if (error) throw error;
      // Update total_break_minutes on the shift
      const { data: breaks } = await supabase
        .from('ops_shift_breaks')
        .select('*')
        .eq('shift_id', shiftId);
      if (breaks) {
        const totalMins = (breaks as unknown as ShiftBreak[]).reduce((acc, b) => {
          if (b.break_end) {
            return acc + (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 60000;
          }
          return acc;
        }, 0);
        await supabase.from('ops_shift_punches').update({
          total_break_minutes: Math.round(totalMins),
        } as any).eq('id', shiftId);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ops_shift_breaks', vars.shiftId] });
      queryClient.invalidateQueries({ queryKey: ['ops_active_shift'] });
    },
  });
}
