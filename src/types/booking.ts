export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export type ActivityType = 
  | 'surf-lesson'
  | 'beach-time'
  | 'cliff-walk'
  | 'toddy-shop'
  | 'mangrove-kayak'
  | 'jatayu-trip'
  | 'rooftop-dinner'
  | 'nightlife'
  | 'breakfast'
  | 'rest'
  | 'checkout'
  | 'kalari-payattu'
  | 'kalari-massage'
  | 'paragliding'
  | 'padmanabha-temple'
  | null;

export type TransportType = 'auto' | 'cab' | null;

export interface TransportOption {
  auto?: number;
  cab?: number;
}

export interface Activity {
  id: ActivityType;
  name: string;
  price: number;
  duration: string;
  description: string;
  availableSlots: TimeSlot[];
  perPerson: boolean;
  transportOptions?: TransportOption;
  allowWithBreakfast?: boolean; // Can be selected alongside breakfast
}

export interface ActivitySelection {
  activityId: ActivityType;
  participants: number;
  transport: TransportType;
}

export interface DayPlan {
  date: Date;
  morning: ActivitySelection | null;
  morningSecondary: ActivitySelection | null; // For breakfast combo
  afternoon: ActivitySelection | null;
  evening: ActivitySelection | null;
  night: ActivitySelection | null;
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
  transportTotal: number;
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
    perPerson: true,
  },
  {
    id: 'beach-time',
    name: 'Sree Eight Beach',
    price: 0,
    duration: 'Flexible',
    description: 'Relax at our private beach',
    availableSlots: ['morning', 'afternoon', 'evening'],
    perPerson: false,
  },
  {
    id: 'cliff-walk',
    name: 'Cliff Walk',
    price: 0,
    duration: '1-2 hours',
    description: 'Explore Varkala cliffs',
    availableSlots: ['morning', 'afternoon', 'evening'],
    perPerson: false,
  },
  {
    id: 'toddy-shop',
    name: 'Toddy Shop (Restaurant)',
    price: 1000,
    duration: '2 hours',
    description: 'Traditional palm wine experience',
    availableSlots: ['afternoon', 'evening'],
    perPerson: true,
    transportOptions: { auto: 1500, cab: 2000 },
  },
  {
    id: 'mangrove-kayak',
    name: 'Mangrove Kayaking/Adventure Village',
    price: 2000,
    duration: '3 hours',
    description: 'Paddle through backwaters',
    availableSlots: ['morning', 'afternoon'],
    perPerson: true,
    transportOptions: { auto: 1500, cab: 2000 },
  },
  {
    id: 'jatayu-trip',
    name: 'Jatayu Earth Center',
    price: 800,
    duration: '4 hours',
    description: 'World\'s largest bird sculpture',
    availableSlots: ['afternoon'],
    perPerson: true,
    transportOptions: { auto: 1500, cab: 2000 },
  },
  {
    id: 'rooftop-dinner',
    name: 'Rooftop Dinner',
    price: 2500,
    duration: '2-3 hours',
    description: 'Private cliff-top dining',
    availableSlots: ['evening', 'night'],
    perPerson: false,
  },
  {
    id: 'nightlife',
    name: 'Cliff Nightlife',
    price: 0,
    duration: 'Flexible',
    description: 'Explore Varkala after dark',
    availableSlots: ['night'],
    perPerson: false,
    transportOptions: { auto: 500 },
  },
  {
    id: 'breakfast',
    name: "Chechi's Breakfast",
    price: 0,
    duration: '1 hour',
    description: 'Homemade Kerala breakfast',
    availableSlots: ['morning'],
    perPerson: false,
    allowWithBreakfast: true,
  },
  {
    id: 'rest',
    name: 'Rest & Relax',
    price: 0,
    duration: 'Flexible',
    description: 'Enjoy the property',
    availableSlots: ['morning', 'afternoon', 'evening', 'night'],
    perPerson: false,
  },
  {
    id: 'kalari-payattu',
    name: 'Kalari Payattu Session',
    price: 500,
    duration: '1.5 hours',
    description: 'With Ojaswi Kalari and Wellness Centre',
    availableSlots: ['morning', 'evening'],
    perPerson: true,
    transportOptions: { auto: 500 },
  },
  {
    id: 'kalari-massage',
    name: 'Kalari Marma Therapy/Massage',
    price: 2000,
    duration: '1-2 hours',
    description: 'With Ojaswi Kalari and Wellness Centre',
    availableSlots: ['morning', 'afternoon', 'evening'],
    perPerson: true,
    transportOptions: { auto: 500 },
  },
  {
    id: 'paragliding',
    name: 'Paragliding with Fly Varkala',
    price: 4500,
    duration: '30 mins',
    description: 'Soar above the cliffs',
    availableSlots: ['evening'],
    perPerson: false, // per session
    transportOptions: { auto: 1000 },
  },
  {
    id: 'padmanabha-temple',
    name: 'Padmanabha Swami Temple',
    price: 0,
    duration: '3-4 hours',
    description: 'Visit the famous temple in Trivandrum',
    availableSlots: ['morning', 'afternoon'],
    perPerson: false,
    transportOptions: { auto: 1500, cab: 2000 },
  },
];

export const ROOM_PRICES = {
  kingRoom: 4500,
  doubleRoom: 3500,
  extraBed: 1500,
};

export const SCOOTER_PRICE_PER_DAY = 500;
