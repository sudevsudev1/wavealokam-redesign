import { useEffect, useRef, useMemo, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ActivityImage {
  id: string;
  src: string;
  position: {
    x: 'left' | 'right';
    y: 'top' | 'bottom';
    offsetX: number;
    offsetY: number;
  };
  delay: number;
  rotation: number;
}

interface ActivityImagesConfig {
  activityId: number;
  images: ActivityImage[];
}

// Image configurations for each activity
const activityImagesConfig: ActivityImagesConfig[] = [
  {
    activityId: 1,
    images: [
      // 6 surfing images spread across full width with staggered timing
      { id: 'surf-1', src: '/activities/surfing/1.png', position: { x: 'left', y: 'top', offsetX: 2, offsetY: 5 }, delay: 0, rotation: 12 },
      { id: 'surf-2', src: '/activities/surfing/2.png', position: { x: 'right', y: 'top', offsetX: -2, offsetY: 8 }, delay: 0.1, rotation: -8 },
      { id: 'surf-3', src: '/activities/surfing/3.png', position: { x: 'left', y: 'top', offsetX: 25, offsetY: 12 }, delay: 0.2, rotation: 15 },
      { id: 'surf-4', src: '/activities/surfing/4.png', position: { x: 'right', y: 'top', offsetX: -25, offsetY: 15 }, delay: 0.3, rotation: -12 },
      { id: 'surf-5', src: '/activities/surfing/5.png', position: { x: 'left', y: 'top', offsetX: 45, offsetY: 18 }, delay: 0.4, rotation: 10 },
      { id: 'surf-6', src: '/activities/surfing/6.png', position: { x: 'right', y: 'top', offsetX: -45, offsetY: 22 }, delay: 0.5, rotation: -15 },
    ],
  },
  {
    activityId: 2,
    images: [
      // 7 rooftop images spread wide across viewport with staggered timing
      { id: 'roof-1', src: '/activities/rooftop-dinner/1.png', position: { x: 'left', y: 'top', offsetX: -5, offsetY: 5 }, delay: 0, rotation: 12 },
      { id: 'roof-2', src: '/activities/rooftop-dinner/2.png', position: { x: 'right', y: 'top', offsetX: 5, offsetY: 8 }, delay: 0.08, rotation: -8 },
      { id: 'roof-3', src: '/activities/rooftop-dinner/3.png', position: { x: 'left', y: 'top', offsetX: 15, offsetY: 15 }, delay: 0.16, rotation: 15 },
      { id: 'roof-4', src: '/activities/rooftop-dinner/4.png', position: { x: 'right', y: 'top', offsetX: -15, offsetY: 12 }, delay: 0.24, rotation: -12 },
      { id: 'roof-5', src: '/activities/rooftop-dinner/5.png', position: { x: 'left', y: 'top', offsetX: -8, offsetY: 25 }, delay: 0.32, rotation: 10 },
      { id: 'roof-6', src: '/activities/rooftop-dinner/6.png', position: { x: 'right', y: 'top', offsetX: 8, offsetY: 20 }, delay: 0.40, rotation: -15 },
      { id: 'roof-7', src: '/activities/rooftop-dinner/7.png', position: { x: 'left', y: 'top', offsetX: 30, offsetY: 30 }, delay: 0.48, rotation: 8 },
    ],
  },
  // Activity 3 (Sree Eight Beach) uses video background - no parallax images
  {
    activityId: 4,
    images: [
      // 7 Chechi's Breakfast images spread across full width with staggered timing
      { id: 'bfast-1', src: '/activities/chechis-breakfast/1.png', position: { x: 'left', y: 'top', offsetX: -5, offsetY: 5 }, delay: 0, rotation: 10 },
      { id: 'bfast-2', src: '/activities/chechis-breakfast/2.png', position: { x: 'right', y: 'top', offsetX: 5, offsetY: 8 }, delay: 0.07, rotation: -8 },
      { id: 'bfast-3', src: '/activities/chechis-breakfast/3.png', position: { x: 'left', y: 'top', offsetX: 18, offsetY: 15 }, delay: 0.14, rotation: 12 },
      { id: 'bfast-4', src: '/activities/chechis-breakfast/4.png', position: { x: 'right', y: 'top', offsetX: -18, offsetY: 12 }, delay: 0.21, rotation: -10 },
      { id: 'bfast-5', src: '/activities/chechis-breakfast/5.png', position: { x: 'left', y: 'top', offsetX: -8, offsetY: 25 }, delay: 0.28, rotation: 15 },
      { id: 'bfast-6', src: '/activities/chechis-breakfast/6.png', position: { x: 'right', y: 'top', offsetX: 8, offsetY: 20 }, delay: 0.35, rotation: -12 },
      { id: 'bfast-7', src: '/activities/chechis-breakfast/7.png', position: { x: 'left', y: 'top', offsetX: 35, offsetY: 30 }, delay: 0.42, rotation: 8 },
    ],
  },
  {
    activityId: 5,
    images: [
      { id: 'mang-1', src: '/activities/mangrove-adventures/1.jpg', position: { x: 'left', y: 'bottom', offsetX: 10, offsetY: -15 }, delay: 0, rotation: 15 },
      { id: 'mang-2', src: '/activities/mangrove-adventures/2.jpg', position: { x: 'right', y: 'top', offsetX: -12, offsetY: 12 }, delay: 0.2, rotation: -10 },
      { id: 'mang-3', src: '/activities/mangrove-adventures/3.jpg', position: { x: 'left', y: 'top', offsetX: 8, offsetY: 8 }, delay: 0.4, rotation: 8 },
    ],
  },
  {
    activityId: 6,
    images: [
      { id: 'toddy-1', src: '/activities/toddy/1.jpg', position: { x: 'right', y: 'bottom', offsetX: -15, offsetY: -10 }, delay: 0, rotation: -12 },
      { id: 'toddy-2', src: '/activities/toddy/2.jpg', position: { x: 'left', y: 'top', offsetX: 10, offsetY: 12 }, delay: 0.3, rotation: 10 },
      { id: 'toddy-3', src: '/activities/toddy/3.jpg', position: { x: 'right', y: 'top', offsetX: -8, offsetY: 18 }, delay: 0.6, rotation: -8 },
    ],
  },
  {
    activityId: 7,
    images: [
      // 7 Jatayu images spread across full width with staggered timing
      { id: 'jatayu-1', src: '/activities/jatayu/1.jpg', position: { x: 'left', y: 'top', offsetX: -5, offsetY: 5 }, delay: 0, rotation: 10 },
      { id: 'jatayu-2', src: '/activities/jatayu/2.webp', position: { x: 'right', y: 'top', offsetX: 5, offsetY: 8 }, delay: 0.07, rotation: -8 },
      { id: 'jatayu-3', src: '/activities/jatayu/3.jpg', position: { x: 'left', y: 'top', offsetX: 18, offsetY: 15 }, delay: 0.14, rotation: 12 },
      { id: 'jatayu-4', src: '/activities/jatayu/4.webp', position: { x: 'right', y: 'top', offsetX: -18, offsetY: 12 }, delay: 0.21, rotation: -10 },
      { id: 'jatayu-5', src: '/activities/jatayu/5.jpg', position: { x: 'left', y: 'top', offsetX: -8, offsetY: 25 }, delay: 0.28, rotation: 15 },
      { id: 'jatayu-6', src: '/activities/jatayu/6.webp', position: { x: 'right', y: 'top', offsetX: 8, offsetY: 20 }, delay: 0.35, rotation: -12 },
      { id: 'jatayu-7', src: '/activities/jatayu/7.jpg', position: { x: 'left', y: 'top', offsetX: 35, offsetY: 30 }, delay: 0.42, rotation: 8 },
    ],
  },
  {
    activityId: 8,
    images: [
      { id: 'night-1', src: '/activities/north-cliff-nightlife/1.jpg', position: { x: 'right', y: 'top', offsetX: -8, offsetY: 15 }, delay: 0, rotation: -10 },
      { id: 'night-2', src: '/activities/north-cliff-nightlife/2.jpg', position: { x: 'left', y: 'bottom', offsetX: 10, offsetY: -10 }, delay: 0.3, rotation: 15 },
      { id: 'night-3', src: '/activities/north-cliff-nightlife/3.jpg', position: { x: 'right', y: 'bottom', offsetX: -12, offsetY: -18 }, delay: 0.6, rotation: -8 },
    ],
  },
];

interface ActivityParallaxImagesProps {
  scrollProgress: number;
  activeIndex: number;
  totalActivities: number;
}

const ActivityParallaxImages = ({ scrollProgress, activeIndex, totalActivities }: ActivityParallaxImagesProps) => {
  const imageRefs = useRef<Record<string, HTMLImageElement | null>>({});
  const loadedImages = useRef<Set<string>>(new Set());
  const [surfingScrollProgress, setSurfingScrollProgress] = useState(0);
  const [rooftopScrollProgress, setRooftopScrollProgress] = useState(0);
  const [breakfastScrollProgress, setBreakfastScrollProgress] = useState(0);
  const [jatayuScrollProgress, setJatayuScrollProgress] = useState(0);

  // Flatten all images for stable rendering
  const allImages = useMemo(() => {
    return activityImagesConfig.flatMap((config) =>
      config.images.map((img) => ({
        ...img,
        activityId: config.activityId,
      }))
    );
  }, []);

  // Independent ScrollTrigger for surfing images - starts when orange line touches bottom of viewport
  useEffect(() => {
    const activitiesSection = document.getElementById('activities');
    const surfboardSection = document.getElementById('surfboard-scroll-section');
    
    if (!surfboardSection || !activitiesSection) return;

    const surfingTrigger = ScrollTrigger.create({
      trigger: surfboardSection,
      start: 'bottom bottom', // When bottom of videos section hits bottom of viewport
      endTrigger: activitiesSection,
      end: () => `top+=${window.innerHeight} top`, // End when Surfing text transitions to Rooftop Dinner
      scrub: true,
      onUpdate: (self) => {
        setSurfingScrollProgress(self.progress);
      },
    });

    // Rooftop trigger - starts slightly before surfing ends for continuous animation
    // Start at 85% of surfing's timeline, run through rooftop text lifecycle
    const rooftopTrigger = ScrollTrigger.create({
      trigger: activitiesSection,
      start: () => `top+=${window.innerHeight * 0.85} top`, // Start 15% before surfing ends
      end: () => `top+=${window.innerHeight * 2} top`, // End when rooftop text transitions to next
      scrub: true,
      onUpdate: (self) => {
        setRooftopScrollProgress(self.progress);
      },
    });

    // Chechi's Breakfast trigger - starts before Sree Eight finishes, runs through breakfast text lifecycle
    const breakfastTrigger = ScrollTrigger.create({
      trigger: activitiesSection,
      start: () => `top+=${window.innerHeight * 2.85} top`, // Start near end of Sree Eight section
      end: () => `top+=${window.innerHeight * 4} top`, // End when breakfast text transitions to next
      scrub: true,
      onUpdate: (self) => {
        setBreakfastScrollProgress(self.progress);
      },
    });

    // Jatayu trigger - starts before Toddy finishes (Activity 6), runs through Jatayu text lifecycle (Activity 7)
    const jatayuTrigger = ScrollTrigger.create({
      trigger: activitiesSection,
      start: () => `top+=${window.innerHeight * 5.85} top`, // Start near end of Toddy section
      end: () => `top+=${window.innerHeight * 7} top`, // End when Jatayu text transitions to next
      scrub: true,
      onUpdate: (self) => {
        setJatayuScrollProgress(self.progress);
      },
    });

    return () => {
      surfingTrigger.kill();
      rooftopTrigger.kill();
      breakfastTrigger.kill();
      jatayuTrigger.kill();
    };
  }, []);

  // Animation logic for images
  useEffect(() => {
    allImages.forEach((imageConfig) => {
      const imgElement = imageRefs.current[imageConfig.id];
      if (!imgElement || !loadedImages.current.has(imageConfig.id)) return;

      let localProgress: number;
      
      if (imageConfig.activityId === 1) {
        // Surfing uses independent scroll progress
        localProgress = surfingScrollProgress;
      } else if (imageConfig.activityId === 2) {
        // Rooftop uses its own independent scroll progress
        localProgress = rooftopScrollProgress;
      } else if (imageConfig.activityId === 4) {
        // Chechi's Breakfast uses its own independent scroll progress
        localProgress = breakfastScrollProgress;
      } else if (imageConfig.activityId === 7) {
        // Jatayu uses its own independent scroll progress
        localProgress = jatayuScrollProgress;
      } else {
        // Other activities use main scrollProgress
        const activityIdx = imageConfig.activityId - 1;
        const activityDuration = 1 / totalActivities;
        const activityStart = activityIdx * activityDuration;
        localProgress = (scrollProgress - activityStart) / activityDuration;
      }

      // Only animate if within range (-0.2 to 1.2 for smooth transitions)
      if (localProgress < -0.2 || localProgress > 1.2) {
        gsap.set(imgElement, { opacity: 0, visibility: 'hidden' });
        return;
      }

      gsap.set(imgElement, { visibility: 'visible' });

      // Clamp progress for animation calculations
      const clampedProgress = Math.max(0, Math.min(1, localProgress));
      const delayedProgress = Math.max(0, Math.min(1, (clampedProgress - imageConfig.delay) / (1 - imageConfig.delay)));

      let baseScale: number;
      let blur: number;
      let opacity: number;
      let rotation: number;

      // Apply 1.5x scale multiplier for surfing, rooftop, and breakfast images
      // Apply 1.5x scale multiplier for surfing, rooftop, breakfast, and jatayu images
      const scaleMultiplier = (imageConfig.activityId === 1 || imageConfig.activityId === 2 || imageConfig.activityId === 4 || imageConfig.activityId === 7) ? 1.5 : 1.0;

      // Phase 1: Entry - coming into focus (0 to 0.15)
      if (delayedProgress < 0.15) {
        const t = delayedProgress / 0.15;
        baseScale = 0.3 + 0.4 * t;
        blur = 20 - 12 * t;
        opacity = 0.3 + 0.35 * t;
        rotation = imageConfig.rotation * 0.3 * t;
      } 
      // Phase 2: Sharpening - getting fully sharp (0.15 to 0.3)
      else if (delayedProgress < 0.3) {
        const t = (delayedProgress - 0.15) / 0.15;
        baseScale = 0.7 + 0.3 * t;
        blur = 8 - 8 * t; // Goes to 0 blur
        opacity = 0.65 + 0.25 * t;
        rotation = imageConfig.rotation * (0.3 + 0.4 * t);
      } 
      // Phase 3: In focus - EXTENDED pause with zero blur (0.3 to 0.65)
      else if (delayedProgress < 0.65) {
        const t = (delayedProgress - 0.3) / 0.35;
        baseScale = 1.0 + 0.15 * t; // Slow scale growth while in focus
        blur = 0; // Stay perfectly sharp
        opacity = 0.9 - 0.1 * t; // Very slight opacity fade
        rotation = imageConfig.rotation * (0.7 + 0.15 * t);
      } 
      // Phase 4: Exiting focus - starting to blur (0.65 to 0.85)
      else if (delayedProgress < 0.85) {
        const t = (delayedProgress - 0.65) / 0.2;
        baseScale = 1.15 + 0.25 * t;
        blur = 8 * t; // Gradual blur increase
        opacity = 0.8 - 0.35 * t;
        rotation = imageConfig.rotation * (0.85 + 0.1 * t);
      } 
      // Phase 5: Exit - fully blurred out (0.85 to 1.0)
      else {
        const t = (delayedProgress - 0.85) / 0.15;
        baseScale = 1.4 + 0.2 * t;
        blur = 8 + 12 * t;
        opacity = 0.45 - 0.45 * t;
        rotation = imageConfig.rotation * (0.95 + 0.05 * t);
      }

      const scale = baseScale * scaleMultiplier;

      gsap.set(imgElement, {
        scale,
        filter: `blur(${blur}px)`,
        opacity: Math.max(0, opacity),
        rotation,
        transformOrigin: 'center center',
      });
    });
  }, [scrollProgress, surfingScrollProgress, rooftopScrollProgress, breakfastScrollProgress, jatayuScrollProgress, totalActivities, allImages]);

  const getPositionStyles = (position: ActivityImage['position']): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none',
    };

    if (position.x === 'left') {
      baseStyles.left = `${5 + position.offsetX}%`;
    } else {
      baseStyles.right = `${5 + Math.abs(position.offsetX)}%`;
    }

    if (position.y === 'top') {
      baseStyles.top = `${10 + position.offsetY}%`;
    } else {
      baseStyles.bottom = `${10 + Math.abs(position.offsetY)}%`;
    }

    return baseStyles;
  };

  const handleImageLoad = (imageId: string) => {
    loadedImages.current.add(imageId);
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {allImages.map((imageConfig) => (
        <img
          key={imageConfig.id}
          ref={(el) => {
            imageRefs.current[imageConfig.id] = el;
          }}
          src={imageConfig.src}
          alt=""
          onLoad={() => handleImageLoad(imageConfig.id)}
          className="w-[30vw] md:w-[35vw] lg:w-[40vw] max-w-[400px] h-auto object-cover rounded-2xl"
          style={{
            ...getPositionStyles(imageConfig.position),
            opacity: 0,
            visibility: 'hidden',
            transform: 'scale(0.3)',
            filter: 'blur(20px)',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          }}
        />
      ))}
    </div>
  );
};

export default ActivityParallaxImages;
