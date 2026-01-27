export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export type ActivityType = 
  | 'surf-lesson'
  | 'beach-time'
  | 'cliff-walk'
  | 'toddy-tasting'
  | 'mangrove-kayak'
  | 'jatayu-trip'
  | 'rooftop-dinner'
  | 'nightlife'
  | 'breakfast'
  | 'rest'
  | 'checkout'
  | null;

export interface Activity {
  id: ActivityType;
  name: string;
  price: number;
  duration: string;
  description: string;
  availableSlots: TimeSlot[];
}

export interface DayPlan {
  date: Date;
  morning: ActivityType;
  afternoon: ActivityType;
  evening: ActivityType;
  night: ActivityType;
}

export interface RoomSelection {
  kingRooms: number;
  doubleRooms: number;
  extraBeds: number;
}

export interface BookingState {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  rooms: RoomSelection;
  dayPlans: DayPlan[];
  scooterDays: number;
}

export interface PriceBreakdown {
  roomsTotal: number;
  activitiesTotal: number;
  scooterTotal: number;
  subtotal: number;
  discount: number;
  discountPercentage: number;
  grandTotal: number;
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'surf-lesson',
    name: 'Surf Lesson',
    price: 1500,
    duration: '2 hours',
    description: 'Professional surf instruction',
    availableSlots: ['morning', 'afternoon'],
  },
  {
    id: 'beach-time',
    name: 'Sree Eight Beach',
    price: 0,
    duration: 'Flexible',
    description: 'Relax at our private beach',
    availableSlots: ['morning', 'afternoon', 'evening'],
  },
  {
    id: 'cliff-walk',
    name: 'Cliff Walk',
    price: 0,
    duration: '1-2 hours',
    description: 'Explore Varkala cliffs',
    availableSlots: ['morning', 'afternoon', 'evening'],
  },
  {
    id: 'toddy-tasting',
    name: 'Toddy Tasting',
    price: 500,
    duration: '2 hours',
    description: 'Traditional palm wine experience',
    availableSlots: ['afternoon', 'evening'],
  },
  {
    id: 'mangrove-kayak',
    name: 'Mangrove Kayaking',
    price: 1200,
    duration: '3 hours',
    description: 'Paddle through backwaters',
    availableSlots: ['morning', 'afternoon'],
  },
  {
    id: 'jatayu-trip',
    name: 'Jatayu Earth Center',
    price: 800,
    duration: '4 hours',
    description: 'World\'s largest bird sculpture',
    availableSlots: ['morning', 'afternoon'],
  },
  {
    id: 'rooftop-dinner',
    name: 'Rooftop Dinner',
    price: 2500,
    duration: '2-3 hours',
    description: 'Private cliff-top dining',
    availableSlots: ['evening', 'night'],
  },
  {
    id: 'nightlife',
    name: 'Cliff Nightlife',
    price: 0,
    duration: 'Flexible',
    description: 'Explore Varkala after dark',
    availableSlots: ['night'],
  },
  {
    id: 'breakfast',
    name: "Chechi's Breakfast",
    price: 0,
    duration: '1 hour',
    description: 'Homemade Kerala breakfast',
    availableSlots: ['morning'],
  },
  {
    id: 'rest',
    name: 'Rest & Relax',
    price: 0,
    duration: 'Flexible',
    description: 'Enjoy the property',
    availableSlots: ['morning', 'afternoon', 'evening', 'night'],
  },
];

export const ROOM_PRICES = {
  kingRoom: 4500,
  doubleRoom: 3500,
  extraBed: 800,
};

export const SCOOTER_PRICE_PER_DAY = 400;
