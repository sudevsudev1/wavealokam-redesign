import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import type { GuestEntry } from './useGuestLog';

const PAGE_SIZE = 25;

export interface GuestSearchFilters {
  query: string;
  dateFrom: string | null;
  dateTo: string | null;
}

export function useGuestSearch() {
  const { profile } = useOpsAuth();
  const [results, setResults] = useState<GuestEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [filters, setFilters] = useState<GuestSearchFilters>({ query: '', dateFrom: null, dateTo: null });

  const buildQuery = useCallback((f: GuestSearchFilters, pageNum: number) => {
    let q = supabase
      .from('ops_guest_log')
      .select('*', { count: 'exact' })
      .order('check_in_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (f.query.trim()) {
      const s = f.query.trim();
      // Search by name (ilike), phone (ilike), or room_id (ilike)
      q = q.or(`guest_name.ilike.%${s}%,phone.ilike.%${s}%,room_id.ilike.%${s}%`);
    }

    if (f.dateFrom) {
      q = q.gte('check_in_at', f.dateFrom);
    }
    if (f.dateTo) {
      // Add end of day
      q = q.lte('check_in_at', f.dateTo + 'T23:59:59');
    }

    return q;
  }, []);

  const search = useCallback(async (f: GuestSearchFilters, pageNum = 0) => {
    if (!profile) return;
    setIsSearching(true);
    setFilters(f);
    setPage(pageNum);

    try {
      const { data, error, count } = await buildQuery(f, pageNum);
      if (error) throw error;

      const mapped = ((data || []) as unknown as GuestEntry[]).map(g => ({
        ...g,
        id_proof_urls: Array.isArray(g.id_proof_urls) ? g.id_proof_urls : [],
      }));

      setResults(mapped);
      setTotalCount(count);
      setHasMore(count !== null && (pageNum + 1) * PAGE_SIZE < count);
    } catch (e) {
      console.error('Guest search error:', e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [profile, buildQuery]);

  const nextPage = useCallback(() => {
    if (hasMore) search(filters, page + 1);
  }, [hasMore, filters, page, search]);

  const prevPage = useCallback(() => {
    if (page > 0) search(filters, page - 1);
  }, [page, filters, search]);

  const goToPage = useCallback((p: number) => {
    search(filters, p);
  }, [filters, search]);

  return {
    results,
    isSearching,
    search,
    page,
    hasMore,
    totalCount,
    totalPages: totalCount !== null ? Math.ceil(totalCount / PAGE_SIZE) : 0,
    nextPage,
    prevPage,
    goToPage,
    PAGE_SIZE,
    filters,
  };
}
