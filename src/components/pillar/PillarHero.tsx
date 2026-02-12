import { ReactNode, useRef, useEffect, useState } from 'react';

interface PillarHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  heroImages?: string[];
  children?: ReactNode;
}

const PillarHero = ({ title, subtitle, backgroundImage, heroImages, children }: PillarHeroProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Auto-scroll animation
  useEffect(() => {
    if (!heroImages?.length || !scrollRef.current) return;

    let animationId: number;
    let speed = 0.3; // px per frame

    const animate = () => {
      if (!scrollRef.current || isDragging) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      scrollRef.current.scrollLeft += speed;

      // Loop: if we've scrolled past the midpoint (duplicated content), reset
      const maxScroll = scrollRef.current.scrollWidth / 2;
      if (scrollRef.current.scrollLeft >= maxScroll) {
        scrollRef.current.scrollLeft = 0;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [heroImages, isDragging]);

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => setIsDragging(false);

  const hasGallery = heroImages && heroImages.length > 0;
  // Duplicate images for infinite loop illusion
  const displayImages = hasGallery ? [...heroImages, ...heroImages] : [];

  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {hasGallery ? (
          <>
            {/* Scrollable image gallery background */}
            <div
              ref={scrollRef}
              className="absolute inset-0 flex overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {displayImages.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="flex-shrink-0 h-full"
                  style={{ width: 'clamp(280px, 40vw, 500px)' }}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                    loading={i < 6 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/50" />
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
      <div className="relative z-10 container mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
};

export default PillarHero;
