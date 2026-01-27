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
      description: 'Garden view, ensuite bathroom',
    },
    {
      key: 'doubleRooms' as keyof RoomSelection,
      name: 'Double Room with Balcony',
      price: ROOM_PRICES.doubleRoom,
      capacity: 2,
      description: 'Garden view, ensuite bathroom',
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
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Bed className="w-5 h-5" />
        Choose your rooms
      </h3>

      {/* Capacity Indicator */}
      <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
        isValid ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
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
            className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
              rooms[room.key] > 0
                ? 'bg-white/20 border-2 border-white/40'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            <div className="flex-1">
              <p className="font-semibold text-white">{room.name}</p>
              <p className="text-sm text-white/60">{room.description}</p>
              <p className="text-sm text-white/80 mt-1">
                ₹{room.price.toLocaleString()}/night • Sleeps {room.capacity}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateRoom(room.key, -1)}
                disabled={rooms[room.key] === 0}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-xl font-bold text-white">
                {rooms[room.key]}
              </span>
              <button
                onClick={() => updateRoom(room.key, 1)}
                className="w-10 h-10 rounded-full bg-white text-wave-orange flex items-center justify-center hover:bg-white/90 transition-colors"
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
