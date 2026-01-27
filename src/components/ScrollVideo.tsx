import { useEffect, useRef, useCallback, useState } from 'react';

interface ScrollVideoProps {
  className?: string;
}

const ScrollVideo = ({ className = '' }: ScrollVideoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTouchYRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const frameTimeRef = useRef(1 / 30); // Will be updated based on actual video

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }, []);

  const updateVideoTime = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !isReady || video.duration === 0) return;

    const newTime = Math.max(0, Math.min(video.duration - 0.01, video.currentTime + delta * frameTimeRef.current));
    video.currentTime = newTime;
  }, [isReady]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const handleLoadedData = () => {
      // Calculate frame time based on video duration
      // Assuming ~30fps, but adjust based on scroll feel
      frameTimeRef.current = video.duration / 60; // 60 scroll units to traverse full video
      
      // Set canvas size
      const maxHeight = window.innerHeight * 0.65;
      const aspectRatio = video.videoWidth / video.videoHeight;
      const height = Math.min(maxHeight, video.videoHeight);
      const width = height * aspectRatio;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Start at frame 0
      video.currentTime = 0;
      setIsReady(true);
      
      // Draw initial frame after a small delay
      setTimeout(() => drawFrame(), 100);
    };

    const handleSeeked = () => {
      requestAnimationFrame(drawFrame);
    };

    const handleTimeUpdate = () => {
      requestAnimationFrame(drawFrame);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Force video to load
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [drawFrame]);

  useEffect(() => {
    if (!isReady) return;

    // Mouse wheel handler
    const handleWheel = (e: WheelEvent) => {
      // Normalize delta across browsers
      const delta = Math.sign(e.deltaY);
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
      
      // Trigger frame change for every 15px of movement
      if (Math.abs(deltaY) >= 15) {
        const frames = Math.sign(deltaY);
        updateVideoTime(frames);
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
        updateVideoTime(delta);
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
  }, [isReady, updateVideoTime]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Hidden video element for frame extraction */}
      <video
        ref={videoRef}
        src="/videos/surfboard-scroll.mp4"
        className="hidden"
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />
      
      {/* Canvas displays video frames */}
      <canvas
        ref={canvasRef}
        className="drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))',
          maxHeight: '65vh',
          width: 'auto',
        }}
      />
      
      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ScrollVideo;
