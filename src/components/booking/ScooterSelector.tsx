import { Bike, Plus, Minus } from 'lucide-react';
import { SCOOTER_PRICE_PER_DAY } from '@/types/booking';

interface ScooterSelectorProps {
  scooterDays: number;
  maxDays: number;
  onScooterDaysChange: (days: number) => void;
}

const ScooterSelector = ({ scooterDays, maxDays, onScooterDaysChange }: ScooterSelectorProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
      <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <Bike className="w-5 h-5 text-wave-orange" />
        Need wheels?
      </h3>

      <div className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 border ${
        scooterDays > 0
          ? 'bg-wave-orange/10 border-wave-orange/40'
          : 'bg-muted/50 border-border'
      }`}>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Two Wheeler Rental</p>
          <p className="text-sm text-muted-foreground">Explore Varkala at your own pace</p>
          <p className="text-sm text-wave-orange font-medium mt-1">
            ₹{SCOOTER_PRICE_PER_DAY}/day
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => onScooterDaysChange(Math.max(0, scooterDays - 1))}
            disabled={scooterDays === 0}
            className="w-10 h-10 rounded-full bg-wave-orange/20 flex items-center justify-center hover:bg-wave-orange/40 transition-colors text-wave-orange disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center text-xl font-bold text-foreground">
            {scooterDays}
          </span>
          <button
            onClick={() => onScooterDaysChange(Math.min(maxDays, scooterDays + 1))}
            disabled={scooterDays >= maxDays}
            className="w-10 h-10 rounded-full bg-wave-orange flex items-center justify-center hover:bg-wave-orange/90 transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {scooterDays > 0 && (
        <p className="text-muted-foreground text-sm mt-3 text-center">
          {scooterDays} day{scooterDays > 1 ? 's' : ''} = ₹{(scooterDays * SCOOTER_PRICE_PER_DAY).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default ScooterSelector;
