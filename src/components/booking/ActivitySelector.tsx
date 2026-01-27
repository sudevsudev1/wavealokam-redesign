import { ACTIVITIES, ActivityType, TimeSlot, Activity } from '@/types/booking';

interface ActivitySelectorProps {
  selectedActivity: ActivityType;
  slot: TimeSlot;
  onSelect: (activity: ActivityType) => void;
  guests: number;
}

const slotLabels: Record<TimeSlot, string> = {
  morning: '🌅 Morning',
  afternoon: '☀️ Afternoon',
  evening: '🌆 Evening',
  night: '🌙 Night',
};

const ActivitySelector = ({ selectedActivity, slot, onSelect, guests }: ActivitySelectorProps) => {
  const availableActivities = ACTIVITIES.filter(a => a.availableSlots.includes(slot));

  const getActivityPrice = (activity: Activity): string => {
    if (activity.price === 0) return 'Free';
    const perPerson = ['surf-lesson', 'toddy-tasting', 'mangrove-kayak', 'jatayu-trip'];
    if (perPerson.includes(activity.id!)) {
      return `₹${(activity.price * guests).toLocaleString()} (₹${activity.price}/person)`;
    }
    return `₹${activity.price.toLocaleString()}`;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/80">{slotLabels[slot]}</label>
      <div className="grid grid-cols-2 gap-2">
        {availableActivities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => onSelect(selectedActivity === activity.id ? null : activity.id)}
            className={`p-3 rounded-xl text-left transition-all duration-200 ${
              selectedActivity === activity.id
                ? 'bg-white text-wave-orange border-2 border-white shadow-lg'
                : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
            }`}
          >
            <p className="font-medium text-sm">{activity.name}</p>
            <p className={`text-xs mt-1 ${
              selectedActivity === activity.id ? 'text-wave-orange/70' : 'text-white/60'
            }`}>
              {getActivityPrice(activity)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActivitySelector;
