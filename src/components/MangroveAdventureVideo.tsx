import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const MangroveAdventureVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Listen for user interaction to enable audio (browser autoplay policy)
  useEffect(() => {
    const handleInteraction = () => {
      setHasUserInteracted(true);
      const video = videoRef.current;
      if (video && isVisible) {
        video.muted = false;
        video.play().catch(() => {});
      }
    };

    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [isVisible]);

  // ScrollTrigger for Mangrove Adventure video (Activity 5)
  // Starts before Chechi's Breakfast (Activity 4) disappears
  useEffect(() => {
    const activitiesSection = document.getElementById('activities');
    if (!activitiesSection) return;

    const videoTrigger = ScrollTrigger.create({
      trigger: activitiesSection,
      // Activity 5 is at ~50-62.5% of total scroll (activities.length = 8)
      // Start a few frames before Activity 4 ends (around 48% of total)
      start: () => `top+=${window.innerHeight * 3.85} top`,
      // End when Mangrove section rolls out (around 65%)
      end: () => `top+=${window.innerHeight * 5.2} top`,
      scrub: true,
      onUpdate: (self) => {
        setVideoProgress(self.progress);
        setIsVisible(self.progress > 0 && self.progress < 1);
      },
    });

    return () => {
      videoTrigger.kill();
    };
  }, []);

  // Play video when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible) {
      video.muted = !hasUserInteracted;
      video.play().catch(() => {});
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
    // Phase 2: Full magnification, in focus (0.3 to 0.85) - covers full area, reduced opacity
    // Phase 3: Rolling out (0.85 to 1.0) - video exits upward

    let scale: number;
    let opacity: number;
    let translateY: number;

    if (videoProgress < 0.3) {
      const t = videoProgress / 0.3;
      scale = 0.6 + 0.4 * t;
      opacity = 0.3 + 0.2 * t;
      translateY = 0;
    } else if (videoProgress < 0.85) {
      scale = 1;
      opacity = 0.45;
      translateY = 0;
    } else {
      const t = (videoProgress - 0.85) / 0.15;
      scale = 1;
      opacity = 0.45 - 0.45 * t;
      translateY = -100 * t;
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
      {/* Container that ensures video covers without cropping */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          src="/videos/mangrove-adventure.mp4"
          muted
          loop
          playsInline
          preload="none"
          className="min-w-full min-h-full w-auto h-auto object-contain"
          style={{
            // For vertical video: fit to height on all devices, center horizontally
            maxWidth: 'none',
            maxHeight: 'none',
          }}
        />
      </div>
    </div>
  );
};

export default MangroveAdventureVideo;
