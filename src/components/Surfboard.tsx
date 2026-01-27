import { forwardRef } from 'react';
import surfboardImage from '@/assets/surfboard.png';

interface SurfboardProps {
  showBookButton?: boolean;
  className?: string;
}

const Surfboard = forwardRef<HTMLDivElement, SurfboardProps>(
  ({ showBookButton = true, className = '' }, ref) => {
    const handleBookNow = () => {
      const element = document.querySelector('#itinerary');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    return (
      <div
        ref={ref}
        className={`relative flex items-center justify-center ${className}`}
      >
        {/* Surfboard Image */}
        <div className="relative">
          <img
            src={surfboardImage}
            alt="Orange Surfboard"
            className="h-[60vh] md:h-[70vh] w-auto object-contain drop-shadow-2xl"
            style={{
              filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))',
            }}
          />
          
          {/* Pulsating Book Now Button - Anchored to Surfboard */}
          {showBookButton && (
            <button
              onClick={handleBookNow}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 bg-white text-wave-orange font-bold text-lg md:text-xl rounded-full pulse-glow transition-all duration-300 hover:bg-white/90 shadow-2xl z-10"
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
