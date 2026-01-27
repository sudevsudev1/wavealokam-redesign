import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, Heart, Users2 } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const partners = [
  { name: "God's Own Country Kitchen", specialty: 'Authentic Kerala Cuisine' },
  { name: 'Blue Water', specialty: 'Fresh Seafood' },
];

const DiningSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const elements = contentRef.current?.querySelectorAll('.animate-in');

      if (elements) {
        elements.forEach((el, index) => {
          gsap.fromTo(
            el,
            {
              opacity: 0,
              x: index % 2 === 0 ? -50 : 50,
            },
            {
              opacity: 1,
              x: 0,
              duration: 1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 80%',
                end: 'top 50%',
                scrub: 1,
              },
            }
          );
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="dining"
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&q=80&w=1920')`,
        }}
      />
      <div className="absolute inset-0 bg-black/70" />

      <div ref={contentRef} className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="animate-in text-lg font-medium text-wave-orange mb-2">CULINARY EXPERIENCE</p>
          <h2 className="animate-in text-display text-5xl md:text-7xl text-white mb-4">
            DINING
          </h2>
          <p className="animate-in text-lg text-white/80 max-w-2xl mx-auto">
            From private rooftop dinners under the stars to beachside breakfasts, every meal is an experience.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <div className="animate-in text-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <MapPin className="w-12 h-12 text-wave-orange mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Rooftop Setting</h3>
            <p className="text-white/70">Cliff-top dining with panoramic ocean views</p>
          </div>

          <div className="animate-in text-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <Heart className="w-12 h-12 text-wave-orange mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Romantic Dinners</h3>
            <p className="text-white/70">Dedicated spaces for quiet, intimate evenings</p>
          </div>

          <div className="animate-in text-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <Users2 className="w-12 h-12 text-wave-orange mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Group Chill</h3>
            <p className="text-white/70">Perfect spots for group gatherings and celebrations</p>
          </div>
        </div>

        {/* Partner Restaurants */}
        <div className="animate-in text-center">
          <p className="text-white/60 mb-6 text-lg">In Partnership With</p>
          <div className="flex flex-wrap justify-center gap-6">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20"
              >
                <p className="text-white font-semibold">{partner.name}</p>
                <p className="text-white/60 text-sm">{partner.specialty}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DiningSection;
