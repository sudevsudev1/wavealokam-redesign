import { 
  BookingState, 
  PriceBreakdown, 
  ACTIVITIES, 
  ROOM_PRICES, 
  SCOOTER_PRICE_PER_DAY,
  ActivityType 
} from '@/types/booking';

export function calculateNights(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const diffTime = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function getDiscountPercentage(nights: number, guests: number): number {
  // Base discount by stay length
  let discount = 0;
  if (nights >= 7) discount = 20;
  else if (nights >= 5) discount = 15;
  else if (nights >= 3) discount = 10;
  
  // Additional discount for larger groups
  if (guests >= 6) discount += 5;
  
  return Math.min(discount, 25); // Cap at 25%
}

export function calculateRoomCapacity(rooms: BookingState['rooms']): number {
  const kingCapacity = rooms.kingRooms * 2;
  const doubleCapacity = rooms.doubleRooms * 2;
  const extraBedCapacity = rooms.extraBeds;
  return kingCapacity + doubleCapacity + extraBedCapacity;
}

export function validateRoomSelection(guests: number, rooms: BookingState['rooms']): boolean {
  return calculateRoomCapacity(rooms) >= guests;
}

export function calculatePriceBreakdown(state: BookingState): PriceBreakdown {
  const nights = calculateNights(state.checkIn, state.checkOut);
  
  // Calculate room costs
  const roomsTotal = (
    (state.rooms.kingRooms * ROOM_PRICES.kingRoom) +
    (state.rooms.doubleRooms * ROOM_PRICES.doubleRoom) +
    (state.rooms.extraBeds * ROOM_PRICES.extraBed)
  ) * nights;
  
  // Calculate activity costs
  let activitiesTotal = 0;
  state.dayPlans.forEach(day => {
    const slots: (ActivityType)[] = [day.morning, day.afternoon, day.evening, day.night];
    slots.forEach(activityId => {
      if (activityId) {
        const activity = ACTIVITIES.find(a => a.id === activityId);
        if (activity) {
          // Multiply by guest count for per-person activities
          const perPerson = ['surf-lesson', 'toddy-tasting', 'mangrove-kayak', 'jatayu-trip'];
          if (perPerson.includes(activityId)) {
            activitiesTotal += activity.price * state.guests;
          } else {
            activitiesTotal += activity.price;
          }
        }
      }
    });
  });
  
  // Calculate scooter costs
  const scooterTotal = state.scooterDays * SCOOTER_PRICE_PER_DAY;
  
  // Calculate totals
  const subtotal = roomsTotal + activitiesTotal + scooterTotal;
  const discountPercentage = getDiscountPercentage(nights, state.guests);
  const discount = Math.round(subtotal * (discountPercentage / 100));
  const grandTotal = subtotal - discount;
  
  return {
    roomsTotal,
    activitiesTotal,
    scooterTotal,
    subtotal,
    discount,
    discountPercentage,
    grandTotal,
  };
}

export function generateWhatsAppMessage(state: BookingState, breakdown: PriceBreakdown): string {
  const nights = calculateNights(state.checkIn, state.checkOut);
  const checkInStr = state.checkIn?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const checkOutStr = state.checkOut?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  
  let message = `🏄 *Wavealokam Booking Request*\n\n`;
  message += `📅 *Dates:* ${checkInStr} → ${checkOutStr} (${nights} nights)\n`;
  message += `👥 *Guests:* ${state.guests}\n\n`;
  
  message += `🛏️ *Rooms:*\n`;
  if (state.rooms.kingRooms > 0) message += `  • King Room: ${state.rooms.kingRooms}\n`;
  if (state.rooms.doubleRooms > 0) message += `  • Double Room: ${state.rooms.doubleRooms}\n`;
  if (state.rooms.extraBeds > 0) message += `  • Extra Beds: ${state.rooms.extraBeds}\n`;
  
  if (state.scooterDays > 0) {
    message += `\n🛵 *Scooter Rental:* ${state.scooterDays} days\n`;
  }
  
  message += `\n💰 *Estimated Total:* ₹${breakdown.grandTotal.toLocaleString()}`;
  if (breakdown.discountPercentage > 0) {
    message += ` (${breakdown.discountPercentage}% discount applied!)`;
  }
  
  return encodeURIComponent(message);
}
