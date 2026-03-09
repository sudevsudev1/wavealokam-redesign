import React, { useState } from 'react';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import {
  useDailyReport,
  useDailyReportSubmissions,
  useSubmitDailyReport,
  useReviewDailyReport,
  DailyReportSubmission,
} from '../hooks/useDailyReport';
import { useOpsProfiles } from '../hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText, CheckCircle, Clock, Users, Package, AlertTriangle,
  Loader2, TrendingUp, ShieldAlert, UserCheck, CalendarClock,
  PenSquare, Send, ThumbsUp, RotateCcw, Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DailyReportPage() {
  const { t } = useOpsLanguage();
  const { isAdmin, profile } = useOpsAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { data: report, isLoading } = useDailyReport(date);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-bold flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" />
          {t('nav.dailyReport')}
        </h1>
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-36 text-xs"
        />
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="w-full flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="dashboard" className="flex-1 flex-shrink-0 text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="submit" className="flex-1 flex-shrink-0 text-xs">
            <PenSquare className="h-3 w-3 mr-1" />Submit Report
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="review" className="flex-1 flex-shrink-0 text-xs">
              <Eye className="h-3 w-3 mr-1" />Review
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dashboard">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !report ? (
            <Card><CardContent className="py-8 text-center text-sm text-foreground/50">No data available</CardContent></Card>
          ) : (
            <div className="space-y-4 mt-3">
              <TaskSummaryCard tasks={report.tasks} />
              <OccupancyCard guests={report.guests} />
              {(report.inventory.lowStockItems.length > 0 || report.inventory.expiringItems.length > 0) && (
                <InventoryAlertsCard inventory={report.inventory} />
              )}
              <ShiftSummaryCard shifts={report.shifts} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="submit">
          <SubmitReportForm date={date} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="review">
            <ReviewReports date={date} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ─── Submit Report Form ──────────────────────────────────
function SubmitReportForm({ date }: { date: string }) {
  const { profile } = useOpsAuth();
  const submit = useSubmitDailyReport();
  const { data: existing } = useDailyReportSubmissions(date);
  const alreadySubmitted = existing?.some(r => r.submitted_by === profile?.userId);

  const [form, setForm] = useState({
    revenue_total: 0, revenue_cash: 0, revenue_online: 0,
    occupancy_notes: '', kitchen_notes: '', maintenance_notes: '',
    general_notes: '', highlights: '', issues: '',
  });

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync({ report_date: date, ...form });
      toast.success('Report submitted!');
      setForm({ revenue_total: 0, revenue_cash: 0, revenue_online: 0, occupancy_notes: '', kitchen_notes: '', maintenance_notes: '', general_notes: '', highlights: '', issues: '' });
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit');
    }
  };

  if (alreadySubmitted) {
    return (
      <Card className="mt-3">
        <CardContent className="py-8 text-center space-y-2">
          <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto" />
          <p className="text-sm font-medium">Report already submitted for {format(new Date(date), 'dd MMM yyyy')}</p>
          <p className="text-xs text-foreground/50">You can view it in the Review tab</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Revenue</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-medium text-foreground/60">Cash ₹</label>
              <Input type="number" min={0} value={form.revenue_cash} onChange={e => {
                const cash = Number(e.target.value) || 0;
                setForm(f => ({ ...f, revenue_cash: cash, revenue_total: cash + f.revenue_online }));
              }} className="text-xs h-8" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-foreground/60">Online ₹</label>
              <Input type="number" min={0} value={form.revenue_online} onChange={e => {
                const online = Number(e.target.value) || 0;
                setForm(f => ({ ...f, revenue_online: online, revenue_total: f.revenue_cash + online }));
              }} className="text-xs h-8" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-foreground/60">Total ₹</label>
              <Input value={form.revenue_total} readOnly className="text-xs h-8 bg-muted font-bold" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Notes</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {[
            { key: 'occupancy_notes', label: 'Occupancy' },
            { key: 'kitchen_notes', label: 'Kitchen' },
            { key: 'maintenance_notes', label: 'Maintenance' },
            { key: 'general_notes', label: 'General' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-[10px] font-medium text-foreground/60">{label}</label>
              <Textarea
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={2}
                className="text-xs"
                placeholder={`${label} observations...`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Highlights & Issues</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <div>
            <label className="text-[10px] font-medium text-emerald-700">✨ Highlights</label>
            <Textarea value={form.highlights} onChange={e => setForm(f => ({ ...f, highlights: e.target.value }))} rows={2} className="text-xs" placeholder="What went well today..." />
          </div>
          <div>
            <label className="text-[10px] font-medium text-destructive">⚠️ Issues</label>
            <Textarea value={form.issues} onChange={e => setForm(f => ({ ...f, issues: e.target.value }))} rows={2} className="text-xs" placeholder="Problems or concerns..." />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={submit.isPending} className="w-full gap-2">
        {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit Report for {format(new Date(date), 'dd MMM')}
      </Button>
    </div>
  );
}

// ─── Review Reports (Admin) ──────────────────────────────
function ReviewReports({ date }: { date: string }) {
  const { data: submissions, isLoading } = useDailyReportSubmissions();
  const { data: profiles } = useOpsProfiles();
  const review = useReviewDailyReport();
  const [selected, setSelected] = useState<DailyReportSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

  const handleReview = async (status: 'approved' | 'needs_revision') => {
    if (!selected) return;
    try {
      await review.mutateAsync({ id: selected.id, status, review_notes: reviewNotes });
      toast.success(status === 'approved' ? 'Report approved!' : 'Revision requested');
      setSelected(null);
      setReviewNotes('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-2 mt-3">
      {(submissions || []).length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-foreground/50">No reports submitted yet</CardContent></Card>
      )}
      {(submissions || []).map(sub => (
        <Card key={sub.id} className={sub.status === 'submitted' ? 'border-amber-300' : sub.status === 'approved' ? 'border-emerald-300' : ''}>
          <CardContent className="py-3 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{profileMap.get(sub.submitted_by) || 'Unknown'}</p>
                <p className="text-xs text-foreground/50">{format(new Date(sub.report_date), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={sub.status === 'approved' ? 'default' : sub.status === 'needs_revision' ? 'destructive' : 'secondary'} className="text-xs">
                  {sub.status}
                </Badge>
                {sub.revenue_total > 0 && <span className="text-xs font-bold">₹{sub.revenue_total}</span>}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(sub); setReviewNotes(''); }}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report: {selected && format(new Date(selected.report_date), 'dd MMM yyyy')}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-foreground/50">By {profileMap.get(selected.submitted_by) || 'Unknown'}</p>

              <div className="grid grid-cols-3 gap-2 bg-muted rounded-lg p-3">
                <div className="text-center"><p className="text-xs text-foreground/50">Cash</p><p className="font-bold">₹{selected.revenue_cash}</p></div>
                <div className="text-center"><p className="text-xs text-foreground/50">Online</p><p className="font-bold">₹{selected.revenue_online}</p></div>
                <div className="text-center"><p className="text-xs text-foreground/50">Total</p><p className="font-bold text-primary">₹{selected.revenue_total}</p></div>
              </div>

              {[
                { key: 'occupancy_notes', label: 'Occupancy' },
                { key: 'kitchen_notes', label: 'Kitchen' },
                { key: 'maintenance_notes', label: 'Maintenance' },
                { key: 'general_notes', label: 'General' },
                { key: 'highlights', label: '✨ Highlights' },
                { key: 'issues', label: '⚠️ Issues' },
              ].map(({ key, label }) => {
                const val = (selected as any)[key];
                if (!val) return null;
                return (
                  <div key={key}>
                    <p className="text-[10px] font-semibold text-foreground/50 uppercase">{label}</p>
                    <p className="text-xs whitespace-pre-wrap">{val}</p>
                  </div>
                );
              })}

              {selected.status === 'submitted' && (
                <div className="space-y-2 border-t pt-3">
                  <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Review notes (optional)..." rows={2} className="text-xs" />
                  <div className="flex gap-2">
                    <Button onClick={() => handleReview('approved')} disabled={review.isPending} className="flex-1 gap-1" size="sm">
                      <ThumbsUp className="h-3.5 w-3.5" />Approve
                    </Button>
                    <Button onClick={() => handleReview('needs_revision')} disabled={review.isPending} variant="outline" className="flex-1 gap-1" size="sm">
                      <RotateCcw className="h-3.5 w-3.5" />Request Revision
                    </Button>
                  </div>
                </div>
              )}

              {selected.review_notes && (
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-[10px] font-semibold text-foreground/50">REVIEW NOTES</p>
                  <p className="text-xs">{selected.review_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Dashboard Cards (unchanged) ────────────────────────
function TaskSummaryCard({ tasks }: { tasks: NonNullable<ReturnType<typeof useDailyReport>['data']>['tasks'] }) {
  const completionRate = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;
  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-emerald-600" />Tasks Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground/60">Completion</span>
            <span className="font-semibold">{completionRate}% ({tasks.done}/{tasks.total})</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBadge label="To Do" value={tasks.todo} color="bg-muted text-foreground/70" />
          <StatBadge label="Doing" value={tasks.doing} color="bg-sky-100 text-sky-700" />
          <StatBadge label="Blocked" value={tasks.blocked} color="bg-destructive/10 text-destructive" />
          <StatBadge label="Done" value={tasks.done} color="bg-emerald-100 text-emerald-700" />
          <StatBadge label="Cancelled" value={tasks.cancelled} color="bg-muted text-foreground/40" />
          <StatBadge label="Overdue" value={tasks.overdue} color="bg-destructive/10 text-destructive" icon={<AlertTriangle className="h-3 w-3" />} />
        </div>
        {Object.keys(tasks.byCategory).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wide">By Category</p>
            {Object.entries(tasks.byCategory).map(([cat, data]) => (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className="text-foreground/70">{cat}</span>
                <span className="font-medium">{data.done}/{data.total}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OccupancyCard({ guests }: { guests: NonNullable<ReturnType<typeof useDailyReport>['data']>['guests'] }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />Occupancy Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5"><UserCheck className="h-4 w-4 text-emerald-600 shrink-0" /><div><p className="text-lg font-bold leading-none">{guests.currentlyIn}</p><p className="text-[10px] text-foreground/50">Currently In</p></div></div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5"><TrendingUp className="h-4 w-4 text-primary shrink-0" /><div><p className="text-lg font-bold leading-none">{guests.checkedInToday}</p><p className="text-[10px] text-foreground/50">Checked In Today</p></div></div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5"><Users className="h-4 w-4 text-foreground/40 shrink-0" /><div><p className="text-sm font-semibold leading-none">{guests.totalAdults}A + {guests.totalChildren}C</p><p className="text-[10px] text-foreground/50">Guests on site</p></div></div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5"><CalendarClock className="h-4 w-4 text-foreground/40 shrink-0" /><div><p className="text-lg font-bold leading-none">{guests.checkedOutToday}</p><p className="text-[10px] text-foreground/50">Checked Out Today</p></div></div>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryAlertsCard({ inventory }: { inventory: NonNullable<ReturnType<typeof useDailyReport>['data']>['inventory'] }) {
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Package className="h-4 w-4 text-amber-600" />Inventory Alerts
          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 ml-auto">{inventory.lowStockItems.length + inventory.expiringItems.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {inventory.lowStockItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Low Stock</p>
            {inventory.lowStockItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-xs bg-destructive/5 rounded px-2 py-1.5">
                <span className="text-foreground/80">{item.name}</span>
                <span className="font-semibold text-destructive">{item.current} {item.unit} (reorder: {item.reorder})</span>
              </div>
            ))}
          </div>
        )}
        {inventory.expiringItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Expiring Soon (7 days)</p>
            {inventory.expiringItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-xs bg-amber-50 rounded px-2 py-1.5">
                <span className="text-foreground/80">{item.itemName} ({item.quantity})</span>
                <span className="font-semibold text-amber-700">{item.expiryDate}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ShiftSummaryCard({ shifts }: { shifts: NonNullable<ReturnType<typeof useDailyReport>['data']>['shifts'] }) {
  const totalHours = Math.floor(shifts.totalWorkedMinutes / 60);
  const totalMins = shifts.totalWorkedMinutes % 60;
  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />Staff Shifts
          {shifts.flaggedCount > 0 && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 ml-auto">{shifts.flaggedCount} flagged</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex gap-3 text-xs">
          <div className="flex-1 border border-border rounded-lg p-2 text-center"><p className="text-lg font-bold">{shifts.staffSummary.length}</p><p className="text-[10px] text-foreground/50">Staff worked</p></div>
          <div className="flex-1 border border-border rounded-lg p-2 text-center"><p className="text-lg font-bold">{totalHours}h {totalMins}m</p><p className="text-[10px] text-foreground/50">Total hours</p></div>
          <div className="flex-1 border border-border rounded-lg p-2 text-center"><p className="text-lg font-bold">{shifts.clockedIn}</p><p className="text-[10px] text-foreground/50">Currently in</p></div>
        </div>
        {shifts.staffSummary.length > 0 && (
          <div className="space-y-1">
            {shifts.staffSummary.map(s => (
              <div key={s.userId} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                <div className="flex items-center gap-1.5">
                  {s.flagged && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                  <span className="text-foreground/80">{s.name}</span>
                </div>
                <span className="font-medium">{Math.floor(s.minutes / 60)}h {s.minutes % 60}m</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBadge({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ${color}`}>
      <div className="flex items-center justify-center gap-1">{icon}<span className="text-base font-bold">{value}</span></div>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
