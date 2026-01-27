import { format } from 'date-fns';
import { DayPlan, ActivitySelection, TimeSlot, ACTIVITIES } from '@/types/booking';
import ActivitySelector from './ActivitySelector';

interface DayPlannerProps {
  dayPlan: DayPlan;
  dayNumber: number;
  totalDays: number;
  guests: number;
  onUpdate: (slot: TimeSlot | 'morningSecondary', selection: ActivitySelection | null) => void;
}

const DayPlanner = ({ dayPlan, dayNumber, totalDays, guests, onUpdate }: DayPlannerProps) => {
  const isCheckInDay = dayNumber === 1;
  const isCheckOutDay = dayNumber === totalDays;
  
  // Check if breakfast is selected as primary morning activity
  const hasBreakfastSelected = dayPlan.morning?.activityId === 'breakfast';
  
  // Filter activities for secondary morning slot (only activities that can go with breakfast)
  const secondaryMorningActivities = ACTIVITIES.filter(a => 
    a.availableSlots.includes('morning') && 
    a.id !== 'breakfast' &&
    // These activities are quick enough to do after breakfast
    ['surf-lesson', 'cliff-walk', 'beach-time', 'kalari-payattu', 'kalari-massage', 'padmanabha-temple', 'rest'].includes(a.id as string)
  );

  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-foreground">
          Day {dayNumber}
          {isCheckInDay && <span className="text-sm font-normal text-muted-foreground ml-2">(Check-in)</span>}
          {isCheckOutDay && <span className="text-sm font-normal text-muted-foreground ml-2">(Check-out)</span>}
        </h4>
        <span className="text-muted-foreground text-sm">
          {format(dayPlan.date, 'EEE, MMM d')}
        </span>
      </div>

      <div className="space-y-4">
        {/* Morning - disabled on check-in day */}
        <ActivitySelector
          selectedActivity={dayPlan.morning}
          slot="morning"
          guests={guests}
          onSelect={(selection) => onUpdate('morning', selection)}
          disabled={isCheckInDay}
          disabledMessage="Check-in is at 2 PM"
        />
        
        {/* Secondary morning slot - only shows when breakfast is selected */}
        {hasBreakfastSelected && !isCheckInDay && (
          <div className="ml-4 border-l-2 border-wave-orange/30 pl-4">
            <p className="text-xs text-muted-foreground mb-2">+ After breakfast</p>
            <ActivitySelector
              selectedActivity={dayPlan.morningSecondary}
              slot="morning"
              guests={guests}
              onSelect={(selection) => onUpdate('morningSecondary', selection)}
            />
          </div>
        )}
        
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
