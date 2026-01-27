import { Bike, Plus, Minus } from 'lucide-react';
import { SCOOTER_PRICE_PER_DAY } from '@/types/booking';

interface ScooterSelectorProps {
  scooterDays: number;
  maxDays: number;
  onScooterDaysChange: (days: number) => void;
}

const ScooterSelector = ({ scooterDays, maxDays, onScooterDaysChange }: ScooterSelectorProps) => {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Bike className="w-5 h-5" />
        Need wheels?
      </h3>

      <div className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
        scooterDays > 0
          ? 'bg-white/20 border-2 border-white/40'
          : 'bg-white/5 border border-white/10'
      }`}>
        <div className="flex-1">
          <p className="font-semibold text-white">Two Wheeler Rental</p>
          <p className="text-sm text-white/60">Explore Varkala at your own pace</p>
          <p className="text-sm text-white/80 mt-1">
            ₹{SCOOTER_PRICE_PER_DAY}/day
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => onScooterDaysChange(Math.max(0, scooterDays - 1))}
            disabled={scooterDays === 0}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center text-xl font-bold text-white">
            {scooterDays}
          </span>
          <button
            onClick={() => onScooterDaysChange(Math.min(maxDays, scooterDays + 1))}
            disabled={scooterDays >= maxDays}
            className="w-10 h-10 rounded-full bg-white text-wave-orange flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {scooterDays > 0 && (
        <p className="text-white/60 text-sm mt-3 text-center">
          {scooterDays} day{scooterDays > 1 ? 's' : ''} = ₹{(scooterDays * SCOOTER_PRICE_PER_DAY).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default ScooterSelector;
