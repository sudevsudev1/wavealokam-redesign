import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

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
  rotation: number; // Direction of rotation (-15 to 15 degrees)
}

interface ActivityImagesConfig {
  activityId: number;
  images: ActivityImage[];
}

// Image configurations for each activity
// Users will add their images to public/activities/{activity-name}/
const activityImagesConfig: ActivityImagesConfig[] = [
  {
    activityId: 1, // Surfing
    images: [
      { id: 'surf-1', src: '/activities/surfing/1.jpg', position: { x: 'left', y: 'top', offsetX: 8, offsetY: 12 }, delay: 0, rotation: 12 },
      { id: 'surf-2', src: '/activities/surfing/2.jpg', position: { x: 'right', y: 'bottom', offsetX: -10, offsetY: -15 }, delay: 0.2, rotation: -8 },
      { id: 'surf-3', src: '/activities/surfing/3.jpg', position: { x: 'left', y: 'bottom', offsetX: 12, offsetY: -8 }, delay: 0.4, rotation: 15 },
      { id: 'surf-4', src: '/activities/surfing/4.jpg', position: { x: 'right', y: 'top', offsetX: -8, offsetY: 18 }, delay: 0.6, rotation: -12 },
    ],
  },
  {
    activityId: 2, // Rooftop Dinner
    images: [
      { id: 'roof-1', src: '/activities/rooftop-dinner/1.jpg', position: { x: 'right', y: 'top', offsetX: -12, offsetY: 10 }, delay: 0, rotation: -10 },
      { id: 'roof-2', src: '/activities/rooftop-dinner/2.jpg', position: { x: 'left', y: 'bottom', offsetX: 10, offsetY: -12 }, delay: 0.25, rotation: 8 },
      { id: 'roof-3', src: '/activities/rooftop-dinner/3.jpg', position: { x: 'right', y: 'bottom', offsetX: -8, offsetY: -18 }, delay: 0.5, rotation: -15 },
    ],
  },
  {
    activityId: 3, // Sree Eight Beach
    images: [
      { id: 'beach-1', src: '/activities/sree-eight-beach/1.jpg', position: { x: 'left', y: 'top', offsetX: 15, offsetY: 8 }, delay: 0, rotation: 10 },
      { id: 'beach-2', src: '/activities/sree-eight-beach/2.jpg', position: { x: 'right', y: 'top', offsetX: -15, offsetY: 15 }, delay: 0.3, rotation: -12 },
      { id: 'beach-3', src: '/activities/sree-eight-beach/3.jpg', position: { x: 'left', y: 'bottom', offsetX: 8, offsetY: -10 }, delay: 0.6, rotation: 8 },
    ],
  },
  {
    activityId: 4, // Chechi's Breakfast
    images: [
      { id: 'bfast-1', src: '/activities/chechis-breakfast/1.jpg', position: { x: 'right', y: 'bottom', offsetX: -10, offsetY: -8 }, delay: 0, rotation: -8 },
      { id: 'bfast-2', src: '/activities/chechis-breakfast/2.jpg', position: { x: 'left', y: 'top', offsetX: 12, offsetY: 15 }, delay: 0.25, rotation: 12 },
      { id: 'bfast-3', src: '/activities/chechis-breakfast/3.jpg', position: { x: 'right', y: 'top', offsetX: -8, offsetY: 10 }, delay: 0.5, rotation: -10 },
    ],
  },
  {
    activityId: 5, // Mangrove Adventures
    images: [
      { id: 'mang-1', src: '/activities/mangrove-adventures/1.jpg', position: { x: 'left', y: 'bottom', offsetX: 10, offsetY: -15 }, delay: 0, rotation: 15 },
      { id: 'mang-2', src: '/activities/mangrove-adventures/2.jpg', position: { x: 'right', y: 'top', offsetX: -12, offsetY: 12 }, delay: 0.2, rotation: -10 },
      { id: 'mang-3', src: '/activities/mangrove-adventures/3.jpg', position: { x: 'left', y: 'top', offsetX: 8, offsetY: 8 }, delay: 0.4, rotation: 8 },
    ],
  },
  {
    activityId: 6, // Toddy
    images: [
      { id: 'toddy-1', src: '/activities/toddy/1.jpg', position: { x: 'right', y: 'bottom', offsetX: -15, offsetY: -10 }, delay: 0, rotation: -12 },
      { id: 'toddy-2', src: '/activities/toddy/2.jpg', position: { x: 'left', y: 'top', offsetX: 10, offsetY: 12 }, delay: 0.3, rotation: 10 },
      { id: 'toddy-3', src: '/activities/toddy/3.jpg', position: { x: 'right', y: 'top', offsetX: -8, offsetY: 18 }, delay: 0.6, rotation: -8 },
    ],
  },
  {
    activityId: 7, // Jatayu
    images: [
      { id: 'jatayu-1', src: '/activities/jatayu/1.jpg', position: { x: 'left', y: 'top', offsetX: 12, offsetY: 10 }, delay: 0, rotation: 8 },
      { id: 'jatayu-2', src: '/activities/jatayu/2.jpg', position: { x: 'right', y: 'bottom', offsetX: -10, offsetY: -12 }, delay: 0.25, rotation: -15 },
      { id: 'jatayu-3', src: '/activities/jatayu/3.jpg', position: { x: 'left', y: 'bottom', offsetX: 15, offsetY: -8 }, delay: 0.5, rotation: 12 },
    ],
  },
  {
    activityId: 8, // North Cliff Nightlife
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
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  const loadedImages = useRef<Set<string>>(new Set());

  // Calculate which activities should show images (current + adjacent for transitions)
  const visibleActivities = [activeIndex - 1, activeIndex, activeIndex + 1].filter(
    (i) => i >= 0 && i < totalActivities
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Animate each visible activity's images
    visibleActivities.forEach((activityIdx) => {
      const config = activityImagesConfig.find((c) => c.activityId === activityIdx + 1);
      if (!config) return;

      // Calculate local progress for this activity
      const activityDuration = 1 / totalActivities;
      const activityStart = activityIdx * activityDuration;
      const localProgress = Math.max(0, Math.min(1, (scrollProgress - activityStart) / activityDuration));

      config.images.forEach((imageConfig) => {
        const imgElement = imageRefs.current.get(imageConfig.id);
        if (!imgElement || !loadedImages.current.has(imageConfig.id)) return;

        // Adjust progress based on image delay (stagger)
        const delayedProgress = Math.max(0, Math.min(1, (localProgress - imageConfig.delay) / (1 - imageConfig.delay)));

        // Animation values based on progress phases
        let scale: number;
        let blur: number;
        let opacity: number;
        let rotation: number;

        if (delayedProgress < 0.2) {
          // Enter phase: 0-20%
          const t = delayedProgress / 0.2;
          scale = 0.3 + 0.4 * t; // 0.3 to 0.7
          blur = 20 - 12 * t; // 20 to 8
          opacity = 0.3 + 0.3 * t; // 0.3 to 0.6
          rotation = imageConfig.rotation * 0.3 * t; // Start rotating
        } else if (delayedProgress < 0.5) {
          // Focus phase: 20-50%
          const t = (delayedProgress - 0.2) / 0.3;
          scale = 0.7 + 0.3 * t; // 0.7 to 1.0
          blur = 8 - 8 * t; // 8 to 0
          opacity = 0.6 + 0.2 * t; // 0.6 to 0.8
          rotation = imageConfig.rotation * (0.3 + 0.4 * t); // Continue rotating
        } else if (delayedProgress < 0.8) {
          // Exit start: 50-80%
          const t = (delayedProgress - 0.5) / 0.3;
          scale = 1.0 + 0.3 * t; // 1.0 to 1.3
          blur = 5 * t; // 0 to 5
          opacity = 0.8 - 0.3 * t; // 0.8 to 0.5
          rotation = imageConfig.rotation * (0.7 + 0.2 * t); // More rotation
        } else {
          // Exit end: 80-100%
          const t = (delayedProgress - 0.8) / 0.2;
          scale = 1.3 + 0.3 * t; // 1.3 to 1.6
          blur = 5 + 10 * t; // 5 to 15
          opacity = 0.5 - 0.5 * t; // 0.5 to 0
          rotation = imageConfig.rotation * (0.9 + 0.1 * t); // Full rotation
        }

        // Apply animations
        gsap.set(imgElement, {
          scale,
          filter: `blur(${blur}px)`,
          opacity,
          rotation,
          transformOrigin: 'center center',
        });
      });
    });
  }, [scrollProgress, activeIndex, totalActivities, visibleActivities]);

  // Calculate position styles for an image
  const getPositionStyles = (position: ActivityImage['position']): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none',
    };

    // Horizontal positioning
    if (position.x === 'left') {
      baseStyles.left = `${5 + position.offsetX}%`;
    } else {
      baseStyles.right = `${5 + Math.abs(position.offsetX)}%`;
    }

    // Vertical positioning
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

  const handleImageError = (imageId: string) => {
    // Remove from refs if image fails to load
    imageRefs.current.delete(imageId);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {visibleActivities.map((activityIdx) => {
        const config = activityImagesConfig.find((c) => c.activityId === activityIdx + 1);
        if (!config) return null;

        return config.images.map((imageConfig) => (
          <img
            key={imageConfig.id}
            ref={(el) => {
              if (el) {
                imageRefs.current.set(imageConfig.id, el);
              }
            }}
            src={imageConfig.src}
            alt=""
            onLoad={() => handleImageLoad(imageConfig.id)}
            onError={() => handleImageError(imageConfig.id)}
            className="w-[30vw] md:w-[35vw] lg:w-[40vw] max-w-[400px] h-auto object-cover rounded-2xl"
            style={{
              ...getPositionStyles(imageConfig.position),
              opacity: 0,
              transform: 'scale(0.3)',
              filter: 'blur(20px)',
              maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
            }}
          />
        ));
      })}
    </div>
  );
};

export default ActivityParallaxImages;
