import { useEffect, useRef, useCallback, useState } from 'react';

interface ScrollVideoProps {
  className?: string;
}

const TOTAL_FRAMES = 121;

const ScrollVideo = ({ className = '' }: ScrollVideoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchYRef = useRef<number | null>(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  const accumulatedDeltaRef = useRef<number>(0);

  // Throttle time in ms to prevent frame jumping
  const THROTTLE_MS = 50;
  const SCROLL_THRESHOLD = 30; // Pixels needed to trigger frame change

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

  // Throttled frame update
  const updateFrame = useCallback((delta: number) => {
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < THROTTLE_MS) {
      return;
    }
    lastUpdateTimeRef.current = now;
    
    setCurrentFrame(prev => {
      const newFrame = prev + delta;
      return Math.max(1, Math.min(TOTAL_FRAMES, newFrame));
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Mouse wheel handler with throttling
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      updateFrame(delta);
    };

    // Touch handlers for mobile swipe
    const handleTouchStart = (e: TouchEvent) => {
      lastTouchYRef.current = e.touches[0].clientY;
      accumulatedDeltaRef.current = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lastTouchYRef.current === null) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = lastTouchYRef.current - currentY;
      accumulatedDeltaRef.current += deltaY;
      
      // Trigger frame change for accumulated movement
      if (Math.abs(accumulatedDeltaRef.current) >= SCROLL_THRESHOLD) {
        const frames = Math.sign(accumulatedDeltaRef.current);
        updateFrame(frames);
        accumulatedDeltaRef.current = 0;
        lastTouchYRef.current = currentY;
      }
    };

    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
      accumulatedDeltaRef.current = 0;
    };

    // Scroll event for scrollbar dragging with accumulation
    let lastScrollY = window.scrollY;
    let scrollAccumulator = 0;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;
      scrollAccumulator += scrollDelta;
      
      if (Math.abs(scrollAccumulator) >= SCROLL_THRESHOLD) {
        const delta = Math.sign(scrollAccumulator);
        updateFrame(delta);
        scrollAccumulator = 0;
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
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
    <div 
      ref={containerRef} 
      className={`relative w-screen h-[60vh] md:h-[70vh] overflow-hidden ${className}`}
    >
      {/* Display current frame - edge to edge with cropping */}
      <img
        src={getFramePath(currentFrame)}
        alt="Surfing animation"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          objectPosition: 'center center',
        }}
      />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-wave-orange/50">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ScrollVideo;
