import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const surfImages = [
  '/activities/surfing-new/10.webp',
  '/activities/surfing-new/1.webp',
  '/activities/surfing-new/3.webp',
  '/activities/surfing-new/4.webp',
  '/activities/surfing-new/5.webp',
  '/activities/surfing-new/6.webp',
  '/activities/surfing-new/7.webp',
  '/activities/surfing-new/8.webp',
  '/activities/surfing-new/9.webp',
  '/activities/surfing-new/2.webp',
];

const TOTAL_IMAGES = surfImages.length;
const VISIBLE_ARC = 120; // degrees - shows 1/3 of circle (120 out of 360)
const CIRCLE_RADIUS = 800; // pixels - radius of the virtual circle

interface SurfCircularGalleryProps {
  scrollProgress: number; // 0 to 1
}

const SurfCircularGallery = ({ scrollProgress }: SurfCircularGalleryProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate rotation - 10 images means we need to rotate through all of them
  // Full cycle = 360 degrees, we want all 10 images to cycle through
  const rotationOffset = scrollProgress * 360 * (TOTAL_IMAGES / TOTAL_IMAGES);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      {surfImages.map((src, index) => {
        // Calculate angle for this image in the circle
        // Distribute images evenly around 360 degrees
        const baseAngle = (index / TOTAL_IMAGES) * 360;
        // Apply scroll rotation (clockwise)
        const currentAngle = (baseAngle - rotationOffset + 360) % 360;
        
        // Convert to radians for position calculation
        const angleRad = (currentAngle * Math.PI) / 180;
        
        // Position on the circle - center is at top (12 o'clock position)
        // We offset by -90 degrees so 0 angle is at top
        const adjustedAngleRad = ((currentAngle - 90) * Math.PI) / 180;
        
        // Calculate position
        const x = Math.cos(adjustedAngleRad) * CIRCLE_RADIUS;
        const y = Math.sin(adjustedAngleRad) * CIRCLE_RADIUS;
        
        // Only show images in the visible arc (top 1/3 of circle: -60 to +60 from top)
        // Normalize angle to -180 to 180 range
        let normalizedAngle = currentAngle;
        if (normalizedAngle > 180) normalizedAngle -= 360;
        
        // Check if image is in visible arc (top portion)
        const isInVisibleArc = normalizedAngle >= -60 && normalizedAngle <= 60;
        
        // Calculate distance from the top position (0 degrees)
        const distanceFromTop = Math.abs(normalizedAngle);
        
        // The closer to 0 (top), the more in focus
        const isCentered = distanceFromTop < 15; // within 15 degrees of center
        
        // Blur increases with distance from center
        const blurAmount = isCentered ? 0 : Math.min(distanceFromTop / 4, 12);
        
        // Scale: larger at center, smaller at edges - much bigger images
        const scale = isCentered ? 1.4 : 0.9 + (1 - distanceFromTop / 60) * 0.4;
        
        // Opacity: 50% at center (as requested), fades out toward edges
        const centerOpacity = 0.5;
        const edgeOpacity = 0.25;
        const opacity = isInVisibleArc 
          ? (isCentered ? centerOpacity : edgeOpacity + (1 - distanceFromTop / 60) * (centerOpacity - edgeOpacity))
          : 0;

        // Z-index: centered image on top
        const zIndex = isCentered ? 10 : Math.floor(10 - distanceFromTop / 10);

        // Special vertical offset for second image (index 1) to prevent top cropping
        const imageYOffset = index === 1 ? 200 : 0;

        return (
          <div
            key={index}
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${x}px, ${y + CIRCLE_RADIUS * 1.3 + imageYOffset}px) scale(${scale})`,
              opacity,
              filter: `blur(${blurAmount}px)`,
              zIndex,
              willChange: 'transform, opacity, filter',
            }}
          >
            <img
              src={src}
              alt={`Surfing ${index + 1}`}
              className="w-64 h-[70vh] md:w-80 md:h-[80vh] lg:w-96 lg:h-[90vh] object-cover rounded-3xl shadow-2xl"
              loading="eager"
            />
          </div>
        );
      })}
    </div>
  );
};

export default SurfCircularGallery;
