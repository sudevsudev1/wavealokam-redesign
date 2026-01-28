import { 
  BookingState, 
  PriceBreakdown, 
  ACTIVITIES, 
  ROOM_PRICES, 
  SCOOTER_PRICE_PER_DAY,
  ActivitySelection
} from '@/types/booking';
import { GuestDetails } from '@/components/booking/GuestDetailsForm';

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

function calculateActivityCost(selection: ActivitySelection | null): { activityCost: number; transportCost: number } {
  if (!selection || !selection.activityId) {
    return { activityCost: 0, transportCost: 0 };
  }
  
  const activity = ACTIVITIES.find(a => a.id === selection.activityId);
  if (!activity) {
    return { activityCost: 0, transportCost: 0 };
  }
  
  // Calculate activity cost
  let activityCost = 0;
  if (activity.perPerson) {
    activityCost = activity.price * selection.participants;
  } else {
    activityCost = activity.price;
  }
  
  // Calculate transport cost
  let transportCost = 0;
  if (selection.transport && activity.transportOptions) {
    if (selection.transport === 'auto' && activity.transportOptions.auto) {
      transportCost = activity.transportOptions.auto;
    } else if (selection.transport === 'cab' && activity.transportOptions.cab) {
      transportCost = activity.transportOptions.cab;
    }
  }
  
  return { activityCost, transportCost };
}

export function calculatePriceBreakdown(state: BookingState): PriceBreakdown {
  const nights = calculateNights(state.checkIn, state.checkOut);
  
  // Calculate room costs
  const roomsTotal = (
    (state.rooms.kingRooms * ROOM_PRICES.kingRoom) +
    (state.rooms.doubleRooms * ROOM_PRICES.doubleRoom) +
    (state.rooms.extraBeds * ROOM_PRICES.extraBed)
  ) * nights;
  
  // Calculate activity and transport costs
  let activitiesTotal = 0;
  let transportTotal = 0;
  
  state.dayPlans.forEach(day => {
    const slots: (ActivitySelection | null)[] = [
      day.morning,
      day.morningSecondary,
      day.afternoon,
      day.evening,
      day.night
    ];
    
    slots.forEach(selection => {
      const { activityCost, transportCost } = calculateActivityCost(selection);
      activitiesTotal += activityCost;
      transportTotal += transportCost;
    });
  });
  
  // Calculate scooter costs
  const scooterTotal = state.scooterDays * SCOOTER_PRICE_PER_DAY;
  
  // Calculate totals
  const subtotal = roomsTotal + activitiesTotal + transportTotal + scooterTotal;
  const discountPercentage = getDiscountPercentage(nights, state.guests);
  const discount = Math.round(subtotal * (discountPercentage / 100));
  const grandTotal = subtotal - discount;
  
  return {
    roomsTotal,
    activitiesTotal,
    transportTotal,
    scooterTotal,
    subtotal,
    discount,
    discountPercentage,
    grandTotal,
  };
}

export function generateWhatsAppMessage(state: BookingState, breakdown: PriceBreakdown, guestDetails?: GuestDetails): string {
  const nights = calculateNights(state.checkIn, state.checkOut);
  const checkInStr = state.checkIn?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const checkOutStr = state.checkOut?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  
  let message = `🏄 *Wavealokam Booking Request*\n\n`;
  
  // Add guest details if provided
  if (guestDetails && guestDetails.name) {
    message += `👤 *Guest Details:*\n`;
    message += `  • Name: ${guestDetails.name}\n`;
    message += `  • Email: ${guestDetails.email}\n`;
    message += `  • Phone: ${guestDetails.phone}\n\n`;
  }
  
  message += `📅 *Dates:* ${checkInStr} → ${checkOutStr} (${nights} nights)\n`;
  message += `👥 *Guests:* ${state.guests}\n\n`;
  
  message += `🛏️ *Rooms:*\n`;
  if (state.rooms.kingRooms > 0) message += `  • King Room: ${state.rooms.kingRooms}\n`;
  if (state.rooms.doubleRooms > 0) message += `  • Double Room: ${state.rooms.doubleRooms}\n`;
  if (state.rooms.extraBeds > 0) message += `  • Extra Beds: ${state.rooms.extraBeds}\n`;
  
  if (state.scooterDays > 0) {
    message += `\n🛵 *Scooter Rental:* ${state.scooterDays} days\n`;
  }
  
  // Add activities summary
  const activitiesSelected: string[] = [];
  state.dayPlans.forEach((day, i) => {
    const slots = [day.morning, day.morningSecondary, day.afternoon, day.evening, day.night];
    slots.forEach(selection => {
      if (selection?.activityId) {
        const activity = ACTIVITIES.find(a => a.id === selection.activityId);
        if (activity && activity.price > 0) {
          activitiesSelected.push(`Day ${i + 1}: ${activity.name} (${selection.participants} pax)`);
        }
      }
    });
  });
  
  if (activitiesSelected.length > 0) {
    message += `\n🎯 *Activities:*\n`;
    activitiesSelected.forEach(a => { message += `  • ${a}\n`; });
  }
  
  message += `\n💰 *Estimated Total:* Rs.${breakdown.grandTotal.toLocaleString()}`;
  if (breakdown.discountPercentage > 0) {
    message += ` (${breakdown.discountPercentage}% discount applied!)`;
  }
  
  return encodeURIComponent(message);
}
