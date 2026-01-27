import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Users, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateGuestSelectorProps {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  onCheckInChange: (date: Date | null) => void;
  onCheckOutChange: (date: Date | null) => void;
  onGuestsChange: (guests: number) => void;
}

const DateGuestSelector = ({
  checkIn,
  checkOut,
  guests,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
}: DateGuestSelectorProps) => {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  const handleCheckInSelect = (date: Date | undefined) => {
    if (date) {
      onCheckInChange(date);
      // Auto-set checkout to next day if not set or before check-in
      if (!checkOut || checkOut <= date) {
        onCheckOutChange(addDays(date, 1));
      }
      setCheckInOpen(false);
    }
  };

  const handleCheckOutSelect = (date: Date | undefined) => {
    if (date) {
      onCheckOutChange(date);
      setCheckOutOpen(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <CalendarIcon className="w-5 h-5" />
        When are you visiting?
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Check-in Date */}
        <div>
          <label className="text-white/80 text-sm mb-2 block">Check-in</label>
          <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white",
                  !checkIn && "text-white/60"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkIn ? format(checkIn, "MMM d, yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={checkIn || undefined}
                onSelect={handleCheckInSelect}
                disabled={(date) => date < new Date()}
                initialFocus
                className="p-3 pointer-events-auto bg-white"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Check-out Date */}
        <div>
          <label className="text-white/80 text-sm mb-2 block">Check-out</label>
          <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white",
                  !checkOut && "text-white/60"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOut ? format(checkOut, "MMM d, yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={checkOut || undefined}
                onSelect={handleCheckOutSelect}
                disabled={(date) => date <= (checkIn || new Date())}
                initialFocus
                className="p-3 pointer-events-auto bg-white"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Guest Count */}
        <div>
          <label className="text-white/80 text-sm mb-2 block">Guests</label>
          <div className="flex items-center justify-between bg-white/20 border border-white/30 rounded-md px-3 py-2">
            <button
              onClick={() => onGuestsChange(Math.max(1, guests - 1))}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-white">
              <Users className="w-4 h-4" />
              <span className="font-bold text-lg">{guests}</span>
            </div>
            <button
              onClick={() => onGuestsChange(Math.min(12, guests + 1))}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateGuestSelector;
