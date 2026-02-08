import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook that handles scrolling to hash anchors on the homepage.
 * 
 * Features:
 * - Scrolls to hash on initial mount
 * - Handles hash changes during navigation
 * - Retries finding the element for up to 1500ms (handles lazy-loaded content)
 * - Uses smooth scrolling
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
        // Small delay to ensure GSAP/animations have settled
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return true;
      }
      return false;
    };

    // Try immediately
    if (scrollToElement()) return;

    // If not found, retry with increasing delays (for lazy-loaded content)
    const retryDelays = [100, 200, 300, 400, 500];
    let retryIndex = 0;
    let totalTime = 0;
    const maxTime = 1500;

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

    // Start retrying
    setTimeout(retryScroll, retryDelays[0]);
  }, [location.hash, location.pathname]);
};

export default useScrollToHash;
