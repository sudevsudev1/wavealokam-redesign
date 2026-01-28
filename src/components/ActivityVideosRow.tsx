import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ActivityVideoPreview from './ActivityVideoPreview';

gsap.registerPlugin(ScrollTrigger);

interface VideoConfig {
  src: string;
  poster?: string;
}

interface ActivityVideosRowProps {
  videos?: {
    left: VideoConfig;
    middle: VideoConfig;
    right: VideoConfig;
  };
  className?: string;
}

const defaultVideos = {
  left: { src: '/videos/activity-left.mp4' },
  middle: { src: '/videos/activity-middle.mp4' },
  right: { src: '/videos/activity-right.mp4' },
};

const ActivityVideosRow = ({ videos = defaultVideos, className = '' }: ActivityVideosRowProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const videoElements = containerRef.current?.querySelectorAll('.video-item');
      
      if (videoElements) {
        // Staggered fade-in animation
        gsap.fromTo(
          videoElements,
          {
            opacity: 0,
            y: 60,
            scale: 0.9,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top 85%',
              end: 'top 40%',
              scrub: 1,
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="flex justify-center items-stretch gap-4 sm:gap-6 lg:gap-8">
        {/* Left video - always visible */}
        <div className="video-item w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[320px]">
          <ActivityVideoPreview
            src={videos.left.src}
            poster={videos.left.poster}
          />
        </div>

        {/* Middle video - hidden on mobile */}
        <div className="video-item hidden md:block w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[320px]">
          <ActivityVideoPreview
            src={videos.middle.src}
            poster={videos.middle.poster}
          />
        </div>

        {/* Right video - hidden on mobile and tablet */}
        <div className="video-item hidden lg:block w-full max-w-[320px]">
          <ActivityVideoPreview
            src={videos.right.src}
            poster={videos.right.poster}
          />
        </div>
      </div>
    </div>
  );
};

export default ActivityVideosRow;
