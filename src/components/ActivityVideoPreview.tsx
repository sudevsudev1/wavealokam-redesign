import { useRef, useState, useCallback, useEffect } from 'react';

interface ActivityVideoPreviewProps {
  src: string;
  poster?: string;
  className?: string;
}

const ActivityVideoPreview = ({ src, poster, className = '' }: ActivityVideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);

  // Lazy-load: only set video src when near viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  }, []);

  const handleCanPlayThrough = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ease-out ${
        isHovered ? 'scale-105 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]' : 'scale-100'
      } ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
        {isNearViewport ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            loop
            playsInline
            muted
            preload="metadata"
            onCanPlayThrough={handleCanPlayThrough}
            className={`w-full h-full object-cover aspect-[9/16] transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-50'
            }`}
          />
        ) : (
          <div className="w-full aspect-[9/16] bg-black/20" />
        )}
        
        {/* Loading overlay */}
        {isNearViewport && !isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        
        {/* Play indicator overlay */}
        {!isHovered && isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default ActivityVideoPreview;
