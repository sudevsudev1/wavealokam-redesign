import React, { useState, useMemo } from 'react';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import {
  useMyActiveShift, useMyShifts, useAllShifts,
  useClockIn, useClockOut, useStartBreak, useEndBreak,
  useShiftBreaks, checkOffSite, ShiftPunch,
} from '../hooks/useShiftPunch';
import { useOpsProfiles } from '../hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, MapPin, Coffee, LogIn, LogOut, AlertTriangle, Loader2, ChevronDown, ChevronUp, Edit2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const OVERTIME_THRESHOLD_MINUTES = 10 * 60; // 10 hours

export default function ShiftPunchPage() {
  const { isAdmin } = useOpsAuth();
  const { t } = useOpsLanguage();

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-primary" />
        {t('nav.shiftPunch')}
      </h1>
      <PunchCard />
      {isAdmin ? (
        <Tabs defaultValue="my">
          <TabsList className="w-full flex overflow-x-auto scrollbar-hide">
            <TabsTrigger value="my" className="text-xs flex-1 flex-shrink-0">My Shifts</TabsTrigger>
            <TabsTrigger value="team" className="text-xs flex-1 flex-shrink-0">Team Timesheet</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs flex-1 flex-shrink-0"><Calendar className="h-3 w-3 mr-1" />Monthly</TabsTrigger>
          </TabsList>
          <TabsContent value="my"><MyShiftHistory /></TabsContent>
          <TabsContent value="team"><TeamTimesheet /></TabsContent>
          <TabsContent value="monthly"><MonthlyView /></TabsContent>
        </Tabs>
      ) : (
        <MyShiftHistory />
      )}
    </div>
  );
}

