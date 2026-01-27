import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { addDays, differenceInDays } from 'date-fns';
import { Calculator } from 'lucide-react';

import { BookingState, DayPlan, TimeSlot, ActivityType } from '@/types/booking';
import { 
  calculateNights, 
  calculatePriceBreakdown, 
  validateRoomSelection,
  generateWhatsAppMessage 
} from '@/utils/bookingCalculator';

import DateGuestSelector from './booking/DateGuestSelector';
import RoomSelector from './booking/RoomSelector';
import ScooterSelector from './booking/ScooterSelector';
import DayPlanner from './booking/DayPlanner';
import PriceSummary from './booking/PriceSummary';
import OTAIcons from './OTAIcons';

gsap.registerPlugin(ScrollTrigger);

const BookingWizard = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const [bookingState, setBookingState] = useState<BookingState>({
    checkIn: null,
    checkOut: null,
    guests: 2,
    rooms: {
      kingRooms: 1,
      doubleRooms: 0,
      extraBeds: 0,
    },
    dayPlans: [],
    scooterDays: 0,
  });

  // Generate day plans when dates change
  useEffect(() => {
    if (bookingState.checkIn && bookingState.checkOut) {
      const nights = differenceInDays(bookingState.checkOut, bookingState.checkIn);
      const newDayPlans: DayPlan[] = [];
      
      for (let i = 0; i < nights; i++) {
        const existingPlan = bookingState.dayPlans[i];
        newDayPlans.push({
          date: addDays(bookingState.checkIn, i),
          morning: existingPlan?.morning || null,
          afternoon: existingPlan?.afternoon || null,
          evening: existingPlan?.evening || null,
          night: existingPlan?.night || null,
        });
      }
      
      setBookingState(prev => ({ ...prev, dayPlans: newDayPlans }));
    }
  }, [bookingState.checkIn, bookingState.checkOut]);

  const updateDayPlan = (dayIndex: number, slot: TimeSlot, activity: ActivityType) => {
    setBookingState(prev => ({
      ...prev,
      dayPlans: prev.dayPlans.map((plan, i) =>
        i === dayIndex ? { ...plan, [slot]: activity } : plan
      ),
    }));
  };

  const nights = calculateNights(bookingState.checkIn, bookingState.checkOut);
  const breakdown = calculatePriceBreakdown(bookingState);
  const isValid = bookingState.checkIn && 
                  bookingState.checkOut && 
                  validateRoomSelection(bookingState.guests, bookingState.rooms);

  const handleBookNow = () => {
    const message = generateWhatsAppMessage(bookingState, breakdown);
    window.open(`https://wa.me/+919539800445?text=${message}`, '_blank');
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.booking-wizard-card',
        { opacity: 0, y: 100, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="itinerary"
      className="relative py-24 md:py-32 bg-wave-orange overflow-hidden"
    >
      <div className="container mx-auto px-4">
        {/* OTA Icons */}
        <div className="mb-12 p-6 bg-white/10 backdrop-blur-sm rounded-2xl">
          <p className="text-center text-white font-medium mb-4">
            Book directly on your preferred platform
          </p>
          <OTAIcons darkMode={true} />
        </div>

        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-lg font-medium text-white/80 mb-2">PLAN YOUR STAY</p>
          <h2 className="text-display text-5xl md:text-7xl text-white mb-4">
            BUILD YOUR ITINERARY
          </h2>
          <p className="text-base md:text-lg text-white/80 max-w-3xl mx-auto px-4">
            Our itinerary app lets you customize everything - rooms, surf lessons, toddy tastings, beach time, costs. Plot it all out perfectly, then discover you've scheduled six days of activities into a two-day trip. Math is hard. Varkala is harder to leave.
          </p>
        </div>

        {/* Booking Wizard */}
        <div className="booking-wizard-card max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Selections */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Card */}
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl">
                    <Calculator className="w-8 h-8 text-wave-orange" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Itinerary Calculator</h3>
                    <p className="text-white/80">Add items to calculate your stay</p>
                  </div>
                </div>
              </div>

              {/* Date & Guest Selection */}
              <DateGuestSelector
                checkIn={bookingState.checkIn}
                checkOut={bookingState.checkOut}
                guests={bookingState.guests}
                onCheckInChange={(date) => setBookingState(prev => ({ ...prev, checkIn: date }))}
                onCheckOutChange={(date) => setBookingState(prev => ({ ...prev, checkOut: date }))}
                onGuestsChange={(guests) => setBookingState(prev => ({ ...prev, guests }))}
              />

              {/* Room Selection */}
              <RoomSelector
                rooms={bookingState.rooms}
                guests={bookingState.guests}
                onRoomsChange={(rooms) => setBookingState(prev => ({ ...prev, rooms }))}
              />

              {/* Scooter Selection */}
              <ScooterSelector
                scooterDays={bookingState.scooterDays}
                maxDays={nights || 7}
                onScooterDaysChange={(days) => setBookingState(prev => ({ ...prev, scooterDays: days }))}
              />

              {/* Day Planners */}
              {bookingState.dayPlans.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    🗓️ Plan Your Days
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookingState.dayPlans.map((dayPlan, index) => (
                      <DayPlanner
                        key={index}
                        dayPlan={dayPlan}
                        dayNumber={index + 1}
                        guests={bookingState.guests}
                        onUpdate={(slot, activity) => updateDayPlan(index, slot, activity)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Price Summary */}
            <div className="lg:col-span-1">
              <PriceSummary
                breakdown={breakdown}
                nights={nights}
                onBookNow={handleBookNow}
                isValid={!!isValid}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingWizard;
