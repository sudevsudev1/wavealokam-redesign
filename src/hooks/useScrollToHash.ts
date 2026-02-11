import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

/**
 * Hook that handles scrolling to hash anchors on the homepage.
 * 
 * Uses GSAP ScrollToPlugin to correctly scroll to elements even when
 * ScrollTrigger has pinned/transformed sections that distort native
 * scrollIntoView positioning.
 * 
 * Usage: Call this hook in the homepage component (Index.tsx)
 */
export const useScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    
    if (!hash) return;

    const id = hash.replace('#', '');
    if (!id) return;

    const scrollToElement = () => {
      const element = document.getElementById(id);
      if (element) {
        // Refresh ScrollTrigger so pin positions are accurate
        ScrollTrigger.refresh();
        // Use GSAP ScrollToPlugin which respects ScrollTrigger pin spacing
        gsap.to(window, {
          scrollTo: { y: element, offsetY: 0 },
          duration: 0.8,
          ease: 'power2.out',
          delay: 0.1,
        });
        return true;
      }
      return false;
    };

    // Wait for GSAP ScrollTrigger to initialize (Index.tsx refreshes at 500ms)
    // Pinned sections (ActivitiesSection) need extra time to set up
    const initialDelay = 1200;
    
    const startScrolling = () => {
      if (scrollToElement()) return;

      // Retry with increasing delays up to 5000ms total
      const retryDelays = [300, 400, 500, 600, 700, 800];
      let retryIndex = 0;
      let totalTime = initialDelay;
      const maxTime = 5000;

      const retryScroll = () => {
        if (totalTime >= maxTime) return;
        if (scrollToElement()) return;
        
        if (retryIndex < retryDelays.length) {
          const delay = retryDelays[retryIndex];
          totalTime += delay;
          retryIndex++;
          setTimeout(retryScroll, delay);
        }
      };

      setTimeout(retryScroll, retryDelays[0]);
    };

    setTimeout(startScrolling, initialDelay);
  }, [location.hash, location.pathname]);
};

export default useScrollToHash;
