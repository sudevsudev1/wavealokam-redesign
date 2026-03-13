import { useState, useEffect } from 'react';
import { useMyActiveShift, useClockIn, useClockOut, useShiftBreaks, useStartBreak, useEndBreak, checkOffSite } from '../hooks/useShiftPunch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Coffee, Loader2, AlertTriangle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInSeconds, differenceInMinutes, format } from 'date-fns';

const OVERTIME_THRESHOLD_MINUTES = 10 * 60;

function LiveTimer({ clockInAt, breakMinutes }: { clockInAt: string; breakMinutes: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSec = differenceInSeconds(now, new Date(clockInAt));
  const breakSec = breakMinutes * 60;
  const workSec = Math.max(0, totalSec - breakSec);
  const h = Math.floor(workSec / 3600);
  const m = Math.floor((workSec % 3600) / 60);
  const s = workSec % 60;
  const isOvertime = workSec > OVERTIME_THRESHOLD_MINUTES * 60;

  return (
    <span className={`text-xl font-mono font-bold tabular-nums ${isOvertime ? 'text-amber-700' : 'text-emerald-700'}`}>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function BreakButton({ shiftId }: { shiftId: string }) {
  const { data: breaks } = useShiftBreaks(shiftId);
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();
  const activeBreak = breaks?.find(b => !b.break_end);

  if (activeBreak) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-amber-300 text-amber-700 bg-amber-50 text-xs"
        onClick={() => endBreak.mutateAsync({ breakId: activeBreak.id, shiftId }).then(() => toast.success('Break ended')).catch(() => toast.error('Failed'))}
        disabled={endBreak.isPending}
      >
        <Coffee className="h-3.5 w-3.5" />End Break
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 text-xs"
      onClick={() => startBreak.mutateAsync({ shiftId }).then(() => toast.success('Break started')).catch(() => toast.error('Failed'))}
      disabled={startBreak.isPending}
    >
      <Coffee className="h-3.5 w-3.5" />Break
    </Button>
  );
}

export default function HomeShiftWidget() {
  const { data: activeShift, isLoading } = useMyActiveShift();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  if (isLoading) return null;

  // Not clocked in — show start button
  if (!activeShift) {
    return (
      <Card className="border-primary/30">
        <CardContent className="py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Start your shift</p>
            <p className="text-[10px] text-muted-foreground">GPS location will be recorded</p>
          </div>
          <Button
            size="lg"
            className="h-10 gap-2 font-bold"
            onClick={() => clockIn.mutateAsync().then(() => toast.success('Clocked in!')).catch(() => toast.error('Failed to clock in'))}
            disabled={clockIn.isPending}
          >
            {clockIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Clock In
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Clocked in — show live timer + controls
  const workMinutes = differenceInMinutes(new Date(), new Date(activeShift.clock_in_at)) - activeShift.total_break_minutes;
  const isOvertime = workMinutes > OVERTIME_THRESHOLD_MINUTES;
  const gps = checkOffSite(activeShift.clock_in_lat, activeShift.clock_in_lng);

  return (
    <Card className={isOvertime ? 'border-amber-500 bg-amber-50/50' : 'border-emerald-300 bg-emerald-50/50'}>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">
              In since {format(new Date(activeShift.clock_in_at), 'hh:mm a')}
              {gps.offSite && (
                <span className="text-amber-600 ml-1">
                  <MapPin className="h-3 w-3 inline" /> {gps.distance}m away
                </span>
              )}
            </p>
            
          </div>
          <div className="flex flex-col gap-1.5">
            <BreakButton shiftId={activeShift.id} />
            <Button
              variant="destructive"
              size="sm"
              className="h-8 gap-1.5 text-xs font-bold"
              onClick={() => clockOut.mutateAsync({ shiftId: activeShift.id, notes: '' }).then(() => toast.success('Clocked out!')).catch(() => toast.error('Failed'))}
              disabled={clockOut.isPending}
            >
              {clockOut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Clock Out
            </Button>
          </div>
        </div>

        {isOvertime && (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-100 rounded-md px-2 py-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-[10px] font-medium">Overtime alert</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
