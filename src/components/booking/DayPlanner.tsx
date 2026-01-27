import { format } from 'date-fns';
import { DayPlan, ActivityType, TimeSlot } from '@/types/booking';
import ActivitySelector from './ActivitySelector';

interface DayPlannerProps {
  dayPlan: DayPlan;
  dayNumber: number;
  guests: number;
  onUpdate: (slot: TimeSlot, activity: ActivityType) => void;
}

const DayPlanner = ({ dayPlan, dayNumber, guests, onUpdate }: DayPlannerProps) => {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-white">
          Day {dayNumber}
        </h4>
        <span className="text-white/60 text-sm">
          {format(dayPlan.date, 'EEE, MMM d')}
        </span>
      </div>

      <div className="space-y-4">
        <ActivitySelector
          selectedActivity={dayPlan.morning}
          slot="morning"
          guests={guests}
          onSelect={(activity) => onUpdate('morning', activity)}
        />
        <ActivitySelector
          selectedActivity={dayPlan.afternoon}
          slot="afternoon"
          guests={guests}
          onSelect={(activity) => onUpdate('afternoon', activity)}
        />
        <ActivitySelector
          selectedActivity={dayPlan.evening}
          slot="evening"
          guests={guests}
          onSelect={(activity) => onUpdate('evening', activity)}
        />
        <ActivitySelector
          selectedActivity={dayPlan.night}
          slot="night"
          guests={guests}
          onSelect={(activity) => onUpdate('night', activity)}
        />
      </div>
    </div>
  );
};

export default DayPlanner;
