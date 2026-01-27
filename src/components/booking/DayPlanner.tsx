import { format } from 'date-fns';
import { DayPlan, ActivitySelection, TimeSlot } from '@/types/booking';
import ActivitySelector from './ActivitySelector';

interface DayPlannerProps {
  dayPlan: DayPlan;
  dayNumber: number;
  totalDays: number;
  guests: number;
  onUpdate: (slot: TimeSlot, selection: ActivitySelection | null) => void;
}

const DayPlanner = ({ dayPlan, dayNumber, totalDays, guests, onUpdate }: DayPlannerProps) => {
  const isCheckInDay = dayNumber === 1;
  const isCheckOutDay = dayNumber === totalDays;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl p-6 border-2 border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-wave-orange to-orange-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
            {dayNumber}
          </span>
          <span>
            Day {dayNumber}
            {isCheckInDay && <span className="text-xs font-normal text-wave-orange ml-2 bg-wave-orange/10 px-2 py-1 rounded-full">(Check-in 2PM)</span>}
            {isCheckOutDay && <span className="text-xs font-normal text-wave-orange ml-2 bg-wave-orange/10 px-2 py-1 rounded-full">(Check-out 11AM)</span>}
          </span>
        </h4>
        <span className="text-muted-foreground text-sm font-medium bg-muted/50 px-3 py-1 rounded-full">
          {format(dayPlan.date, 'EEE, MMM d')}
        </span>
      </div>

      <div className="space-y-5">
        {/* Morning - disabled on check-in day, enabled on check-out day */}
        <ActivitySelector
          selectedActivity={dayPlan.morning}
          slot="morning"
          guests={guests}
          onSelect={(selection) => onUpdate('morning', selection)}
          disabled={isCheckInDay}
          disabledMessage="Check-in is at 2 PM"
        />
        
        {/* Afternoon - disabled on check-out day */}
        <ActivitySelector
          selectedActivity={dayPlan.afternoon}
          slot="afternoon"
          guests={guests}
          onSelect={(selection) => onUpdate('afternoon', selection)}
          disabled={isCheckOutDay}
          disabledMessage="Check-out by 11 AM"
        />
        
        {/* Evening - disabled on check-out day */}
        <ActivitySelector
          selectedActivity={dayPlan.evening}
          slot="evening"
          guests={guests}
          onSelect={(selection) => onUpdate('evening', selection)}
          disabled={isCheckOutDay}
          disabledMessage="Check-out by 11 AM"
        />
        
        {/* Night - disabled on check-out day */}
        <ActivitySelector
          selectedActivity={dayPlan.night}
          slot="night"
          guests={guests}
          onSelect={(selection) => onUpdate('night', selection)}
          disabled={isCheckOutDay}
          disabledMessage="Check-out by 11 AM"
        />
      </div>
    </div>
  );
};

export default DayPlanner;
