import { forwardRef, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import surfboardImage from '@/assets/surfboard.png';

gsap.registerPlugin(ScrollTrigger);

interface SurfboardProps {
  showBookButton?: boolean;
  className?: string;
  enableScrollAnimation?: boolean;
}

const Surfboard = forwardRef<HTMLDivElement, SurfboardProps>(
  ({ showBookButton = true, className = '', enableScrollAnimation = false }, ref) => {
    const surfboardRef = useRef<HTMLImageElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleBookNow = () => {
      const element = document.querySelector('#itinerary');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    useEffect(() => {
      // Animation disabled - keeping surfboard static for now
      return () => {};
    }, [enableScrollAnimation]);

    return (
      <div
        ref={ref}
        className={`relative flex items-center justify-center ${className}`}
      >
        <div ref={containerRef} className="relative" style={{ perspective: '1000px' }}>
          {/* Surfboard Image with 3D transform */}
          <img
            ref={surfboardRef}
            src={surfboardImage}
            alt="Orange Surfboard"
            className="h-[60vh] md:h-[70vh] w-auto object-contain drop-shadow-2xl"
            style={{
              filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))',
              transformStyle: 'preserve-3d',
            }}
          />
          
          {/* Pulsating Book Now Button - Follows straight down without rotation */}
          {showBookButton && (
            <button
              ref={buttonRef}
              onClick={handleBookNow}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 bg-white text-wave-orange font-bold text-lg md:text-xl rounded-full pulse-glow transition-all duration-300 hover:bg-white/90 shadow-2xl z-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              BOOK NOW
            </button>
          )}
        </div>
      </div>
    );
  }
);

Surfboard.displayName = 'Surfboard';

export default Surfboard;
