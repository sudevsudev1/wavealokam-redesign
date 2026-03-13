import { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, Package, ArrowDownToLine, AlertTriangle, Settings, Clock, CalendarDays, Trash2 } from 'lucide-react';
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

// Default constants — admin can override via config registry
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
        .in('key', ['laundry_total_sets', 'laundry_turnaround_days', 'laundry_total_rooms']);
      const map: Record<string, any> = {};
      (data || []).forEach(r => { map[r.key] = r.value_json; });
      return map;
    },
    enabled: !!branchId,
  });

  const TOTAL_SETS = (configData?.laundry_total_sets as number) || DEFAULT_TOTAL_SETS;
  const TURNAROUND_DAYS = (configData?.laundry_turnaround_days as number) || DEFAULT_TURNAROUND_DAYS;
  const TOTAL_ROOMS = (configData?.laundry_total_rooms as number) || DEFAULT_TOTAL_ROOMS;

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

  // Fetch profiles for name resolution
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

  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    (profiles || []).forEach(p => { m[p.user_id] = p.display_name; });
    return m;
  }, [profiles]);

  const inTransit = useMemo(() => (batches || []).filter(b => b.status === 'in_transit'), [batches]);
  const returned = useMemo(() => (batches || []).filter(b => b.status === 'returned'), [batches]);
  const setsInLaundry = useMemo(() => inTransit.reduce((s, b) => s + b.sets_count, 0), [inTransit]);
  const setsAvailable = TOTAL_SETS - setsInLaundry;

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
      returnDate.setUTCHours(6, 30, 0, 0); // noon IST

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

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('laundry.title')}</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={settingsOpen} onOpenChange={(o) => { setSettingsOpen(o); if (o) { setEditSets(TOTAL_SETS); setEditTurnaround(TURNAROUND_DAYS); setEditRooms(TOTAL_ROOMS); } }}>
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
                  <Button onClick={() => saveConfigMutation.mutate({ laundry_total_sets: editSets, laundry_turnaround_days: editTurnaround, laundry_total_rooms: editRooms })} disabled={saveConfigMutation.isPending} className="w-full">
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

      <Tabs defaultValue="status">
        <TabsList className="w-full">
          <TabsTrigger value="status" className="flex-1">{t('laundry.statusTab')}</TabsTrigger>
          <TabsTrigger value="forecast" className="flex-1">{t('laundry.forecastTab')}</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">{t('guest.history')}</TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-3 mt-3">
          <h3 className="text-sm font-semibold flex items-center gap-1"><Clock className="h-4 w-4" /> {t('laundry.inTransit')}</h3>
          {inTransit.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('laundry.noneInTransit')}</p>
          ) : (
            <div className="space-y-2">
              {inTransit.map(batch => (
                <Card key={batch.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
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

        {/* History Tab */}
        <TabsContent value="history" className="space-y-2 mt-3">
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
      </Tabs>
    </div>
  );
}
