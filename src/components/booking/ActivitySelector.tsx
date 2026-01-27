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
        <div className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/50 border border-border/50 text-muted-foreground text-sm italic">
          {disabledMessage || 'Not available'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground/90 uppercase tracking-wide">{slotLabels[slot]}</label>
      <div className="grid grid-cols-2 gap-2">
        {availableActivities.map((activity) => {
          const isSelected = selectedActivity?.activityId === activity.id;
          const isExpanded = expandedActivity === activity.id && isSelected;
          
          return (
            <div key={activity.id} className={`space-y-2 ${isExpanded ? 'col-span-2' : ''}`}>
              <button
                onClick={() => handleActivityClick(activity)}
                className={`w-full p-3 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                  isSelected
                    ? 'bg-gradient-to-br from-wave-orange to-orange-600 text-white border-2 border-wave-orange shadow-lg shadow-wave-orange/30'
                    : 'bg-gradient-to-br from-white to-gray-50 text-foreground border-2 border-border/50 hover:border-wave-orange/60 hover:shadow-md hover:shadow-wave-orange/10'
                }`}
              >
                <p className="font-semibold text-sm leading-tight">
                  {activity.name}
                </p>
                {activity.subtext && (
                  <p className={`text-xs leading-tight mt-0.5 ${
                    isSelected ? 'text-white/80' : 'text-muted-foreground'
                  }`}>
                    {activity.subtext}
                  </p>
                )}
                <p className={`text-xs mt-1 ${
                  isSelected ? 'text-white/80' : 'text-muted-foreground'
                }`}>
                  {getActivityPrice(activity, selectedActivity?.participants || guests)}
                </p>
              </button>
              
              {/* Expanded options panel */}
              {isExpanded && (activity.perPerson || activity.transportOptions) && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-wave-orange/5 to-orange-100/50 border-2 border-wave-orange/30 space-y-4 animate-fade-in">
                  {/* Participant selector - stacked layout */}
                  {activity.perPerson && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                        <Users className="w-4 h-4 text-wave-orange" />
                        <span>Participants</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleParticipantsChange(-1, activity); }}
                          disabled={selectedActivity.participants <= 1}
                          className="w-9 h-9 rounded-full bg-wave-orange/20 flex items-center justify-center hover:bg-wave-orange/40 transition-all duration-200 text-wave-orange disabled:opacity-30 hover:scale-110 active:scale-95"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-lg text-foreground">
                          {selectedActivity.participants}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleParticipantsChange(1, activity); }}
                          disabled={selectedActivity.participants >= guests}
                          className="w-9 h-9 rounded-full bg-wave-orange flex items-center justify-center hover:bg-orange-500 transition-all duration-200 text-white disabled:opacity-30 hover:scale-110 active:scale-95 shadow-md shadow-wave-orange/30"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Transport selector */}
                  {activity.transportOptions && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                        <Car className="w-4 h-4 text-wave-orange" />
                        <span>Transport (to & fro)</span>
                      </div>
                      <div className="flex gap-2">
                        {activity.transportOptions.auto && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTransportChange('auto'); }}
                            className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                              selectedActivity.transport === 'auto'
                                ? 'bg-gradient-to-br from-wave-orange to-orange-600 text-white shadow-md shadow-wave-orange/30'
                                : 'bg-white border-2 border-border/50 text-foreground hover:border-wave-orange/50 hover:shadow-sm'
                            }`}
                          >
                            Auto ₹{activity.transportOptions.auto.toLocaleString()}
                          </button>
                        )}
                        {activity.transportOptions.cab && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTransportChange('cab'); }}
                            className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                              selectedActivity.transport === 'cab'
                                ? 'bg-gradient-to-br from-wave-orange to-orange-600 text-white shadow-md shadow-wave-orange/30'
                                : 'bg-white border-2 border-border/50 text-foreground hover:border-wave-orange/50 hover:shadow-sm'
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