import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Waves, Utensils, Mountain, Anchor, Palmtree, Moon, Wine } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface Activity {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
}

const activities: Activity[] = [
  {
    id: 1,
    title: 'SURFING',
    subtitle: 'Legendary Varkala Waves',
    description: 'Catch legendary Varkala waves with expert instructors. From beginners to pros, ride the perfect swells.',
    icon: <Waves className="w-16 h-16" />,
  },
  {
    id: 2,
    title: 'ROOFTOP DINNER',
    subtitle: 'Dine Under the Stars',
    description: 'Private cliff-top dining under the stars. Fresh seafood, local flavors, and an ocean view that never ends.',
    icon: <Utensils className="w-16 h-16" />,
  },
  {
    id: 3,
    title: 'JATAYU',
    subtitle: "Earth's Centre",
    description: "World's largest bird sculpture adventure. A mythological marvel perched atop a rock that tells stories of old.",
    icon: <Mountain className="w-16 h-16" />,
  },
  {
    id: 4,
    title: 'MANGROVE ADVENTURES',
    subtitle: 'Backwater Thrills',
    description: 'Kayak through mystical backwaters or get adrenaline rush with speed boat, quad bike, banana boat ride and much more.',
    icon: <Anchor className="w-16 h-16" />,
  },
  {
    id: 5,
    title: 'SREE EIGHT BEACH',
    subtitle: 'Quiet Paradise',
    description: 'Quiet, tourist-free paradise right across. Your private escape from the world, just steps away.',
    icon: <Palmtree className="w-16 h-16" />,
  },
  {
    id: 6,
    title: 'NORTH CLIFF NIGHTLIFE',
    subtitle: 'After Dark Magic',
    description: 'Where travelers come alive after dark. Music, vibes, and connections that last a lifetime.',
    icon: <Moon className="w-16 h-16" />,
  },
  {
    id: 7,
    title: 'TODDY',
    subtitle: 'Palm Wine Magic',
    description: 'The traditional, delicious and deceptively intoxicating palm wine. How can something so delicious be so sneaky!?',
    icon: <Wine className="w-16 h-16" />,
  },
];

const ActivitiesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      const container = containerRef.current;

      if (!section || !container) return;

      // Pin the section during scroll
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: `+=${activities.length * 100}%`,
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const newIndex = Math.min(
            Math.floor(progress * activities.length),
            activities.length - 1
          );
          setActiveIndex(newIndex);
        },
      });

      // Background color transitions
      gsap.to(section, {
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: `+=${activities.length * 100}%`,
          scrub: true,
        },
        background: `linear-gradient(180deg, 
          hsl(275, 100%, 25%) 0%, 
          hsl(240, 100%, 30%) 50%, 
          hsl(200, 100%, 35%) 100%)`,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="activities"
      className="relative h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, hsl(33, 100%, 50%) 0%, hsl(275, 100%, 25%) 100%)',
      }}
    >
      {/* 3D Perspective Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center perspective-1000"
      >
        <div className="relative w-full max-w-6xl mx-auto px-4 preserve-3d">
          {/* Activity Cards */}
          {activities.map((activity, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;
            const isFuture = index > activeIndex;

            return (
              <div
                key={activity.id}
                className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out"
                style={{
                  transform: isActive
                    ? 'translateZ(0) rotateX(0deg) scale(1)'
                    : isPast
                    ? 'translateZ(-500px) rotateX(45deg) translateY(-200px) scale(0.8)'
                    : 'translateZ(-500px) rotateX(-45deg) translateY(200px) scale(0.8)',
                  opacity: isActive ? 1 : 0,
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 text-white">
                  {/* Icon */}
                  <div
                    className="flex items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
                    style={{
                      boxShadow: isActive
                        ? '0 0 60px rgba(255, 255, 255, 0.3), 0 0 100px rgba(255, 140, 0, 0.2)'
                        : 'none',
                    }}
                  >
                    {activity.icon}
                  </div>

                  {/* Content */}
                  <div className="text-center lg:text-left max-w-xl">
                    <p className="text-lg md:text-xl font-medium text-white/70 mb-2">
                      {activity.subtitle}
                    </p>
                    <h3 className="text-display text-5xl md:text-7xl lg:text-8xl mb-6">
                      {activity.title}
                    </h3>
                    <p className="text-lg md:text-xl text-white/80 leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Progress Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {activities.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'bg-white scale-150'
                    : index < activeIndex
                    ? 'bg-white/50'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        Keep scrolling to explore activities
      </div>
    </section>
  );
};

export default ActivitiesSection;
