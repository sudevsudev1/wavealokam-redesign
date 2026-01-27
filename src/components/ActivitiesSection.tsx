import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Waves, Utensils, Mountain, Anchor, Palmtree, Moon, Wine, Coffee } from 'lucide-react';

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
    description: "Catch legendary Varkala waves with our in house Surf School's expert instructors. Whether you're a wobbly beginner or think you're Kelly Slater, we'll get you vertical-ish.",
    icon: <Waves className="w-16 h-16" />,
  },
  {
    id: 2,
    title: 'ROOFTOP DINNER',
    subtitle: 'Dine Under the Stars',
    description: "Bring your significant other for a surprise dinner under the stars, or bring your mates to sprawl until sunrise on bean bags so comfortable you'll forget you paid for a hotel room. Either way, someone's not making it back to their room - we provide the alibi, the cutlery and ice. You provide the drama. Everybody wins.",
    icon: <Utensils className="w-16 h-16" />,
  },
  {
    id: 3,
    title: 'SREE EIGHT BEACH',
    subtitle: 'Quiet Paradise',
    description: "Stroll into a quiet, tourist free beach in Varkala right across the road. You don't appreciate this now because you haven't met the other beaches yet. You will. They'll introduce themselves. Loudly. In seventeen languages.",
    icon: <Palmtree className="w-16 h-16" />,
  },
  {
    id: 4,
    title: "CHECHI'S BREAKFAST",
    subtitle: 'Kerala Homemade Love',
    description: "Lekha Chechi's homemade Kerala breakfast along with fresh fruits, juice, eggs, toast, and the kind of love your grandmother threatened you with. Booked without breakfast? You stingy little... There is a way. Just don't mention we snitched. Compliment Amardeep on the property, promise five stars, watch breakfast served to your room free of cost. She has a heart of gold. But only if you get there early. This is the kind of breakfast that's not eaten, it's inhaled.",
    icon: <Coffee className="w-16 h-16" />,
  },
  {
    id: 5,
    title: 'MANGROVE ADVENTURES',
    subtitle: 'Backwater Thrills',
    description: "Soft solitude in a kayak or absolute chaos on a banana boat - we cater to both your personalities. Speed boat, Quad bike, so many activities for people with resolved and unresolved issues, we had to store the list on a separate hard drive.",
    icon: <Anchor className="w-16 h-16" />,
  },
  {
    id: 6,
    title: 'TODDY',
    subtitle: 'Palm Wine Magic',
    description: "Traditional palm wine: deceptively delicious going in, three glasses in, you're fluent in Malayalam. Four glasses in, you're not fluent in walking. The morning-after gives you a bowel movement so satisfying you'll understand religion. And your smile is so suspiciously euphoric, strangers assume we're running a cartel. The glow-up is legal, we promise. That's just your digestive system having its main character moment.",
    icon: <Wine className="w-16 h-16" />,
  },
  {
    id: 7,
    title: 'JATAYU',
    subtitle: "Earth's Centre",
    description: "Earth's biggest bird sculpture mythological marvel, frozen mid-rescue atop an ancient rock telling stories thousands of years old. Tourists telling themselves they've outsmarted the rush? Even older. The queue doesn't care about your strategy, Karen.",
    icon: <Mountain className="w-16 h-16" />,
  },
  {
    id: 8,
    title: 'NORTH CLIFF NIGHTLIFE',
    subtitle: 'After Dark Magic',
    description: "Ten minutes to reach the Cliff, ten years to emotionally recover from leaving it. You'll find your tribe, lose track of time - and your return ticket. The music follows you home. So does Pierre from Belgium who is now your new best friend.",
    icon: <Moon className="w-16 h-16" />,
  },
];

const ActivitiesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;

    if (!section || !container) return;

    // Create ScrollTrigger for pinning and activity transitions
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: `+=${activities.length * 100}%`,
      pin: true,
      pinSpacing: true,
      scrub: 0.5,
      onUpdate: (self) => {
        const progress = self.progress;
        const newIndex = Math.min(
          Math.floor(progress * activities.length),
          activities.length - 1
        );
        setActiveIndex(newIndex);
        
        // Update background color based on progress
        const startHue = 33; // orange
        const midHue = 275; // purple
        const endHue = 200; // blue
        
        let hue, saturation, lightness;
        if (progress < 0.5) {
          const t = progress * 2;
          hue = startHue + (midHue - startHue) * t;
          saturation = 100;
          lightness = 50 - (25 * t);
        } else {
          const t = (progress - 0.5) * 2;
          hue = midHue + (endHue - midHue) * t;
          saturation = 100;
          lightness = 25 + (10 * t);
        }
        
        section.style.background = `linear-gradient(180deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${hue + 20}, ${saturation}%, ${lightness - 5}%) 100%)`;
      },
    });

    return () => {
      trigger.kill();
    };
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
                    className="flex items-center justify-center w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex-shrink-0"
                    style={{
                      boxShadow: isActive
                        ? '0 0 60px rgba(255, 255, 255, 0.3), 0 0 100px rgba(255, 140, 0, 0.2)'
                        : 'none',
                    }}
                  >
                    {activity.icon}
                  </div>

                  {/* Content */}
                  <div className="text-center lg:text-left max-w-xl px-4">
                    <p className="text-base md:text-lg lg:text-xl font-medium text-white/70 mb-2">
                      {activity.subtitle}
                    </p>
                    <h3 className="text-display text-3xl md:text-5xl lg:text-6xl xl:text-7xl mb-4 md:mb-6">
                      {activity.title}
                    </h3>
                    <p className="text-sm md:text-base lg:text-lg text-white/80 leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
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
