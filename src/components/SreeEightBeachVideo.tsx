import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SreeEightBeachVideoProps {
  scrollProgress: number;
  activeIndex: number;
  totalActivities: number;
}

const SreeEightBeachVideo = ({ scrollProgress, activeIndex, totalActivities }: SreeEightBeachVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Listen for user interaction to enable audio (browser autoplay policy)
  useEffect(() => {
    const handleInteraction = () => {
      setHasUserInteracted(true);
      // Try to unmute and play with sound if video is visible
      const video = videoRef.current;
      if (video && isVisible) {
        video.muted = false;
        video.play().catch(() => {});
      }
    };

    // Listen for any user interaction
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [isVisible]);

  // ScrollTrigger for Sree Eight Beach video - starts before rooftop images disappear
  useEffect(() => {
    const activitiesSection = document.getElementById('activities');
    if (!activitiesSection) return;

    const videoTrigger = ScrollTrigger.create({
      trigger: activitiesSection,
      // Start a few frames before rooftop starts disappearing (at around 85% of rooftop's lifecycle)
      start: () => `top+=${window.innerHeight * 1.85} top`,
      // End when Sree Eight section rolls out
      end: () => `top+=${window.innerHeight * 3.2} top`,
      scrub: true,
      onUpdate: (self) => {
        setVideoProgress(self.progress);
        // Video becomes visible once progress starts
        setIsVisible(self.progress > 0 && self.progress < 1);
      },
    });

    return () => {
      videoTrigger.kill();
    };
  }, []);

  // Play video when visible, ensure looping
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible) {
      // Start muted if no user interaction yet, unmuted if user has interacted
      video.muted = !hasUserInteracted;
      video.play().catch(() => {
        // Autoplay may be blocked, that's okay
      });
    } else {
      video.pause();
    }
  }, [isVisible, hasUserInteracted]);

  // Animation logic based on video progress
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isVisible) {
      gsap.set(container, { opacity: 0, visibility: 'hidden' });
      return;
    }

    gsap.set(container, { visibility: 'visible' });

    // Phase 1: Zooming in (0 to 0.3) - video enters and scales up
    // Phase 2: Full magnification, in focus (0.3 to 0.85) - covers full width, reduced opacity
    // Phase 3: Rolling out (0.85 to 1.0) - video exits in same direction as text

    let scale: number;
    let opacity: number;
    let translateY: number;

    if (videoProgress < 0.3) {
      // Zoom in phase
      const t = videoProgress / 0.3;
      scale = 0.6 + 0.4 * t; // 0.6 to 1.0
      opacity = 0.3 + 0.2 * t; // 0.3 to 0.5 (reduced for readability)
      translateY = 0;
    } else if (videoProgress < 0.85) {
      // Full magnification phase - static, looping, reduced opacity
      scale = 1;
      opacity = 0.45; // Reduced opacity so text is readable
      translateY = 0;
    } else {
      // Roll out phase - exits in same direction as text (upward)
      const t = (videoProgress - 0.85) / 0.15;
      scale = 1;
      opacity = 0.45 - 0.45 * t;
      translateY = -100 * t; // Move up as section exits
    }

    gsap.set(container, {
      scale,
      opacity,
      y: `${translateY}%`,
      transformOrigin: 'center center',
    });
  }, [videoProgress, isVisible]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        zIndex: 1,
        opacity: 0,
        visibility: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        src="/videos/sree-eight-beach.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover
          lg:object-center
          md:object-[left_center]
          object-center"
      />
    </div>
  );
};

export default SreeEightBeachVideo;
