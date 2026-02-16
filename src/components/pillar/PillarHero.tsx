import { ReactNode, useRef, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PillarHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  heroImages?: string[];
  children?: ReactNode;
}

const PillarHero = ({ title, subtitle, backgroundImage, heroImages, children }: PillarHeroProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const hasGallery = heroImages && heroImages.length > 0;

  // Parallax: each image gets a slight vertical offset based on scroll
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTrack = useCallback((direction: 'left' | 'right') => {
    if (!trackRef.current) return;
    const amount = window.innerWidth * 0.4;
    trackRef.current.scrollBy({
      left: direction === 'right' ? amount : -amount,
      behavior: 'smooth',
    });
  }, []);

  // Triple images for seamless infinite scroll feel
  const displayImages = hasGallery ? [...heroImages, ...heroImages, ...heroImages] : [];

  // Auto-scroll using requestAnimationFrame with a ref to avoid stale closure
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (!hasGallery || !trackRef.current) return;

    let animId: number;
    const speed = 0.5;

    // Start scrolled to the middle set
    const el = trackRef.current;
    const singleSetWidth = el.scrollWidth / 3;
    el.scrollLeft = singleSetWidth;

    const animate = () => {
      if (!trackRef.current) return;
      if (!isPausedRef.current) {
        trackRef.current.scrollLeft += speed;

        // Seamless loop: when past 2nd set, jump back to 1st set
        if (trackRef.current.scrollLeft >= singleSetWidth * 2) {
          trackRef.current.scrollLeft -= singleSetWidth;
        }
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [hasGallery, heroImages]);

  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {hasGallery ? (
          <>
            {/* Scrollable image gallery background */}
            <div
              ref={trackRef}
              className="absolute inset-0 flex overflow-x-scroll scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => {
                // Resume after a delay so touch scroll finishes
                setTimeout(() => setIsPaused(false), 3000);
              }}
            >
              {displayImages.map((src, i) => {
                // Parallax: alternate images move at different vertical speeds
                const parallaxFactor = i % 3 === 0 ? 0.08 : i % 3 === 1 ? -0.04 : 0.12;
                const yOffset = scrollY * parallaxFactor;
                // Slight scale variation for depth
                const scaleBoost = i % 3 === 2 ? 1.08 : i % 3 === 1 ? 1.04 : 1;

                return (
                  <div
                    key={`hero-img-${i}`}
                    className="flex-shrink-0 h-full overflow-hidden"
                    style={{ width: 'clamp(280px, 40vw, 500px)' }}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none select-none will-change-transform"
                      draggable={false}
                      loading="eager"
                      style={{
                        transform: `translateY(${yOffset}px) scale(${scaleBoost})`,
                        transition: 'transform 0.1s linear',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />

            {/* Navigation arrows */}
            <button
              onClick={() => scrollTrack('left')}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all duration-200 backdrop-blur-sm"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollTrack('right')}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all duration-200 backdrop-blur-sm"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--wave-orange))] via-[hsl(var(--wave-purple))] to-[hsl(var(--wave-blue-ocean))]">
            {backgroundImage && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${backgroundImage})` }}
              />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-20 text-center pointer-events-none">
        <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6 drop-shadow-lg">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow-md">
            {subtitle}
          </p>
        )}
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </section>
  );
};

export default PillarHero;
