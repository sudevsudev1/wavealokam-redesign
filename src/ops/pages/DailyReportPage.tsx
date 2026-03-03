import React, { useState } from 'react';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import { useDailyReport } from '../hooks/useDailyReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  FileText, CheckCircle, Clock, Users, Package, AlertTriangle,
  Loader2, TrendingUp, ShieldAlert, UserCheck, Baby, CalendarClock,
} from 'lucide-react';
import { format } from 'date-fns';

export default function DailyReportPage() {
  const { t } = useOpsLanguage();
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

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !report ? (
        <Card><CardContent className="py-8 text-center text-sm text-foreground/50">No data available</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {/* Task Summary */}
          <TaskSummaryCard tasks={report.tasks} />

          {/* Occupancy Snapshot */}
          <OccupancyCard guests={report.guests} />

          {/* Inventory Alerts */}
          {(report.inventory.lowStockItems.length > 0 || report.inventory.expiringItems.length > 0) && (
            <InventoryAlertsCard inventory={report.inventory} />
          )}

          {/* Shift Summary */}
          <ShiftSummaryCard shifts={report.shifts} />
        </div>
      )}
    </div>
  );
}

function TaskSummaryCard({ tasks }: { tasks: NonNullable<ReturnType<typeof useDailyReport>['data']>['tasks'] }) {
  const completionRate = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          Tasks Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* Completion bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground/60">Completion</span>
            <span className="font-semibold">{completionRate}% ({tasks.done}/{tasks.total})</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatBadge label="To Do" value={tasks.todo} color="bg-muted text-foreground/70" />
          <StatBadge label="Doing" value={tasks.doing} color="bg-sky-100 text-sky-700" />
          <StatBadge label="Blocked" value={tasks.blocked} color="bg-destructive/10 text-destructive" />
          <StatBadge label="Done" value={tasks.done} color="bg-emerald-100 text-emerald-700" />
          <StatBadge label="Cancelled" value={tasks.cancelled} color="bg-muted text-foreground/40" />
          <StatBadge label="Overdue" value={tasks.overdue} color="bg-destructive/10 text-destructive" icon={<AlertTriangle className="h-3 w-3" />} />
        </div>

        {/* By category */}
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
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" />
          Occupancy Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{guests.currentlyIn}</p>
              <p className="text-[10px] text-foreground/50">Currently In</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{guests.checkedInToday}</p>
              <p className="text-[10px] text-foreground/50">Checked In Today</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            <Users className="h-4 w-4 text-foreground/40 shrink-0" />
            <div>
              <p className="text-sm font-semibold leading-none">{guests.totalAdults}A + {guests.totalChildren}C</p>
              <p className="text-[10px] text-foreground/50">Guests on site</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            <CalendarClock className="h-4 w-4 text-foreground/40 shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{guests.checkedOutToday}</p>
              <p className="text-[10px] text-foreground/50">Checked Out Today</p>
            </div>
          </div>
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
          <Package className="h-4 w-4 text-amber-600" />
          Inventory Alerts
          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 ml-auto">
            {inventory.lowStockItems.length + inventory.expiringItems.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {inventory.lowStockItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Low Stock
            </p>
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
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Expiring Soon (7 days)
            </p>
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
          <Clock className="h-4 w-4 text-primary" />
          Staff Shifts
          {shifts.flaggedCount > 0 && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 ml-auto">
              {shifts.flaggedCount} flagged
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex gap-3 text-xs">
          <div className="flex-1 border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{shifts.staffSummary.length}</p>
            <p className="text-[10px] text-foreground/50">Staff worked</p>
          </div>
          <div className="flex-1 border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{totalHours}h {totalMins}m</p>
            <p className="text-[10px] text-foreground/50">Total hours</p>
          </div>
          <div className="flex-1 border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{shifts.clockedIn}</p>
            <p className="text-[10px] text-foreground/50">Currently in</p>
          </div>
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
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className="text-base font-bold">{value}</span>
      </div>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
