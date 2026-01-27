import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Users, Wifi, Wind, Tv, Coffee, Bath } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface Room {
  id: number;
  name: string;
  size: string;
  capacity: string;
  price: string;
  amenities: string[];
  image: string;
}

const rooms: Room[] = [
  {
    id: 1,
    name: 'King Room with Balcony',
    size: '45 m²',
    capacity: '2-3 Guests',
    price: '₹4,500',
    amenities: ['King Bed', 'Private Balcony', 'Garden View', 'AC', 'Free WiFi', 'Hot Shower'],
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 2,
    name: 'Double Room with Balcony',
    size: '28 m²',
    capacity: '2 Guests',
    price: '₹3,500',
    amenities: ['Double Bed', 'Balcony', 'Garden View', 'AC', 'Free WiFi', 'Hot Shower'],
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
  },
];

const amenityIcons: { [key: string]: React.ReactNode } = {
  'Free WiFi': <Wifi className="w-5 h-5" />,
  'AC': <Wind className="w-5 h-5" />,
  'Hot Shower': <Bath className="w-5 h-5" />,
};

const RoomsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay to ensure proper initialization after Activities section
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        const cards = cardsRef.current?.querySelectorAll('.room-card');

        if (cards) {
          cards.forEach((card) => {
            gsap.fromTo(
              card,
              {
                opacity: 0,
                y: 60,
              },
              {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: card,
                  start: 'top 90%',
                  end: 'top 60%',
                  scrub: false,
                  toggleActions: 'play none none reverse',
                },
              }
            );
          });
        }
      }, sectionRef);

      return () => ctx.revert();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="rooms"
      className="relative py-24 md:py-32 bg-background overflow-hidden z-10"
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-lg font-medium text-wave-orange mb-2">YOUR SANCTUARY</p>
          <h2 className="text-display text-5xl md:text-7xl text-foreground mb-4">
            ROOMS
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Wake up to ocean breezes and waves doing their ASMR thing. You'll sleep so well you'll question if your mattress at home is actively sabotaging you.
          </p>
        </div>

        {/* Room Cards */}
        <div ref={cardsRef} className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto perspective-1000">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="room-card group relative bg-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
            >
              {/* Image */}
              <div className="relative h-64 md:h-80 overflow-hidden">
                <img
                  src={room.image}
                  alt={room.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Price Badge */}
                <div className="absolute top-4 right-4 px-4 py-2 bg-wave-orange text-white font-bold rounded-full">
                  {room.price}/night
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">{room.name}</h3>
                
                <div className="flex items-center gap-4 text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {room.capacity}
                  </span>
                  <span>{room.size}</span>
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {room.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="flex items-center gap-1 px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full"
                    >
                      {amenityIcons[amenity] || null}
                      {amenity}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => {
                    const element = document.querySelector('#itinerary');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-3 bg-wave-orange text-white font-semibold rounded-xl hover:bg-wave-orange-dark transition-colors duration-300"
                >
                  Book This Room
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoomsSection;
