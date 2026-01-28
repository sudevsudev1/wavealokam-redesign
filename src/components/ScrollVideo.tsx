import { useEffect, useRef, useCallback, useState } from 'react';

interface ScrollVideoProps {
  className?: string;
}

const TOTAL_FRAMES = 121;

const ScrollVideo = ({ className = '' }: ScrollVideoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(1);

  // Generate frame path
  const getFramePath = useCallback((frameNumber: number) => {
    const paddedNumber = String(frameNumber).padStart(3, '0');
    return `/frames/frame_${paddedNumber}.jpg`;
  }, []);

  // Draw frame to canvas - this is instant since image is already decoded
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imagesRef.current[frameIndex - 1];
    
    if (!canvas || !container || !ctx || !img) return;
    
    // Get actual display dimensions
    const rect = container.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Set canvas size to match container
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    
    // Calculate cover sizing (same as object-fit: cover)
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = displayWidth / displayHeight;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgAspect > canvasAspect) {
      // Image is wider - fit height, crop width
      drawHeight = displayHeight;
      drawWidth = drawHeight * imgAspect;
      drawX = (displayWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      // Image is taller - fit width, crop height
      drawWidth = displayWidth;
      drawHeight = drawWidth / imgAspect;
      drawX = 0;
      drawY = (displayHeight - drawHeight) / 2;
    }
    
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }, []);

  // Preload and DECODE all images before allowing interaction
  useEffect(() => {
    let isMounted = true;
    const images: HTMLImageElement[] = [];
    
    const loadAllImages = async () => {
      let loadedCount = 0;
      
      // Create all image elements
      const loadPromises = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.src = getFramePath(i + 1);
          
          img.onload = async () => {
            try {
              // CRITICAL: decode() ensures the image is fully decoded and ready for instant drawing
              await img.decode();
              loadedCount++;
              if (isMounted) {
                setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
              }
              resolve(img);
            } catch (e) {
              // Fallback if decode() fails
              loadedCount++;
              if (isMounted) {
                setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
              }
              resolve(img);
            }
          };
          
          img.onerror = () => {
            console.error(`Failed to load frame ${i + 1}`);
            reject(new Error(`Failed to load frame ${i + 1}`));
          };
        });
      });
      
      try {
        const loadedImages = await Promise.all(loadPromises);
        if (isMounted) {
          imagesRef.current = loadedImages;
          setIsLoaded(true);
          // Draw first frame immediately
          requestAnimationFrame(() => drawFrame(1));
        }
      } catch (error) {
        console.error('Failed to load all frames:', error);
      }
    };
    
    loadAllImages();
    
    return () => {
      isMounted = false;
    };
  }, [getFramePath, drawFrame]);

  // Handle resize - just redraw current frame
  useEffect(() => {
    if (!isLoaded) return;
    
    const handleResize = () => {
      drawFrame(currentFrameRef.current);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoaded, drawFrame]);

  // Handle scroll - calculate frame based on scroll progress
  useEffect(() => {
    if (!isLoaded) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate progress: 0 when container top hits viewport bottom, 1 when container bottom hits viewport top
      const containerHeight = rect.height;
      const startPoint = viewportHeight;
      const endPoint = -containerHeight;
      const totalDistance = startPoint - endPoint;
      
      const currentPosition = rect.top;
      const progress = Math.max(0, Math.min(1, (startPoint - currentPosition) / totalDistance));
      
      const targetFrame = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(1 + progress * (TOTAL_FRAMES - 1))));
      
      if (targetFrame !== currentFrameRef.current) {
        currentFrameRef.current = targetFrame;
        // Use RAF for smooth rendering
        requestAnimationFrame(() => drawFrame(targetFrame));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isLoaded, drawFrame]);

  return (
    <div 
      ref={containerRef} 
      id="scroll-video-section"
      className={`relative w-screen h-[60vh] md:h-[70vh] overflow-hidden ${className}`}
    >
      {/* Canvas for instant frame rendering */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Bottom edge blending gradient - seamless transition to orange background */}
      <div 
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(33, 100%, 50%) 0%, transparent 100%)',
        }}
      />
      
      {/* Loading indicator with progress */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-wave-orange/50 gap-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <div className="text-white font-medium text-lg">{loadProgress}%</div>
        </div>
      )}
    </div>
  );
};

export default ScrollVideo;