function PunchCard() {
  const { data: activeShift, isLoading } = useMyActiveShift();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const [notes, setNotes] = useState('');

  if (isLoading) return <Card><CardContent className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;

  if (!activeShift) {
    return (
      <Card className="border-primary/30">
        <CardContent className="py-6 text-center space-y-3">
          <p className="text-sm text-foreground/70">You're not clocked in</p>
          <Button size="lg" className="w-full gap-2 h-12 text-base font-bold" onClick={() => { clockIn.mutateAsync().then(() => toast.success('Clocked in!')).catch(() => toast.error('Failed to clock in')); }} disabled={clockIn.isPending}>
            {clockIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-5 w-5" />}Clock In
          </Button>
          <p className="text-xs text-foreground/50">GPS location will be recorded</p>
        </CardContent>
      </Card>
    );
  }

  const elapsed = differenceInMinutes(new Date(), new Date(activeShift.clock_in_at));
  const workMinutes = elapsed - activeShift.total_break_minutes;
  const hours = Math.floor(workMinutes / 60);
  const mins = workMinutes % 60;
  const gpsCheck = checkOffSite(activeShift.clock_in_lat, activeShift.clock_in_lng);
  const isOvertime = workMinutes > OVERTIME_THRESHOLD_MINUTES;

  return (
    <Card className={isOvertime ? 'border-amber-500 bg-amber-50/50' : 'border-emerald-300 bg-emerald-50/50'}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div><p className="text-xs text-foreground/60">Clocked in at</p><p className="text-sm font-bold">{format(new Date(activeShift.clock_in_at), 'hh:mm a')}</p></div>
          <div className="text-right"><p className="text-xs text-foreground/60">Working time</p><p className={`text-lg font-bold ${isOvertime ? 'text-amber-700' : 'text-emerald-700'}`}>{hours}h {mins}m</p></div>
        </div>

        {isOvertime && (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-100 rounded-md px-2 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Overtime! {Math.floor((workMinutes - OVERTIME_THRESHOLD_MINUTES) / 60)}h {(workMinutes - OVERTIME_THRESHOLD_MINUTES) % 60}m extra</span>
          </div>
        )}

        {gpsCheck.offSite && (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-100 rounded-md px-2 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs">Clocked in {gpsCheck.distance}m from property</span>
          </div>
        )}

        {activeShift.total_break_minutes > 0 && <p className="text-xs text-foreground/60">Break time: {activeShift.total_break_minutes} min</p>}
        <BreakControls shiftId={activeShift.id} />
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Shift notes (optional)..." rows={2} className="text-sm" />
        <Button variant="destructive" className="w-full gap-2 h-11 font-bold" onClick={() => { clockOut.mutateAsync({ shiftId: activeShift.id, notes }).then(() => { toast.success('Clocked out!'); setNotes(''); }).catch(() => toast.error('Failed to clock out')); }} disabled={clockOut.isPending}>
          {clockOut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}Clock Out
        </Button>
      </CardContent>
    </Card>
  );
}

function BreakControls({ shiftId }: { shiftId: string }) {
  const { data: breaks } = useShiftBreaks(shiftId);
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();
  const activeBreak = breaks?.find(b => !b.break_end);

  if (activeBreak) {
    const breakElapsed = differenceInMinutes(new Date(), new Date(activeBreak.break_start));
    return (
      <Button variant="outline" className="w-full gap-2 border-amber-300 text-amber-700 bg-amber-50" onClick={() => { endBreak.mutateAsync({ breakId: activeBreak.id, shiftId }).then(() => toast.success('Break ended')).catch(() => toast.error('Failed')); }} disabled={endBreak.isPending}>
        <Coffee className="h-4 w-4" />End Break ({breakElapsed}m)
      </Button>
    );
  }

  return (
    <Button variant="outline" className="w-full gap-2" onClick={() => { startBreak.mutateAsync({ shiftId }).then(() => toast.success('Break started')).catch(() => toast.error('Failed')); }} disabled={startBreak.isPending}>
      <Coffee className="h-4 w-4" />Start Break
    </Button>
  );
}

function MyShiftHistory() {
  const today = new Date();
  const [range] = useState(() => ({ from: startOfWeek(today, { weekStartsOn: 1 }).toISOString(), to: endOfWeek(today, { weekStartsOn: 1 }).toISOString() }));
  const { data: shifts, isLoading } = useMyShifts(range.from, range.to);

  if (isLoading) return <Card><CardContent className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;

  const totalWorked = (shifts || []).reduce((acc, s) => {
    if (s.clock_out_at) return acc + differenceInMinutes(new Date(s.clock_out_at), new Date(s.clock_in_at)) - s.total_break_minutes;
    return acc;
  }, 0);

  return (
    <div className="space-y-3 mt-3">
      <Card><CardContent className="py-3"><div className="flex justify-between items-center"><span className="text-xs text-foreground/60">This week</span><span className="text-sm font-bold">{Math.floor(totalWorked / 60)}h {totalWorked % 60}m</span></div></CardContent></Card>
      {(shifts || []).map(s => <ShiftCard key={s.id} shift={s} />)}
      {(!shifts || shifts.length === 0) && <Card><CardContent className="py-6 text-center text-xs text-foreground/50">No shifts this week</CardContent></Card>}
    </div>
  );
}

function ShiftCard({ shift, showUser, allowEdit }: { shift: ShiftPunch; showUser?: string; allowEdit?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const duration = shift.clock_out_at ? differenceInMinutes(new Date(shift.clock_out_at), new Date(shift.clock_in_at)) - shift.total_break_minutes : null;
  const gpsIn = checkOffSite(shift.clock_in_lat, shift.clock_in_lng);
  const gpsOut = checkOffSite(shift.clock_out_lat, shift.clock_out_lng);
  const isFlagged = shift.flag_type || gpsIn.offSite || gpsOut.offSite;
  const isOvertime = duration != null && duration > OVERTIME_THRESHOLD_MINUTES;

  const handleSaveEdit = async () => {
    try {
      const updates: Record<string, unknown> = {};
      if (editClockIn) updates.clock_in_at = new Date(editClockIn).toISOString();
      if (editClockOut) updates.clock_out_at = new Date(editClockOut).toISOString();
      if (editNotes) updates.notes = editNotes;
      updates.flag_type = 'admin_corrected';
      updates.flag_reason = `Admin corrected shift times. Original: ${format(new Date(shift.clock_in_at), 'HH:mm')}${shift.clock_out_at ? ' - ' + format(new Date(shift.clock_out_at), 'HH:mm') : ''}`;

      const { error } = await supabase.from('ops_shift_punches').update(updates as any).eq('id', shift.id);
      if (error) throw error;
      toast.success('Shift corrected');
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className={isFlagged ? 'border-amber-300' : isOvertime ? 'border-amber-200' : ''}>
      <CardContent className="py-2.5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
            <div>
              {showUser && <p className="text-xs font-semibold">{showUser}</p>}
              <p className="text-xs text-foreground/70">{format(new Date(shift.clock_in_at), 'EEE, MMM d')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOvertime && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">OT</Badge>}
            {isFlagged && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
            <Badge variant="secondary" className="text-xs">
              {shift.status === 'clocked_in' ? '🟢 Active' : duration != null ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '—'}
            </Badge>
            {allowEdit && shift.status === 'clocked_out' && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                setEditClockIn(format(new Date(shift.clock_in_at), "yyyy-MM-dd'T'HH:mm"));
                setEditClockOut(shift.clock_out_at ? format(new Date(shift.clock_out_at), "yyyy-MM-dd'T'HH:mm") : '');
                setEditNotes(shift.notes || '');
                setEditing(true);
              }}>
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        {expanded && (
          <div className="pl-6 space-y-1 text-xs text-foreground/60 border-t pt-2 mt-1">
            <p>In: {format(new Date(shift.clock_in_at), 'hh:mm a')}{shift.clock_in_lat && <span className="ml-1"><MapPin className="h-3 w-3 inline" /> {shift.clock_in_lat.toFixed(4)}, {shift.clock_in_lng?.toFixed(4)}</span>}</p>
            {shift.clock_out_at && <p>Out: {format(new Date(shift.clock_out_at), 'hh:mm a')}{shift.clock_out_lat && <span className="ml-1"><MapPin className="h-3 w-3 inline" /> {shift.clock_out_lat.toFixed(4)}, {shift.clock_out_lng?.toFixed(4)}</span>}</p>}
            {shift.total_break_minutes > 0 && <p>Breaks: {shift.total_break_minutes} min</p>}
            {shift.notes && <p>Notes: {shift.notes}</p>}
            {shift.flag_reason && <p className="text-amber-600">⚠️ {shift.flag_reason}</p>}
          </div>
        )}
      </CardContent>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Correct Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium">Clock In</label><Input type="datetime-local" value={editClockIn} onChange={e => setEditClockIn(e.target.value)} className="text-xs" /></div>
            <div><label className="text-xs font-medium">Clock Out</label><Input type="datetime-local" value={editClockOut} onChange={e => setEditClockOut(e.target.value)} className="text-xs" /></div>
            <div><label className="text-xs font-medium">Notes</label><Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className="text-xs" /></div>
            <Button onClick={handleSaveEdit} className="w-full">Save Correction</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TeamTimesheet() {
  const { data: profiles } = useOpsProfiles();
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const { data: shifts, isLoading } = useAllShifts(new Date(dateFrom).toISOString(), new Date(dateTo + 'T23:59:59').toISOString());
  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

  const byUser = new Map<string, ShiftPunch[]>();
  (shifts || []).forEach(s => { const arr = byUser.get(s.user_id) || []; arr.push(s); byUser.set(s.user_id, arr); });

  return (
    <div className="space-y-3 mt-3">
      <div className="flex gap-2"><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs" /><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs" /></div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
        Array.from(byUser.entries()).map(([userId, userShifts]) => {
          const name = profileMap.get(userId) || 'Unknown';
          const totalWorked = userShifts.reduce((acc, s) => { if (s.clock_out_at) return acc + differenceInMinutes(new Date(s.clock_out_at), new Date(s.clock_in_at)) - s.total_break_minutes; return acc; }, 0);
          const flaggedCount = userShifts.filter(s => s.flag_type).length;
          const overtimeShifts = userShifts.filter(s => {
            if (!s.clock_out_at) return false;
            const d = differenceInMinutes(new Date(s.clock_out_at), new Date(s.clock_in_at)) - s.total_break_minutes;
            return d > OVERTIME_THRESHOLD_MINUTES;
          }).length;

          return (
            <Card key={userId}>
              <CardHeader className="py-2.5 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {overtimeShifts > 0 && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">{overtimeShifts} OT</Badge>}
                    {flaggedCount > 0 && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">{flaggedCount} ⚠️</Badge>}
                    <Badge variant="secondary" className="text-xs">{Math.floor(totalWorked / 60)}h {totalWorked % 60}m</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-2 px-3 space-y-1.5">
                {userShifts.map(s => <ShiftCard key={s.id} shift={s} allowEdit />)}
              </CardContent>
            </Card>
          );
        })
      )}
      {!isLoading && byUser.size === 0 && <Card><CardContent className="py-6 text-center text-xs text-foreground/50">No shifts in this period</CardContent></Card>}
    </div>
  );
}

// ─── Monthly Summary View ────────────────────────────────
function MonthlyView() {
  const { data: profiles } = useOpsProfiles();
  const today = new Date();
  const [month, setMonth] = useState(format(today, 'yyyy-MM'));
  const monthStart = startOfMonth(new Date(month + '-01')).toISOString();
  const monthEnd = endOfMonth(new Date(month + '-01')).toISOString();
  const { data: shifts, isLoading } = useAllShifts(monthStart, monthEnd);

  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

  const summary = useMemo(() => {
    if (!shifts) return [];
    const byUser = new Map<string, { totalMinutes: number; shifts: number; overtime: number; flagged: number }>();
    shifts.forEach(s => {
      const existing = byUser.get(s.user_id) || { totalMinutes: 0, shifts: 0, overtime: 0, flagged: 0 };
      existing.shifts++;
      if (s.clock_out_at) {
        const d = differenceInMinutes(new Date(s.clock_out_at), new Date(s.clock_in_at)) - s.total_break_minutes;
        existing.totalMinutes += d;
        if (d > OVERTIME_THRESHOLD_MINUTES) existing.overtime++;
      }
      if (s.flag_type) existing.flagged++;
      byUser.set(s.user_id, existing);
    });
    return Array.from(byUser.entries()).map(([userId, data]) => ({
      userId,
      name: profileMap.get(userId) || 'Unknown',
      ...data,
    }));
  }, [shifts, profileMap]);

  return (
    <div className="space-y-3 mt-3">
      <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="text-xs w-40" />
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
        <Card>
          <CardContent className="py-3 px-3 space-y-2">
            {summary.length === 0 && <p className="text-xs text-center text-foreground/50 py-4">No shifts this month</p>}
            {summary.map(s => (
              <div key={s.userId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-foreground/50">{s.shifts} shifts</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.overtime > 0 && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">{s.overtime} OT</Badge>}
                  {s.flagged > 0 && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">{s.flagged} ⚠️</Badge>}
                  <span className="text-sm font-bold">{Math.floor(s.totalMinutes / 60)}h {s.totalMinutes % 60}m</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
