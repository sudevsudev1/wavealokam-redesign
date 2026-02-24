import { Bed, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import { RoomSelection, ROOM_PRICES } from '@/types/booking';
import { calculateRoomCapacity, validateRoomSelection } from '@/utils/bookingCalculator';

interface RoomSelectorProps {
  rooms: RoomSelection;
  guests: number;
  onRoomsChange: (rooms: RoomSelection) => void;
}

const RoomSelector = ({ rooms, guests, onRoomsChange }: RoomSelectorProps) => {
  const capacity = calculateRoomCapacity(rooms);
  const isValid = validateRoomSelection(guests, rooms);

  const updateRoom = (key: keyof RoomSelection, delta: number) => {
    const newValue = Math.max(0, rooms[key] + delta);
    onRoomsChange({ ...rooms, [key]: newValue });
  };

  const roomTypes = [
    {
      key: 'kingRooms' as keyof RoomSelection,
      name: 'King Room with Balcony',
      price: ROOM_PRICES.kingRoom,
      capacity: 2,
      description: '45 m² (Room area includes balcony) • Garden view',
    },
    {
      key: 'doubleRooms' as keyof RoomSelection,
      name: 'Double Room with Balcony',
      price: ROOM_PRICES.doubleRoom,
      capacity: 2,
      description: '28 m² (Room area includes balcony) • Garden view',
    },
    {
      key: 'extraBeds' as keyof RoomSelection,
      name: 'Extra Bed',
      price: ROOM_PRICES.extraBed,
      capacity: 1,
      description: 'Added to any room',
    },
  ];

  return (
    <div id="room-selector-section" className="bg-white rounded-2xl p-6 border border-border shadow-sm">
      <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <Bed className="w-5 h-5 text-wave-orange" />
        Choose your rooms
      </h3>

      {/* Capacity Indicator */}
      <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
        isValid ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        {isValid ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <AlertCircle className="w-5 h-5" />
        )}
        <span className="text-sm">
          Capacity: {capacity} of {guests} guests
          {!isValid && ' — Add more rooms!'}
        </span>
      </div>

      <div className="space-y-4">
        {roomTypes.map((room) => (
          <div
            key={room.key}
            className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 border ${
              rooms[room.key] > 0
                ? 'bg-wave-orange/10 border-wave-orange/40'
                : 'bg-muted/50 border-border'
            }`}
          >
            <div className="flex-1">
              <p className="font-semibold text-foreground">{room.name}</p>
              <p className="text-sm text-muted-foreground">{room.description}</p>
              <p className="text-sm text-wave-orange font-medium mt-1">
                ₹{room.price.toLocaleString()}/night • Sleeps {room.capacity}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateRoom(room.key, -1)}
                disabled={rooms[room.key] === 0}
                className="w-10 h-10 rounded-full bg-wave-orange/20 flex items-center justify-center hover:bg-wave-orange/40 transition-colors text-wave-orange disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-xl font-bold text-foreground">
                {rooms[room.key]}
              </span>
              <button
                onClick={() => updateRoom(room.key, 1)}
                className="w-10 h-10 rounded-full bg-wave-orange flex items-center justify-center hover:bg-wave-orange/90 transition-colors text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomSelector;
