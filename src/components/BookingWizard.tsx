import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { addDays, differenceInDays } from 'date-fns';
import { Calculator } from 'lucide-react';
import { BookingState, DayPlan, TimeSlot, ActivitySelection } from '@/types/booking';
import { calculateNights, calculatePriceBreakdown, validateRoomSelection, generateWhatsAppMessage } from '@/utils/bookingCalculator';
import DateGuestSelector from './booking/DateGuestSelector';
import RoomSelector from './booking/RoomSelector';
import ScooterSelector from './booking/ScooterSelector';
import DayPlanner from './booking/DayPlanner';
import PriceSummary from './booking/PriceSummary';
import OTAIcons from './OTAIcons';
import GuestDetailsForm, { GuestDetails } from './booking/GuestDetailsForm';

gsap.registerPlugin(ScrollTrigger);

const BookingWizard = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({
    name: '',
    email: '',
    phone: ''
  });
  const [bookingState, setBookingState] = useState<BookingState>({
    checkIn: null,
    checkOut: null,
    guests: 2,
    rooms: {
      kingRooms: 1,
      doubleRooms: 0,
      extraBeds: 0
    },
    dayPlans: [],
    scooterDays: 0
  });

  // Generate day plans when dates change
  useEffect(() => {
    if (bookingState.checkIn && bookingState.checkOut) {
      const nights = differenceInDays(bookingState.checkOut, bookingState.checkIn);
      const newDayPlans: DayPlan[] = [];

      // We need nights + 1 days (e.g., 2 nights = 3 days: check-in day, full day, check-out day)
      for (let i = 0; i <= nights; i++) {
        const existingPlan = bookingState.dayPlans[i];
        newDayPlans.push({
          date: addDays(bookingState.checkIn, i),
          morning: existingPlan?.morning || null,
          morningSecondary: existingPlan?.morningSecondary || null,
          afternoon: existingPlan?.afternoon || null,
          evening: existingPlan?.evening || null,
          night: existingPlan?.night || null
        });
      }
      setBookingState(prev => ({
        ...prev,
        dayPlans: newDayPlans
      }));
    }
  }, [bookingState.checkIn, bookingState.checkOut]);

  const updateDayPlan = (dayIndex: number, slot: TimeSlot, selection: ActivitySelection | null) => {
    setBookingState(prev => ({
      ...prev,
      dayPlans: prev.dayPlans.map((plan, i) => {
        if (i !== dayIndex) return plan;
        return {
          ...plan,
          [slot]: selection
        };
      })
    }));
  };

  const nights = calculateNights(bookingState.checkIn, bookingState.checkOut);
  const breakdown = calculatePriceBreakdown(bookingState);
  const isValid = bookingState.checkIn && bookingState.checkOut && validateRoomSelection(bookingState.guests, bookingState.rooms);
  
  // Check if guest details are filled
  const areGuestDetailsFilled = guestDetails.name.trim() !== '' && 
    guestDetails.email.trim() !== '' && 
    guestDetails.phone.trim() !== '';
  
  // Validate email format
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestDetails.email.trim());
  
  // Validate phone format
  const isPhoneValid = /^[+]?[0-9]{10,15}$/.test(guestDetails.phone.replace(/[\s-]/g, ''));
  
  const areGuestDetailsValid = areGuestDetailsFilled && isEmailValid && isPhoneValid;

  const handleBookNow = () => {
    const message = generateWhatsAppMessage(bookingState, breakdown, guestDetails);
    window.open(`https://wa.me/+919323858013?text=${message}`, '_blank');
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.booking-wizard-card', {
        opacity: 0,
        y: 100,
        scale: 0.95
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%'
        }
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="itinerary" className="relative py-24 md:py-32 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #fef3e2 0%, #fde6c4 30%, #fcd9a8 60%, #fef3e2 100%)'
    }}>
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-wave-orange/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse" style={{
          animationDelay: '1s'
        }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-wave-orange/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* OTA Icons */}
        <div className="mb-12 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-wave-orange/20 shadow-lg">
          <p className="text-center text-foreground font-semibold mb-4">
            Book directly on your preferred platform
          </p>
          <OTAIcons darkMode={false} />
        </div>

        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-lg font-bold text-wave-orange mb-2 tracking-widest uppercase">PLAN YOUR STAY</p>
          <h2 className="text-display text-5xl md:text-7xl text-foreground mb-6 drop-shadow-sm">
            BUILD YOUR ITINERARY
          </h2>
          <p className="text-sm md:text-base text-foreground/80 max-w-4xl mx-auto px-4 leading-relaxed">
            Your beachside retreat in Varkala, Kerala, where "I'm just here for two days" is the most adorable lie we too had once said. Cost estimates to help you budget and plan your time before Varkala makes you irrational. We connect you directly with vendors and cab/auto at cost price. We are not middlemen. We only handle logistics, so you can handle having fun. Also this isn't a booking engine, availability is a beautiful mystery, room rates are seasonal like fashion trends, and you'll need to actually book via WhatsApp or an OTA like a normal person. We're curators, not wizards.
          </p>
        </div>

        {/* Booking Wizard */}
        <div className="booking-wizard-card max-w-6xl mx-auto">
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-wave-orange to-orange-500 rounded-2xl p-6 shadow-xl shadow-wave-orange/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/90 rounded-xl shadow-md">
                  <Calculator className="w-8 h-8 text-wave-orange" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white drop-shadow-sm">Itinerary Calculator</h3>
                  <p className="text-white/90">Plan your perfect Varkala trip</p>
                </div>
              </div>
            </div>

            {/* Guest Details Form - NEW */}
            <GuestDetailsForm 
              guestDetails={guestDetails}
              onGuestDetailsChange={setGuestDetails}
            />

            {/* Date & Guest Selection */}
            <DateGuestSelector checkIn={bookingState.checkIn} checkOut={bookingState.checkOut} guests={bookingState.guests} onCheckInChange={date => setBookingState(prev => ({
              ...prev,
              checkIn: date
            }))} onCheckOutChange={date => setBookingState(prev => ({
              ...prev,
              checkOut: date
            }))} onGuestsChange={guests => setBookingState(prev => ({
              ...prev,
              guests
            }))} />

            {/* Room Selection */}
            <RoomSelector rooms={bookingState.rooms} guests={bookingState.guests} onRoomsChange={rooms => setBookingState(prev => ({
              ...prev,
              rooms
            }))} />

            {/* Scooter Selection */}
            <ScooterSelector scooterDays={bookingState.scooterDays} maxDays={nights || 7} onScooterDaysChange={days => setBookingState(prev => ({
              ...prev,
              scooterDays: days
            }))} />

            {/* Day Planners */}
            {bookingState.dayPlans.length > 0 && <div id="day-planner-section" className="mb-24">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                🗓️ Plan Your Days
              </h3>
              <div className="space-y-4">
                {bookingState.dayPlans.map((dayPlan, index) => <DayPlanner key={index} dayPlan={dayPlan} dayNumber={index + 1} totalDays={bookingState.dayPlans.length} guests={bookingState.guests} onUpdate={(slot, selection) => updateDayPlan(index, slot, selection)} animationDelay={index * 100} />)}
              </div>
            </div>}
          </div>
        </div>
        
        {/* Spacer to push PriceSummary static position to just above footer */}
        <div className="h-32" />
      </div>

      {/* Price Summary - Rendered outside the container for proper fixed positioning */}
      <PriceSummary 
        breakdown={breakdown} 
        nights={nights} 
        onBookNow={handleBookNow} 
        isValid={!!isValid} 
        bookingState={bookingState}
        guestDetails={guestDetails}
        areGuestDetailsValid={areGuestDetailsValid}
      />
    </section>
  );
};

export default BookingWizard;
