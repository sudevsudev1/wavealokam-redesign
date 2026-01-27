import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { DayPlan, ActivitySelection, TimeSlot } from '@/types/booking';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ActivitySelector from './ActivitySelector';

interface DayPlannerProps {
  dayPlan: DayPlan;
  dayNumber: number;
  totalDays: number;
  guests: number;
  onUpdate: (slot: TimeSlot, selection: ActivitySelection | null) => void;
  animationDelay?: number;
}

const DayPlanner = ({ dayPlan, dayNumber, totalDays, guests, onUpdate, animationDelay = 0 }: DayPlannerProps) => {
  const [isOpen, setIsOpen] = useState(dayNumber === 1);
  const isCheckInDay = dayNumber === 1;
  const isCheckOutDay = dayNumber === totalDays;

  // Count selected activities
  const selectedCount = [
    !isCheckInDay && dayPlan.morning,
    !isCheckOutDay && dayPlan.afternoon,
    !isCheckOutDay && dayPlan.evening,
    !isCheckOutDay && dayPlan.night,
  ].filter(Boolean).length;

  return (
    <div 
      className="animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border-2 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-wave-orange/5 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-wave-orange to-orange-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                  {dayNumber}
                </span>
                <div className="text-left">
                  <h4 className="text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                    <span>Day {dayNumber}</span>
                    {isCheckInDay && (
                      <span className="text-xs font-normal text-wave-orange bg-wave-orange/10 px-2 py-1 rounded-full">
                        Check-in 2PM
                      </span>
                    )}
                    {isCheckOutDay && (
                      <span className="text-xs font-normal text-wave-orange bg-wave-orange/10 px-2 py-1 rounded-full">
                        Check-out 11AM
                      </span>
                    )}
                  </h4>
                  <span className="text-muted-foreground text-sm">
                    {format(dayPlan.date, 'EEE, MMM d')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedCount > 0 && (
                  <span className="text-xs font-semibold text-wave-orange bg-wave-orange/10 px-2 py-1 rounded-full">
                    {selectedCount} selected
                  </span>
                )}
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                />
              </div>
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 md:px-6 pb-6 space-y-5 border-t border-border/30 pt-5">
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
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default DayPlanner;