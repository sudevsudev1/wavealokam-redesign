import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus, Minus, Bed, Users, Bike, Calendar, Calculator } from 'lucide-react';
import OTAIcons from './OTAIcons';

gsap.registerPlugin(ScrollTrigger);

interface BookingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  icon: React.ReactNode;
}

const ItineraryBuilder = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [nights, setNights] = useState(2);
  const [items, setItems] = useState<BookingItem[]>([
    { id: 'king-room', name: 'King Room with Balcony', price: 4500, quantity: 1, icon: <Bed className="w-5 h-5" /> },
    { id: 'double-room', name: 'Double Room with Balcony', price: 3500, quantity: 0, icon: <Bed className="w-5 h-5" /> },
    { id: 'extra-bed', name: 'Extra Bed', price: 800, quantity: 0, icon: <Users className="w-5 h-5" /> },
    { id: 'two-wheeler', name: 'Two Wheeler Rental', price: 400, quantity: 0, icon: <Bike className="w-5 h-5" /> },
  ]);

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
    ));
  };

  const totalPerNight = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grandTotal = totalPerNight * nights;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.itinerary-card',
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

  const handleBookNow = () => {
    const message = encodeURIComponent(
      `Hi! I'd like to book:\n` +
      `- Nights: ${nights}\n` +
      items.filter(i => i.quantity > 0).map(i => `- ${i.name}: ${i.quantity}`).join('\n') +
      `\n\nTotal: ₹${grandTotal.toLocaleString()}`
    );
    window.open(`https://wa.me/+919539800445?text=${message}`, '_blank');
  };

  return (
    <section
      ref={sectionRef}
      id="itinerary"
      className="relative py-24 md:py-32 bg-background overflow-hidden"
    >
      <div className="container mx-auto px-4">
        {/* OTA Icons above itinerary */}
        <div className="mb-12">
          <p className="text-center text-muted-foreground mb-4">Book directly on your preferred platform</p>
          <OTAIcons />
        </div>

        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-lg font-medium text-wave-orange mb-2">PLAN YOUR STAY</p>
          <h2 className="text-display text-5xl md:text-7xl text-foreground mb-4">
            BUILD YOUR ITINERARY
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto px-4">
            Our itinerary app lets you customize everything - rooms, surf lessons, toddy tastings, beach time, costs. Plot it all out perfectly, then discover you've scheduled six days of activities into a two-day trip. Math is hard. Varkala is harder to leave.
          </p>
        </div>

        {/* Builder Card */}
        <div className="itinerary-card max-w-2xl mx-auto bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-wave-orange p-6 text-white">
            <div className="flex items-center gap-3">
              <Calculator className="w-8 h-8" />
              <div>
                <h3 className="text-2xl font-bold">Itinerary Calculator</h3>
                <p className="text-white/80">Add items to calculate your stay</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Nights Selector */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-wave-orange" />
                <span className="font-medium">Number of Nights</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNights(Math.max(1, nights - 1))}
                  className="w-10 h-10 rounded-full bg-wave-orange text-white flex items-center justify-center hover:bg-wave-orange-dark transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-12 text-center text-xl font-bold">{nights}</span>
                <button
                  onClick={() => setNights(nights + 1)}
                  className="w-10 h-10 rounded-full bg-wave-orange text-white flex items-center justify-center hover:bg-wave-orange-dark transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                    item.quantity > 0
                      ? 'bg-wave-orange/10 border-wave-orange'
                      : 'bg-muted border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.quantity > 0 ? 'bg-wave-orange text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">₹{item.price.toLocaleString()}/night</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/40 transition-colors"
                      disabled={item.quantity === 0}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 rounded-full bg-wave-orange text-white flex items-center justify-center hover:bg-wave-orange-dark transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-6 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Per Night</span>
                <span className="font-medium">₹{totalPerNight.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-bold">
                <span>Grand Total ({nights} nights)</span>
                <span className="text-wave-orange">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Book Button */}
            <button
              onClick={handleBookNow}
              disabled={totalPerNight === 0}
              className="w-full py-4 bg-wave-orange text-white font-bold text-lg rounded-xl hover:bg-wave-orange-dark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed pulse-glow"
            >
              Book on WhatsApp
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ItineraryBuilder;
