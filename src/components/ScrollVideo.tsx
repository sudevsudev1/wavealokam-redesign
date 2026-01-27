import { useEffect, useRef, useCallback, useState } from 'react';

interface ScrollVideoProps {
  className?: string;
}

const TOTAL_FRAMES = 121;

const ScrollVideo = ({ className = '' }: ScrollVideoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  // Generate frame path
  const getFramePath = useCallback((frameNumber: number) => {
    const paddedNumber = String(frameNumber).padStart(3, '0');
    return `/frames/frame_${paddedNumber}.jpg`;
  }, []);

  // Preload images with priority for first frame
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];
    
    // Load first frame immediately for instant display
    const firstImg = new Image();
    firstImg.src = getFramePath(1);
    firstImg.onload = () => {
      setIsLoaded(true); // Show immediately when first frame loads
    };
    images[0] = firstImg;

    // Load remaining frames in background
    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        loadedCount++;
      };
      images[i - 1] = img;
    }

    preloadedImagesRef.current = images;
  }, [getFramePath]);

  // Direct frame update - no interpolation for responsiveness
  const updateFrame = useCallback((targetFrame: number) => {
    const clampedFrame = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(targetFrame)));
    if (clampedFrame !== frameRef.current) {
      frameRef.current = clampedFrame;
      setCurrentFrame(clampedFrame);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Calculate frame based on scroll position relative to container
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate progress: 0 when container top hits viewport bottom, 1 when container bottom hits viewport top
      const containerHeight = rect.height;
      const startPoint = viewportHeight; // Container top at viewport bottom
      const endPoint = -containerHeight; // Container bottom at viewport top
      const totalDistance = startPoint - endPoint;
      
      // Current position of container top relative to viewport
      const currentPosition = rect.top;
      const progress = Math.max(0, Math.min(1, (startPoint - currentPosition) / totalDistance));
      
      const targetFrame = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(1 + progress * (TOTAL_FRAMES - 1))));
      updateFrame(targetFrame);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
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
      
      {/* Edge blending gradients - seamless transition to orange background */}
      <div 
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, hsl(33, 100%, 50%) 0%, transparent 100%)',
        }}
      />
      <div 
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(33, 100%, 50%) 0%, transparent 100%)',
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
