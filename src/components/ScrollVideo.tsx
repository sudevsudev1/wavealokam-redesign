import { useEffect, useRef, useCallback, useState } from 'react';

interface ScrollVideoProps {
  className?: string;
}

const TOTAL_FRAMES = 121;

const ScrollVideo = ({ className = '' }: ScrollVideoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTouchYRef = useRef<number | null>(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);

  // Generate frame path
  const getFramePath = useCallback((frameNumber: number) => {
    const paddedNumber = String(frameNumber).padStart(3, '0');
    return `/frames/frame_${paddedNumber}.jpg`;
  }, []);

  // Preload all images
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) {
          setIsLoaded(true);
        }
      };
      images.push(img);
    }

    preloadedImagesRef.current = images;
  }, [getFramePath]);

  // Update frame based on scroll direction
  const updateFrame = useCallback((delta: number) => {
    setCurrentFrame(prev => {
      const newFrame = prev + delta;
      return Math.max(1, Math.min(TOTAL_FRAMES, newFrame));
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Mouse wheel handler
    const handleWheel = (e: WheelEvent) => {
      const delta = Math.sign(e.deltaY);
      updateFrame(delta);
    };

    // Touch handlers for mobile swipe
    const handleTouchStart = (e: TouchEvent) => {
      lastTouchYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lastTouchYRef.current === null) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = lastTouchYRef.current - currentY;
      
      // Trigger frame change for every 15px of movement
      if (Math.abs(deltaY) >= 15) {
        const frames = Math.sign(deltaY);
        updateFrame(frames);
        lastTouchYRef.current = currentY;
      }
    };

    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    // Scroll event for scrollbar dragging
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = Math.sign(currentScrollY - lastScrollY);
      if (delta !== 0) {
        updateFrame(delta);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isLoaded, updateFrame]);

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center ${className}`}>
      {/* Display current frame */}
      <img
        ref={imageRef}
        src={getFramePath(currentFrame)}
        alt="Surfing animation"
        className="drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))',
          maxHeight: '65vh',
          width: 'auto',
        }}
      />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ScrollVideo;
