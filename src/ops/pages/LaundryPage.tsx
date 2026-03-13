import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import BulkActionBar from '../components/BulkActionBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, Package, ArrowDownToLine, AlertTriangle, Settings, Clock, CalendarDays, Trash2, Plus, Shirt, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInHours, differenceInDays, parseISO, addDays } from 'date-fns';

interface LaundryBatch {
  id: string;
  branch_id: string;
  sets_count: number;
  sent_at: string;
  sent_before_noon: boolean;
  expected_return_at: string;
  actual_return_at: string | null;
  status: string;
  sent_by: string;
  received_by: string | null;
  notes: string | null;
  created_at: string;
}

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

export default function LaundryPage() {
  const { profile, isAdmin } = useOpsAuth();
  const { t } = useOpsLanguage();
  const queryClient = useQueryClient();
  const branchId = profile?.branchId;

  const [sendSetsCount, setSendSetsCount] = useState(1);
  const [sendNotes, setSendNotes] = useState('');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

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

  // Fetch batches
  const { data: batches, isLoading } = useQuery({
    queryKey: ['ops_laundry_batches', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_laundry_batches')
        .select('*')
        .eq('branch_id', branchId!)
        .order('sent_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as LaundryBatch[];
    },
    enabled: !!branchId,
  });

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

  // Fetch upcoming guests
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

  const inTransit = useMemo(() => (batches || []).filter(b => b.status === 'in_transit'), [batches]);
  const returned = useMemo(() => (batches || []).filter(b => b.status === 'returned'), [batches]);
  const setsInLaundry = useMemo(() => inTransit.reduce((s, b) => s + b.sets_count, 0), [inTransit]);
  const setsAvailable = TOTAL_SETS - setsInLaundry;

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

  // Forecast
  const forecast = useMemo(() => {
    const days: Array<{ date: string; checkIns: number; checkOuts: number; returning: number; available: number }> = [];
    let running = setsAvailable;
    for (let d = 0; d < 7; d++) {
      const day = addDays(new Date(), d);
      const dayStr = format(day, 'yyyy-MM-dd');

      const returning = inTransit.filter(b => {
        return format(parseISO(b.expected_return_at), 'yyyy-MM-dd') === dayStr;
      }).reduce((s, b) => s + b.sets_count, 0);

      const checkIns = (upcomingGuests || []).filter(g => {
        const ci = g.expected_check_in || g.check_in_at;
        return ci && format(parseISO(ci), 'yyyy-MM-dd') === dayStr && g.status !== 'checked_out';
      }).length;

      const checkOuts = (upcomingGuests || []).filter(g => {
        return g.expected_check_out && format(parseISO(g.expected_check_out), 'yyyy-MM-dd') === dayStr;
      }).length;

      running += returning;
      running -= checkIns;
      days.push({ date: dayStr, checkIns, checkOuts, returning, available: running });
    }
    return days;
  }, [setsAvailable, inTransit, upcomingGuests]);

  const alerts = useMemo(() => forecast.filter(d => d.available < 0), [forecast]);

  // Send laundry mutation
  const sendMutation = useMutation({
    mutationFn: async ({ sets, notes }: { sets: number; notes: string }) => {
      const now = new Date();
      const istHour = now.getUTCHours() + 5.5;
      const beforeNoon = istHour < 12;
      const returnDate = addDays(now, beforeNoon ? TURNAROUND_DAYS : TURNAROUND_DAYS + 1);
      returnDate.setUTCHours(6, 30, 0, 0);

      const { error } = await supabase.from('ops_laundry_batches').insert({
        branch_id: branchId!, sets_count: sets,
        sent_at: now.toISOString(), sent_before_noon: beforeNoon,
        expected_return_at: returnDate.toISOString(),
        sent_by: profile!.userId, status: 'in_transit',
        notes: notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_laundry_batches'] });
      toast.success(t('laundry.sent'));
      setSendDialogOpen(false);
      setSendSetsCount(1);
      setSendNotes('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Receive laundry
  const receiveMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase.from('ops_laundry_batches').update({
        actual_return_at: new Date().toISOString(),
        status: 'returned',
        received_by: profile!.userId,
      } as any).eq('id', batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_laundry_batches'] });
      toast.success(t('laundry.received'));
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  if (isLoading || linensLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('laundry.title')}</h1>
        <div className="flex gap-2">
          {isAdmin && (
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
                    // Save set composition separately since it's JSON
                    saveConfigMutation.mutate(configs);
                    // Also save set composition
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
          )}
          <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Send className="h-4 w-4 mr-1" />{t('laundry.sendLaundry')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('laundry.sendLaundry')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('laundry.setsCount')}</label>
                  <Input type="number" value={sendSetsCount} onChange={e => setSendSetsCount(Number(e.target.value))} min={1} max={TOTAL_SETS} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('guest.notes')}</label>
                  <Input value={sendNotes} onChange={e => setSendNotes(e.target.value)} placeholder={t('inv.logNote')} />
                </div>
                <Button onClick={() => sendMutation.mutate({ sets: sendSetsCount, notes: sendNotes })} disabled={sendMutation.isPending} className="w-full">
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('laundry.confirmSend')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <div className="text-2xl font-bold text-primary">{setsAvailable}</div>
            <div className="text-xs text-muted-foreground">{t('laundry.available')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{setsInLaundry}</div>
            <div className="text-xs text-muted-foreground">{t('laundry.inLaundry')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <div className="text-2xl font-bold">{TOTAL_SETS}</div>
            <div className="text-xs text-muted-foreground">{t('laundry.totalSets')}</div>
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
          <TabsTrigger value="batches" className="flex-1 text-xs">
            <Package className="h-3 w-3 mr-1" /> Batches
            {inTransit.length > 0 && <Badge variant="secondary" className="ml-1 h-4 min-w-4 p-0 text-[8px] flex items-center justify-center rounded-full">{inTransit.length}</Badge>}
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

        {/* Batches Tab */}
        <TabsContent value="batches" className="space-y-3 mt-3">
          <h3 className="text-sm font-semibold flex items-center gap-1"><Clock className="h-4 w-4" /> {t('laundry.inTransit')}</h3>
          {isAdmin && selectedBatchIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedBatchIds.size}
              totalCount={inTransit.length}
              onSelectAll={() => setSelectedBatchIds(new Set(inTransit.map(b => b.id)))}
              onDeselectAll={() => setSelectedBatchIds(new Set())}
              actions={[{ label: 'Mark all received', value: 'receive' }]}
              onAction={async () => {
                setBulkPending(true);
                try {
                  const ids = Array.from(selectedBatchIds);
                  for (const id of ids) { await receiveMutation.mutateAsync(id); }
                  setSelectedBatchIds(new Set());
                  toast.success(`Received ${ids.length} batches`);
                } catch (e: any) { toast.error(e.message); }
                finally { setBulkPending(false); }
              }}
              isPending={bulkPending}
            />
          )}
          {inTransit.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('laundry.noneInTransit')}</p>
          ) : (
            <div className="space-y-2">
              {inTransit.map(batch => (
                <Card key={batch.id}>
                  <CardContent className="p-3 flex items-center gap-2">
                    {isAdmin && (
                      <Checkbox
                        checked={selectedBatchIds.has(batch.id)}
                        onCheckedChange={() => {
                          setSelectedBatchIds(prev => {
                            const next = new Set(prev);
                            if (next.has(batch.id)) next.delete(batch.id); else next.add(batch.id);
                            return next;
                          });
                        }}
                        className="shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{batch.sets_count} {t('laundry.sets')}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('laundry.sentBy')} {nameMap[batch.sent_by] || '?'} · {format(parseISO(batch.sent_at), 'MMM d, h:mm a')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('laundry.expectedBack')} {format(parseISO(batch.expected_return_at), 'MMM d, h:mm a')}
                      </div>
                      {batch.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{batch.notes}</div>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => receiveMutation.mutate(batch.id)} disabled={receiveMutation.isPending}>
                      <ArrowDownToLine className="h-3.5 w-3.5 mr-1" />{t('laundry.markReceived')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* History */}
          <h3 className="text-sm font-semibold mt-4">{t('guest.history')}</h3>
          {returned.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('laundry.noHistory')}</p>
          ) : (
            returned.slice(0, 20).map(batch => (
              <Card key={batch.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{batch.sets_count} {t('laundry.sets')}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('laundry.sentBy')} {nameMap[batch.sent_by] || '?'} · {format(parseISO(batch.sent_at), 'MMM d')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('laundry.receivedAt')} {batch.actual_return_at ? format(parseISO(batch.actual_return_at), 'MMM d, h:mm a') : '-'}
                        {batch.received_by && ` · ${nameMap[batch.received_by] || '?'}`}
                      </div>
                    </div>
                    <Badge variant="secondary">{t('laundry.returned')}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="mt-3">
          <div className="space-y-1">
            <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground px-2 pb-1 border-b">
              <div>{t('laundry.date')}</div>
              <div className="text-center">{t('laundry.checkIns')}</div>
              <div className="text-center">{t('laundry.checkOuts')}</div>
              <div className="text-center">{t('laundry.returning')}</div>
              <div className="text-center">{t('laundry.availableSets')}</div>
            </div>
            {forecast.map(day => (
              <div key={day.date} className={`grid grid-cols-5 text-sm px-2 py-1.5 rounded ${day.available < 0 ? 'bg-destructive/10' : day.available <= 1 ? 'bg-orange-500/10' : ''}`}>
                <div className="font-medium">{format(parseISO(day.date), 'EEE, MMM d')}</div>
                <div className="text-center">{day.checkIns || '-'}</div>
                <div className="text-center">{day.checkOuts || '-'}</div>
                <div className="text-center">{day.returning || '-'}</div>
                <div className={`text-center font-bold ${day.available < 0 ? 'text-destructive' : day.available <= 1 ? 'text-orange-500' : 'text-green-600'}`}>
                  {day.available}
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
                  {format(parseISO(a.date), 'EEE, MMM d')}: Short by {Math.abs(a.available)} set(s)
                </p>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Linen Tracker Component ─── */
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
  const [newType, setNewType] = useState('Bedsheet');
  const [newLabel, setNewLabel] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Group linens by status
  const grouped = useMemo(() => {
    const groups: Record<string, LinenItem[]> = {
      in_use: [],
      need_laundry: [],
      awaiting_return: [],
      fresh: [],
    };
    for (const l of linens) {
      if (groups[l.status]) groups[l.status].push(l);
      else groups[l.status] = [l];
    }
    return groups;
  }, [linens]);

  const filteredStatuses = statusFilter === 'all' 
    ? ['in_use', 'need_laundry', 'awaiting_return', 'fresh'] 
    : [statusFilter];

  const handleAdd = () => {
    onAdd({ item_type: newType, item_label: newLabel || undefined });
    setNewLabel('');
    setShowAdd(false);
  };

  // Next status mapping for quick transitions
  const getNextStatuses = (current: string): string[] => {
    switch (current) {
      case 'fresh': return ['in_use'];
      case 'in_use': return ['need_laundry'];
      case 'need_laundry': return ['awaiting_return'];
      case 'awaiting_return': return ['fresh'];
      default: return [];
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
              <div className="text-lg font-bold">{grouped[s]?.length || 0}</div>
              <div className="text-[9px] font-medium leading-tight">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Add button */}
      <Button onClick={() => setShowAdd(true)} variant="outline" className="w-full text-xs gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add Linen Item
      </Button>

      {showAdd && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LINEN_TYPES.map(lt => <SelectItem key={lt} value={lt}>{lt}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="Label (optional, e.g. #1, Blue)" className="text-xs h-8"
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 text-xs" onClick={handleAdd} disabled={addPending}>
                {addPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped linen items */}
      {filteredStatuses.map(status => {
        const items = grouped[status] || [];
        if (items.length === 0) return null;
        const cfg = STATUS_CONFIG[status];

        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">{cfg.emoji}</span>
              <h3 className="text-sm font-semibold">{cfg.label}</h3>
              <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
            </div>
            <div className="space-y-1">
              {items.map(item => (
                <LinenItemCard
                  key={item.id}
                  item={item}
                  nameMap={nameMap}
                  rooms={rooms}
                  onUpdateStatus={onUpdateStatus}
                  onDelete={onDelete}
                  nextStatuses={getNextStatuses(item.status)}
                />
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
            <p className="text-xs text-muted-foreground">Add items to start tracking their laundry lifecycle.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Individual Linen Item Card ─── */
function LinenItemCard({
  item,
  nameMap,
  rooms,
  onUpdateStatus,
  onDelete,
  nextStatuses,
}: {
  item: LinenItem;
  nameMap: Record<string, string>;
  rooms: any[];
  onUpdateStatus: (payload: { id: string; status: string; room_id?: string | null; guest_id?: string | null; expected_free_at?: string | null; notes?: string | null }) => void;
  onDelete: (id: string) => void;
  nextStatuses: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [assignRoom, setAssignRoom] = useState(item.room_id || '');

  const handleQuickTransition = (newStatus: string) => {
    const payload: any = { id: item.id, status: newStatus };
    
    // If transitioning to fresh, clear room assignment
    if (newStatus === 'fresh') {
      payload.room_id = null;
      payload.guest_id = null;
      payload.expected_free_at = null;
    }
    
    // If assigning to in_use and a room is selected
    if (newStatus === 'in_use' && assignRoom) {
      payload.room_id = assignRoom;
    }
    
    onUpdateStatus(payload);
    setExpanded(false);
  };

  const handleFullStatusChange = (newStatus: string) => {
    onUpdateStatus({ id: item.id, status: newStatus });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-2.5">
        <div className="flex items-center gap-2">
          <button className="flex-1 text-left" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs">{item.item_type}</span>
              {item.item_label && <span className="text-[10px] text-muted-foreground">({item.item_label})</span>}
              {item.room_id && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">{item.room_id}</Badge>
              )}
            </div>
            {item.expected_free_at && item.status === 'in_use' && (
              <p className="text-[10px] text-muted-foreground">
                Until {format(parseISO(item.expected_free_at), 'MMM d')}
              </p>
            )}
          </button>

          {/* Quick transition buttons */}
          <div className="flex gap-1 shrink-0">
            {nextStatuses.map(ns => {
              const cfg = STATUS_CONFIG[ns];
              return (
                <Button
                  key={ns}
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[9px] px-1.5 gap-0.5"
                  onClick={(e) => { e.stopPropagation(); handleQuickTransition(ns); }}
                  title={`Move to ${cfg.label}`}
                >
                  {cfg.emoji} {cfg.label.split(' ')[0]}
                </Button>
              );
            })}
          </div>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-border space-y-2">
            <div className="text-[10px] text-muted-foreground">
              Last changed: {format(parseISO(item.status_changed_at), 'MMM d, h:mm a')}
              {item.status_changed_by && ` by ${nameMap[item.status_changed_by] || '?'}`}
            </div>

            {/* Room assignment for in_use */}
            {item.status === 'fresh' && (
              <div className="flex gap-1 items-center">
                <Select value={assignRoom} onValueChange={setAssignRoom}>
                  <SelectTrigger className="h-7 text-[10px] flex-1"><SelectValue placeholder="Assign room" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-7 text-[10px]" onClick={() => handleQuickTransition('in_use')}>
                  Issue to Room
                </Button>
              </div>
            )}

            {/* Manual status change */}
            <div className="flex gap-1 flex-wrap">
              {LINEN_STATUSES.filter(s => s !== item.status).map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <Button
                    key={s} size="sm" variant="outline"
                    className="h-6 text-[9px] px-2 gap-0.5"
                    onClick={() => handleFullStatusChange(s)}
                  >
                    {cfg.emoji} {cfg.label}
                  </Button>
                );
              })}
              <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 text-destructive" onClick={() => onDelete(item.id)}>
                <Trash2 className="h-3 w-3" /> Remove
              </Button>
            </div>

            {item.notes && <p className="text-[10px] text-muted-foreground italic">{item.notes}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
