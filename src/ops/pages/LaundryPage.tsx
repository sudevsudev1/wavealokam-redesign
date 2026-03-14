import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, Settings, CalendarDays, Plus, Shirt, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, addDays } from 'date-fns';

interface LinenItem {
  id: string;
  branch_id: string;
  item_type: string;
  item_label: string | null;
  room_id: string | null;
  guest_id: string | null;
  status: string;
  expected_free_at: string | null;
  status_changed_at: string;
  status_changed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const LINEN_TYPES = ['Bedsheet', 'Pillow Cover', 'Towel', 'Bath Towel', 'Hand Towel', 'Blanket', 'Duvet Cover', 'Mattress Protector'] as const;

const DEFAULT_SET_COMPOSITION: Record<string, number> = {
  'Bedsheet': 1,
  'Pillow Cover': 2,
  'Towel': 1,
  'Bath Towel': 1,
  'Hand Towel': 1,
  'Blanket': 1,
  'Duvet Cover': 1,
  'Mattress Protector': 1,
};
const LINEN_STATUSES = ['fresh', 'in_use', 'need_laundry', 'awaiting_return'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  fresh: { label: 'Fresh / Ready', color: 'bg-green-100 text-green-800', emoji: '✅' },
  in_use: { label: 'In Use', color: 'bg-blue-100 text-blue-800', emoji: '🛏️' },
  need_laundry: { label: 'Need Laundry', color: 'bg-orange-100 text-orange-800', emoji: '🧺' },
  awaiting_return: { label: 'Awaiting Return', color: 'bg-purple-100 text-purple-800', emoji: '⏳' },
};

const DEFAULT_TOTAL_SETS = 8;
const DEFAULT_TURNAROUND_DAYS = 2;
const DEFAULT_TOTAL_ROOMS = 5;

// Reverse map: inventory item name → linen item_type
const INVENTORY_TO_LINEN_TYPE: Record<string, string> = {
  'Bed Sheet (Double)': 'Bedsheet',
  'Bed Sheet (Single)': 'Duvet Cover',
  'Pillow Cover': 'Pillow Cover',
  'Hand Towel': 'Hand Towel',
  'Bath Towel (Large)': 'Bath Towel',
  'Blanket': 'Blanket',
  'Bath Mat': 'Mattress Protector',
  'Towel': 'Towel',
};

export default function LaundryPage() {
  const { profile, isAdmin } = useOpsAuth();
  const { t } = useOpsLanguage();
  const queryClient = useQueryClient();
  const branchId = profile?.branchId;

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch config
  const { data: configData } = useQuery({
    queryKey: ['ops_config_registry', 'laundry', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ops_config_registry')
        .select('key, value_json')
        .eq('branch_id', branchId!)
        .in('key', ['laundry_total_sets', 'laundry_turnaround_days', 'laundry_total_rooms', 'laundry_set_composition']);
      const map: Record<string, any> = {};
      (data || []).forEach(r => { map[r.key] = r.value_json; });
      return map;
    },
    enabled: !!branchId,
  });

  const TOTAL_SETS = (configData?.laundry_total_sets as number) || DEFAULT_TOTAL_SETS;
  const TURNAROUND_DAYS = (configData?.laundry_turnaround_days as number) || DEFAULT_TURNAROUND_DAYS;
  const TOTAL_ROOMS = (configData?.laundry_total_rooms as number) || DEFAULT_TOTAL_ROOMS;
  const SET_COMPOSITION: Record<string, number> = (configData?.laundry_set_composition as Record<string, number>) || DEFAULT_SET_COMPOSITION;

  // Fetch linen items
  const { data: linens = [], isLoading: linensLoading } = useQuery({
    queryKey: ['ops_linen_items', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_linen_items')
        .select('*')
        .eq('branch_id', branchId!)
        .order('item_type', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LinenItem[];
    },
    enabled: !!branchId,
  });

  // Realtime for linen items
  useEffect(() => {
    const channel = supabase
      .channel('ops_linen_items_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_linen_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ops_linen_items'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Fetch profiles
  const { data: profiles } = useQuery({
    queryKey: ['ops_user_profiles', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ops_user_profiles')
        .select('user_id, display_name')
        .eq('branch_id', branchId!);
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch upcoming guests for forecast
  const { data: upcomingGuests } = useQuery({
    queryKey: ['ops_guest_forecast', branchId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const future = addDays(new Date(), 7).toISOString();
      const { data } = await supabase
        .from('ops_guest_log')
        .select('id, guest_name, room_id, check_in_at, expected_check_in, expected_check_out, status')
        .eq('branch_id', branchId!)
        .or(`status.eq.checked_in,and(expected_check_in.gte.${now},expected_check_in.lte.${future})`);
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['ops_rooms', branchId],
    queryFn: async () => {
      const { data } = await supabase.from('ops_rooms').select('*').eq('branch_id', branchId!).eq('is_active', true);
      return data || [];
    },
    enabled: !!branchId,
  });

  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    (profiles || []).forEach(p => { m[p.user_id] = p.display_name; });
    return m;
  }, [profiles]);

  // Linen stats
  const linenStats = useMemo(() => {
    const stats = { fresh: 0, in_use: 0, need_laundry: 0, awaiting_return: 0, total: linens.length };
    for (const l of linens) {
      if (stats[l.status as keyof typeof stats] !== undefined) {
        (stats as any)[l.status]++;
      }
    }
    return stats;
  }, [linens]);

  // Forecast based on linen items instead of batches
  const forecast = useMemo(() => {
    const days: Array<{ date: string; checkIns: number; checkOuts: number; freshAvailable: number }> = [];
    let runningFresh = linenStats.fresh;
    // Count sets: fresh items / items-per-set
    const totalItemsPerSet = Object.values(SET_COMPOSITION).reduce((s, v) => s + v, 0) || 1;

    for (let d = 0; d < 7; d++) {
      const day = addDays(new Date(), d);
      const dayStr = format(day, 'yyyy-MM-dd');

      const checkIns = (upcomingGuests || []).filter(g => {
        const ci = g.expected_check_in || g.check_in_at;
        return ci && format(parseISO(ci), 'yyyy-MM-dd') === dayStr && g.status !== 'checked_out';
      }).length;

      const checkOuts = (upcomingGuests || []).filter(g => {
        return g.expected_check_out && format(parseISO(g.expected_check_out), 'yyyy-MM-dd') === dayStr;
      }).length;

      // Each check-in uses 1 set worth of items, check-outs return after turnaround
      if (d === 0) {
        // Current day: use actual fresh count
      } else {
        runningFresh -= checkIns * totalItemsPerSet;
        // Items from checkouts d-TURNAROUND_DAYS ago come back
        const returnDay = addDays(new Date(), d - TURNAROUND_DAYS);
        const returnDayStr = format(returnDay, 'yyyy-MM-dd');
        const returningCheckouts = (upcomingGuests || []).filter(g => {
          return g.expected_check_out && format(parseISO(g.expected_check_out), 'yyyy-MM-dd') === returnDayStr;
        }).length;
        runningFresh += returningCheckouts * totalItemsPerSet;
      }

      days.push({
        date: dayStr,
        checkIns,
        checkOuts,
        freshAvailable: Math.floor(runningFresh / totalItemsPerSet),
      });
    }
    return days;
  }, [linenStats.fresh, SET_COMPOSITION, upcomingGuests, TURNAROUND_DAYS]);

  const alerts = useMemo(() => forecast.filter(d => d.freshAvailable < 0), [forecast]);

  // Linen mutations
  const addLinenMutation = useMutation({
    mutationFn: async (payload: { item_type: string; item_label?: string; room_id?: string; status?: string }) => {
      const { error } = await supabase.from('ops_linen_items').insert({
        branch_id: branchId!,
        item_type: payload.item_type,
        item_label: payload.item_label || null,
        room_id: payload.room_id || null,
        status: payload.status || 'fresh',
        status_changed_by: profile!.userId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_linen_items'] });
      toast.success('Linen item added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLinenStatusMutation = useMutation({
    mutationFn: async ({ id, status, room_id, guest_id, expected_free_at, notes }: {
      id: string; status: string; room_id?: string | null; guest_id?: string | null;
      expected_free_at?: string | null; notes?: string | null;
    }) => {
      const { error } = await supabase.from('ops_linen_items').update({
        status,
        room_id: room_id !== undefined ? room_id : undefined,
        guest_id: guest_id !== undefined ? guest_id : undefined,
        expected_free_at: expected_free_at !== undefined ? expected_free_at : undefined,
        status_changed_at: new Date().toISOString(),
        status_changed_by: profile!.userId,
        notes: notes !== undefined ? notes : undefined,
        updated_at: new Date().toISOString(),
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_linen_items'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLinenMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_linen_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_linen_items'] });
      toast.success('Linen item removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Reconcile mutation ──
  // Reads inventory items (Linens category) and transactions to reconcile linen lifecycle
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      if (!branchId || !profile) throw new Error('Not authenticated');
      const now = new Date().toISOString();

      // 1. Get all Linens inventory items with current stock
      const { data: inventoryLinens } = await supabase
        .from('ops_inventory_items')
        .select('id, name_en, current_stock')
        .eq('branch_id', branchId)
        .eq('category', 'Linens')
        .eq('is_active', true);

      if (!inventoryLinens || inventoryLinens.length === 0) {
        toast.info('No linen inventory items found');
        return { created: 0, updated: 0 };
      }

      // 2. Get all current linen items
      const { data: currentLinens } = await supabase
        .from('ops_linen_items')
        .select('*')
        .eq('branch_id', branchId);

      const existingLinens = (currentLinens || []) as unknown as LinenItem[];

      // 3. Get issued transactions (out, refill) for linens to determine what's in_use
      const linenItemIds = inventoryLinens.map(i => i.id);
      const { data: issueTxns } = await supabase
        .from('ops_inventory_transactions')
        .select('item_id, quantity, type, notes, created_at')
        .eq('branch_id', branchId)
        .in('item_id', linenItemIds)
        .in('type', ['out', 'refill'])
        .order('created_at', { ascending: true });

      // 4. Get checked-in guests with rooms to determine which rooms have linens in_use
      const { data: activeGuests } = await supabase
        .from('ops_guest_log')
        .select('room_id')
        .eq('branch_id', branchId)
        .eq('status', 'checked_in');

      const occupiedRooms = new Set((activeGuests || []).map(g => g.room_id).filter(Boolean));

      let created = 0;
      let updated = 0;

      for (const invItem of inventoryLinens) {
        const linenType = INVENTORY_TO_LINEN_TYPE[invItem.name_en as string];
        if (!linenType) continue;

        const currentStock = (invItem as any).current_stock as number;

        // Sum total issued for this item
        const totalIssued = (issueTxns || [])
          .filter(tx => tx.item_id === invItem.id)
          .reduce((sum, tx) => sum + Math.abs(tx.quantity as number), 0);

        // Existing linen items of this type
        const existing = existingLinens.filter(l => l.item_type === linenType);
        const totalNeeded = currentStock + totalIssued; // Total linens that should exist

        // Create missing linen items if total tracked < total needed
        if (existing.length < totalNeeded) {
          const toCreate = totalNeeded - existing.length;
          for (let i = 0; i < toCreate; i++) {
            await supabase.from('ops_linen_items').insert({
              branch_id: branchId,
              item_type: linenType,
              status: 'fresh',
              status_changed_at: now,
              status_changed_by: profile.userId,
            } as any);
            created++;
          }
        }

        // Re-fetch after creation to get all IDs
        const { data: allOfType } = await supabase
          .from('ops_linen_items')
          .select('id, status, room_id')
          .eq('branch_id', branchId)
          .eq('item_type', linenType)
          .order('created_at', { ascending: true });

        if (!allOfType) continue;

        // Reconcile statuses:
        // - Items matching current_stock count should be 'fresh' (in inventory = not issued)
        // - Items issued to occupied rooms should be 'in_use'
        // - Items issued to unoccupied rooms should be 'need_laundry'
        // We process from oldest to newest

        // Parse room assignments from issue transactions
        const roomIssues: Array<{ room: string; qty: number }> = [];
        for (const tx of (issueTxns || []).filter(t => t.item_id === invItem.id)) {
          const roomMatch = (tx.notes as string)?.match(/(?:Room\s*)(\w+)/i);
          if (roomMatch) {
            roomIssues.push({ room: roomMatch[1], qty: Math.abs(tx.quantity as number) });
          } else {
            roomIssues.push({ room: '', qty: Math.abs(tx.quantity as number) });
          }
        }

        // Determine how many should be in each status
        let issuedCount = totalIssued;
        let freshCount = currentStock;
        
        // Start assigning statuses
        let idx = 0;
        
        // First: assign 'fresh' to items matching remaining inventory stock
        for (let i = 0; i < Math.min(freshCount, allOfType.length); i++) {
          const item = allOfType[idx];
          if (item && item.status !== 'fresh') {
            await supabase.from('ops_linen_items').update({
              status: 'fresh',
              room_id: null,
              guest_id: null,
              status_changed_at: now,
              status_changed_by: profile.userId,
            } as any).eq('id', item.id);
            updated++;
          }
          idx++;
        }

        // Remaining items are issued - determine in_use vs need_laundry
        for (const issue of roomIssues) {
          if (idx >= allOfType.length) break;
          for (let q = 0; q < issue.qty && idx < allOfType.length; q++) {
            const item = allOfType[idx];
            const isOccupied = issue.room && occupiedRooms.has(issue.room);
            const targetStatus = isOccupied ? 'in_use' : 'need_laundry';
            
            if (item.status !== targetStatus || item.room_id !== (issue.room || null)) {
              await supabase.from('ops_linen_items').update({
                status: targetStatus,
                room_id: issue.room || null,
                status_changed_at: now,
                status_changed_by: profile.userId,
              } as any).eq('id', item.id);
              updated++;
            }
            idx++;
          }
        }

        // Any remaining unaccounted issued items → need_laundry
        while (idx < allOfType.length) {
          const item = allOfType[idx];
          if (item.status !== 'need_laundry') {
            await supabase.from('ops_linen_items').update({
              status: 'need_laundry',
              room_id: null,
              status_changed_at: now,
              status_changed_by: profile.userId,
            } as any).eq('id', item.id);
            updated++;
          }
          idx++;
        }
      }

      return { created, updated };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ops_linen_items'] });
      if (result) {
        toast.success(`Reconciled: ${result.created} created, ${result.updated} updated`);
      }
    },
    onError: (e: any) => toast.error(`Reconciliation failed: ${e.message}`),
  });

  // Save config (admin only)
  const saveConfigMutation = useMutation({
    mutationFn: async (configs: Record<string, number>) => {
      for (const [key, value] of Object.entries(configs)) {
        const { error } = await supabase.from('ops_config_registry').upsert({
          key, value_json: value as any,
          branch_id: branchId!, updated_by: profile!.userId,
        } as any, { onConflict: 'key,branch_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_config_registry'] });
      toast.success(t('laundry.configSaved'));
      setSettingsOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [editSets, setEditSets] = useState(TOTAL_SETS);
  const [editTurnaround, setEditTurnaround] = useState(TURNAROUND_DAYS);
  const [editRooms, setEditRooms] = useState(TOTAL_ROOMS);
  const [editSetComposition, setEditSetComposition] = useState<Record<string, number>>(SET_COMPOSITION);

  if (linensLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('laundry.title')}</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reconcileMutation.mutate()}
                disabled={reconcileMutation.isPending}
              >
                {reconcileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Reconcile
              </Button>
              <Dialog open={settingsOpen} onOpenChange={(o) => { setSettingsOpen(o); if (o) { setEditSets(TOTAL_SETS); setEditTurnaround(TURNAROUND_DAYS); setEditRooms(TOTAL_ROOMS); setEditSetComposition({...SET_COMPOSITION}); } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />{t('laundry.settings')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t('laundry.settings')}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">{t('laundry.totalSets')}</label>
                      <Input type="number" value={editSets} onChange={e => setEditSets(Number(e.target.value))} min={1} />
                      <p className="text-xs text-muted-foreground mt-1">{t('laundry.totalSetsHelp')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('laundry.turnaroundDays')}</label>
                      <Input type="number" value={editTurnaround} onChange={e => setEditTurnaround(Number(e.target.value))} min={1} />
                      <p className="text-xs text-muted-foreground mt-1">{t('laundry.turnaroundHelp')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('laundry.totalRooms')}</label>
                      <Input type="number" value={editRooms} onChange={e => setEditRooms(Number(e.target.value))} min={1} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Items in a Set</label>
                      <p className="text-xs text-muted-foreground mb-2">Define what linen items make up one complete set.</p>
                      <div className="space-y-1.5 border border-border rounded-md p-2">
                        {LINEN_TYPES.map(lt => {
                          const qty = editSetComposition[lt] || 0;
                          return (
                            <div key={lt} className="flex items-center justify-between text-xs">
                              <span>{lt}</span>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="outline" className="h-5 w-5 p-0" onClick={() => setEditSetComposition(prev => ({ ...prev, [lt]: Math.max(0, (prev[lt] || 0) - 1) }))}>−</Button>
                                <span className="w-6 text-center font-mono">{qty}</span>
                                <Button size="sm" variant="outline" className="h-5 w-5 p-0" onClick={() => setEditSetComposition(prev => ({ ...prev, [lt]: (prev[lt] || 0) + 1 }))}>+</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Button onClick={() => {
                      const configs: Record<string, any> = {
                        laundry_total_sets: editSets,
                        laundry_turnaround_days: editTurnaround,
                        laundry_total_rooms: editRooms,
                      };
                      saveConfigMutation.mutate(configs);
                      supabase.from('ops_config_registry').upsert({
                        key: 'laundry_set_composition',
                        value_json: editSetComposition as any,
                        branch_id: branchId!,
                        updated_by: profile!.userId,
                      } as any, { onConflict: 'key,branch_id' }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['ops_config_registry'] });
                      });
                    }} disabled={saveConfigMutation.isPending} className="w-full">
                      {saveConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('inv.save')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards — linen-focused */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <div className="text-2xl font-bold text-green-600">{linenStats.fresh}</div>
            <div className="text-xs text-muted-foreground">Fresh / Ready</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{linenStats.in_use}</div>
            <div className="text-xs text-muted-foreground">In Use</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{linenStats.need_laundry}</div>
            <div className="text-xs text-muted-foreground">Need Laundry</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <div className={`text-2xl font-bold ${alerts.length > 0 ? 'text-destructive' : 'text-green-600'}`}>{alerts.length > 0 ? '⚠️' : '✅'}</div>
            <div className="text-xs text-muted-foreground">{alerts.length > 0 ? t('laundry.shortageAlert') : t('laundry.allGood')}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="linens">
        <TabsList className="w-full flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="linens" className="flex-1 text-xs">
            <Shirt className="h-3 w-3 mr-1" /> Linens
            {linenStats.need_laundry > 0 && <Badge variant="destructive" className="ml-1 h-4 min-w-4 p-0 text-[8px] flex items-center justify-center rounded-full">{linenStats.need_laundry}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex-1 text-xs">
            <CalendarDays className="h-3 w-3 mr-1" /> Forecast
          </TabsTrigger>
        </TabsList>

        {/* Linens Tab */}
        <TabsContent value="linens" className="mt-3">
          <LinenTracker
            linens={linens}
            rooms={rooms}
            nameMap={nameMap}
            onAdd={(payload) => addLinenMutation.mutate(payload)}
            onUpdateStatus={(payload) => updateLinenStatusMutation.mutate(payload)}
            onDelete={(id) => deleteLinenMutation.mutate(id)}
            addPending={addLinenMutation.isPending}
            profile={profile}
          />
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="mt-3">
          <div className="space-y-1">
            <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground px-2 pb-1 border-b">
              <div>{t('laundry.date')}</div>
              <div className="text-center">{t('laundry.checkIns')}</div>
              <div className="text-center">{t('laundry.checkOuts')}</div>
              <div className="text-center">Fresh Sets</div>
            </div>
            {forecast.map(day => (
              <div key={day.date} className={`grid grid-cols-4 text-sm px-2 py-1.5 rounded ${day.freshAvailable < 0 ? 'bg-destructive/10' : day.freshAvailable <= 1 ? 'bg-orange-500/10' : ''}`}>
                <div className="font-medium">{format(parseISO(day.date), 'EEE, MMM d')}</div>
                <div className="text-center">{day.checkIns || '-'}</div>
                <div className="text-center">{day.checkOuts || '-'}</div>
                <div className={`text-center font-bold ${day.freshAvailable < 0 ? 'text-destructive' : day.freshAvailable <= 1 ? 'text-orange-500' : 'text-green-600'}`}>
                  {day.freshAvailable}
                </div>
              </div>
            ))}
          </div>
          {alerts.length > 0 && (
            <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-1.5 text-destructive font-medium text-sm mb-1">
                <AlertTriangle className="h-4 w-4" /> {t('laundry.shortageWarning')}
              </div>
              {alerts.map(a => (
                <p key={a.date} className="text-xs text-destructive/80">
                  {format(parseISO(a.date), 'EEE, MMM d')}: Short by {Math.abs(a.freshAvailable)} set(s)
                </p>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Linen Tracker Component (Grouped by Type) ─── */
function LinenTracker({
  linens,
  rooms,
  nameMap,
  onAdd,
  onUpdateStatus,
  onDelete,
  addPending,
  profile,
}: {
  linens: LinenItem[];
  rooms: any[];
  nameMap: Record<string, string>;
  onAdd: (payload: { item_type: string; item_label?: string; room_id?: string; status?: string }) => void;
  onUpdateStatus: (payload: { id: string; status: string; room_id?: string | null; guest_id?: string | null; expected_free_at?: string | null; notes?: string | null }) => void;
  onDelete: (id: string) => void;
  addPending: boolean;
  profile: any;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [batchItems, setBatchItems] = useState<Record<string, { selected: boolean; quantity: number; label: string }>>(() => {
    const init: Record<string, { selected: boolean; quantity: number; label: string }> = {};
    for (const lt of LINEN_TYPES) {
      init[lt] = { selected: false, quantity: 1, label: '' };
    }
    return init;
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignRoom, setAssignRoom] = useState('');

  const groupedByStatus = useMemo(() => {
    const result: Record<string, Record<string, LinenItem[]>> = {};
    for (const s of LINEN_STATUSES) {
      result[s] = {};
    }
    for (const l of linens) {
      if (!result[l.status]) result[l.status] = {};
      if (!result[l.status][l.item_type]) result[l.status][l.item_type] = [];
      result[l.status][l.item_type].push(l);
    }
    return result;
  }, [linens]);

  const statusTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const s of LINEN_STATUSES) {
      totals[s] = linens.filter(l => l.status === s).length;
    }
    return totals;
  }, [linens]);

  const filteredStatuses = statusFilter === 'all' 
    ? ['fresh', 'in_use', 'need_laundry', 'awaiting_return'] 
    : [statusFilter];

  const selectedCount = Object.values(batchItems).filter(v => v.selected).length;

  const handleBatchAdd = () => {
    const toAdd = Object.entries(batchItems).filter(([, v]) => v.selected && v.quantity > 0);
    if (toAdd.length === 0) { toast.error('Select at least one item'); return; }
    for (const [type, val] of toAdd) {
      for (let i = 0; i < val.quantity; i++) {
        onAdd({ item_type: type });
      }
    }
    setBatchItems(prev => {
      const reset = { ...prev };
      for (const key of Object.keys(reset)) {
        reset[key] = { selected: false, quantity: 1, label: '' };
      }
      return reset;
    });
    setShowAdd(false);
    toast.success(`Added ${toAdd.reduce((s, [, v]) => s + v.quantity, 0)} linen item(s)`);
  };

  const handleTransitionOne = (itemType: string, fromStatus: string, toStatus: string, roomId?: string) => {
    const items = groupedByStatus[fromStatus]?.[itemType] || [];
    if (items.length === 0) return;
    const item = items[0];
    const payload: any = { id: item.id, status: toStatus };
    if (toStatus === 'fresh') {
      payload.room_id = null;
      payload.guest_id = null;
      payload.expected_free_at = null;
    }
    if (toStatus === 'in_use' && roomId) {
      payload.room_id = roomId;
    }
    onUpdateStatus(payload);
  };

  const getNextStatus = (current: string): string | null => {
    switch (current) {
      case 'fresh': return 'in_use';
      case 'in_use': return 'need_laundry';
      case 'need_laundry': return 'awaiting_return';
      case 'awaiting_return': return 'fresh';
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-1.5">
        {(['fresh', 'in_use', 'need_laundry', 'awaiting_return'] as const).map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}
              className={`p-2 rounded-lg text-center transition-all ${statusFilter === s ? 'ring-2 ring-primary' : ''} ${cfg.color}`}
            >
              <div className="text-lg font-bold">{statusTotals[s] || 0}</div>
              <div className="text-[9px] font-medium leading-tight">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Add button */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Linen Items
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Add Linen Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {LINEN_TYPES.map(lt => {
              const item = batchItems[lt];
              return (
                <div key={lt} className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${item.selected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={(checked) => setBatchItems(prev => ({ ...prev, [lt]: { ...prev[lt], selected: !!checked } }))}
                  />
                  <span className="text-sm font-medium flex-1">{lt}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon" className="h-6 w-6"
                      disabled={!item.selected || item.quantity <= 1}
                      onClick={() => setBatchItems(prev => ({ ...prev, [lt]: { ...prev[lt], quantity: Math.max(1, prev[lt].quantity - 1) } }))}
                    >−</Button>
                    <span className="text-sm font-mono w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline" size="icon" className="h-6 w-6"
                      disabled={!item.selected}
                      onClick={() => setBatchItems(prev => ({ ...prev, [lt]: { ...prev[lt], quantity: prev[lt].quantity + 1 } }))}
                    >+</Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1 text-xs" onClick={handleBatchAdd} disabled={addPending || selectedCount === 0}>
              {addPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `Add ${selectedCount} Type${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grouped linen items by status → type */}
      {filteredStatuses.map(status => {
        const typeMap = groupedByStatus[status] || {};
        const types = Object.entries(typeMap).filter(([, items]) => items.length > 0);
        if (types.length === 0) return null;
        const cfg = STATUS_CONFIG[status];
        const nextStatus = getNextStatus(status);
        const nextCfg = nextStatus ? STATUS_CONFIG[nextStatus] : null;

        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">{cfg.emoji}</span>
              <h3 className="text-sm font-semibold">{cfg.label}</h3>
              <Badge variant="secondary" className="text-[10px]">{statusTotals[status]}</Badge>
            </div>
            <div className="space-y-1">
              {types.map(([itemType, items]) => (
                <Card key={itemType} className="overflow-hidden">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs">{itemType}</span>
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold">{items.length}</Badge>
                        </div>
                      </div>

                      {/* Quick transition: move 1 item to next status */}
                      {nextStatus && nextCfg && (
                        <div className="flex items-center gap-1 shrink-0">
                          {status === 'fresh' && (
                            <Select value={assignRoom} onValueChange={setAssignRoom}>
                              <SelectTrigger className="h-6 text-[9px] w-16"><SelectValue placeholder="Room" /></SelectTrigger>
                              <SelectContent>
                                {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[9px] px-1.5 gap-0.5"
                            onClick={() => handleTransitionOne(itemType, status, nextStatus, status === 'fresh' ? assignRoom : undefined)}
                            title={`Move 1 to ${nextCfg.label}`}
                          >
                            {nextCfg.emoji} →{nextCfg.label.split(' ')[0]}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {linens.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Shirt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No linen items tracked yet.</p>
            <p className="text-xs text-muted-foreground">Use the Reconcile button to sync from inventory, or add items manually.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
