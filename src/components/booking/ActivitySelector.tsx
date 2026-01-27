import { useState } from 'react';
import { ACTIVITIES, ActivityType, TimeSlot, Activity, ActivitySelection, TransportType } from '@/types/booking';
import { Users, Car, Minus, Plus } from 'lucide-react';

interface ActivitySelectorProps {
  selectedActivity: ActivitySelection | null;
  slot: TimeSlot;
  onSelect: (selection: ActivitySelection | null) => void;
  guests: number;
  isCheckInDay?: boolean;
  isCheckOutDay?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}

const slotLabels: Record<TimeSlot, string> = {
  morning: '🌅 Morning',
  afternoon: '☀️ Afternoon',
  evening: '🌆 Evening',
  night: '🌙 Night',
};

const ActivitySelector = ({ 
  selectedActivity, 
  slot, 
  onSelect, 
  guests,
  disabled = false,
  disabledMessage,
}: ActivitySelectorProps) => {
  const [expandedActivity, setExpandedActivity] = useState<ActivityType>(null);
  
  const availableActivities = ACTIVITIES.filter(a => a.availableSlots.includes(slot));

  const getActivityPrice = (activity: Activity, participantCount: number): string => {
    if (activity.price === 0) return 'Free';
    if (activity.perPerson) {
      return `₹${(activity.price * participantCount).toLocaleString()} (₹${activity.price}/person)`;
    }
    return `₹${activity.price.toLocaleString()}`;
  };

  const handleActivityClick = (activity: Activity) => {
    if (selectedActivity?.activityId === activity.id) {
      // Deselect
      onSelect(null);
      setExpandedActivity(null);
    } else {
      // Select with default values
      const newSelection: ActivitySelection = {
        activityId: activity.id,
        participants: activity.perPerson ? guests : 1,
        transport: null,
      };
      onSelect(newSelection);
      
      // Expand if has options
      if (activity.perPerson || activity.transportOptions) {
        setExpandedActivity(activity.id);
      } else {
        setExpandedActivity(null);
      }
    }
  };

  const handleParticipantsChange = (delta: number, activity: Activity) => {
    if (!selectedActivity) return;
    
    const newCount = Math.max(1, Math.min(guests, selectedActivity.participants + delta));
    onSelect({
      ...selectedActivity,
      participants: newCount,
    });
  };

  const handleTransportChange = (transport: TransportType) => {
    if (!selectedActivity) return;
    
    onSelect({
      ...selectedActivity,
      transport: selectedActivity.transport === transport ? null : transport,
    });
  };

  if (disabled) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/60">{slotLabels[slot]}</label>
        <div className="p-4 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm italic">
          {disabledMessage || 'Not available'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground/80">{slotLabels[slot]}</label>
      <div className="grid grid-cols-2 gap-2">
        {availableActivities.map((activity) => {
          const isSelected = selectedActivity?.activityId === activity.id;
          const isExpanded = expandedActivity === activity.id && isSelected;
          
          return (
            <div key={activity.id} className="space-y-2">
              <button
                onClick={() => handleActivityClick(activity)}
                className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-wave-orange text-white border-2 border-wave-orange shadow-lg'
                    : 'bg-white text-foreground border border-border hover:bg-muted/50 hover:border-wave-orange/50'
                }`}
              >
                <p className="font-medium text-sm">{activity.name}</p>
                <p className={`text-xs mt-1 ${
                  isSelected ? 'text-white/80' : 'text-muted-foreground'
                }`}>
                  {getActivityPrice(activity, selectedActivity?.participants || guests)}
                </p>
              </button>
              
              {/* Expanded options panel */}
              {isExpanded && (activity.perPerson || activity.transportOptions) && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-3">
                  {/* Participant selector */}
                  {activity.perPerson && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Users className="w-4 h-4" />
                        <span>Participants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleParticipantsChange(-1, activity); }}
                          disabled={selectedActivity.participants <= 1}
                          className="w-7 h-7 rounded-full bg-wave-orange/20 flex items-center justify-center hover:bg-wave-orange/40 transition-colors text-wave-orange disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-semibold text-foreground">
                          {selectedActivity.participants}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleParticipantsChange(1, activity); }}
                          disabled={selectedActivity.participants >= guests}
                          className="w-7 h-7 rounded-full bg-wave-orange flex items-center justify-center hover:bg-wave-orange/90 transition-colors text-white disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Transport selector */}
                  {activity.transportOptions && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Car className="w-4 h-4" />
                        <span>Transport (to & fro)</span>
                      </div>
                      <div className="flex gap-2">
                        {activity.transportOptions.auto && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTransportChange('auto'); }}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              selectedActivity.transport === 'auto'
                                ? 'bg-wave-orange text-white'
                                : 'bg-white border border-border text-foreground hover:border-wave-orange/50'
                            }`}
                          >
                            Auto ₹{activity.transportOptions.auto.toLocaleString()}
                          </button>
                        )}
                        {activity.transportOptions.cab && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTransportChange('cab'); }}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              selectedActivity.transport === 'cab'
                                ? 'bg-wave-orange text-white'
                                : 'bg-white border border-border text-foreground hover:border-wave-orange/50'
                            }`}
                          >
                            Cab ₹{activity.transportOptions.cab.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivitySelector;
