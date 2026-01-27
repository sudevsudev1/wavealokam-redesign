import { useEffect, useRef, useCallback } from 'react';

interface ScrollVideoProps {
  className?: string;
}

const ScrollVideo = ({ className = '' }: ScrollVideoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentFrameRef = useRef(0);
  const isReadyRef = useRef(false);
  const lastTouchYRef = useRef<number | null>(null);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !isReadyRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw current frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }, []);

  const updateVideoTime = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !isReadyRef.current) return;

    const frameTime = 1 / 30; // Assume 30fps
    const newTime = Math.max(0, Math.min(video.duration, video.currentTime + delta * frameTime));
    
    video.currentTime = newTime;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Set up video
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const handleLoadedMetadata = () => {
      // Set canvas size to match video aspect ratio
      const aspectRatio = video.videoWidth / video.videoHeight;
      const maxHeight = window.innerHeight * 0.7;
      const height = maxHeight;
      const width = height * aspectRatio;
      
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const handleCanPlay = () => {
      isReadyRef.current = true;
      video.currentTime = 0;
      drawFrame();
    };

    const handleSeeked = () => {
      drawFrame();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [drawFrame]);

  useEffect(() => {
    // Mouse wheel handler
    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaY > 0 ? 1 : -1;
      updateVideoTime(delta);
    };

    // Touch handlers for mobile swipe
    const handleTouchStart = (e: TouchEvent) => {
      lastTouchYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lastTouchYRef.current === null) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = lastTouchYRef.current - currentY;
      
      // Trigger frame change for every 10px of movement
      if (Math.abs(deltaY) >= 10) {
        const frames = Math.floor(deltaY / 10);
        updateVideoTime(frames);
        lastTouchYRef.current = currentY;
      }
    };

    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    // Add listeners to window to capture all scroll events
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [updateVideoTime]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Hidden video element for frame extraction */}
      <video
        ref={videoRef}
        src="/videos/surfboard-scroll.mp4"
        className="hidden"
        muted
        playsInline
      />
      
      {/* Canvas displays video frames */}
      <canvas
        ref={canvasRef}
        className="drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))',
          maxHeight: '70vh',
          width: 'auto',
        }}
      />
    </div>
  );
};

export default ScrollVideo;
