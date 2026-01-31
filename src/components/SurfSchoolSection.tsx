import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Award, Users, Waves } from 'lucide-react';
import SurfCircularGallery from './SurfCircularGallery';

gsap.registerPlugin(ScrollTrigger);

const levels = [
  { 
    name: 'Beginners', 
    description: "Safe, gentle surf lessons for first-timers. Calm waters, patient instructors, and camera angles that turn your wobbly three-second stand into \"extreme sports legend.\" We provide the board. You provide the creative captioning." 
  },
  { 
    name: 'Intermediate', 
    description: "Ready for bigger waves? Our intermediate program will elevate your technique and humble you in entirely new ways. You thought you had this figured out. The ocean has notes. Many notes." 
  },
  { 
    name: 'Advanced', 
    description: "Challenge yourself with Varkala's legendary swells. Advanced surfers only. Beginners who lie about their level also welcome. The sea sorts everyone out immediately. These waves have reputations. So do the rocks. May the best entity win. Spoiler: it's never the rocks, but it's also never you." 
  },
];

const SurfSchoolSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Main scroll progress for the circular gallery
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 80%',
        end: 'bottom 20%',
        onUpdate: (self) => {
          setScrollProgress(self.progress);
        },
        onEnter: () => setIsInView(true),
        onLeave: () => setIsInView(false),
        onEnterBack: () => setIsInView(true),
        onLeaveBack: () => setIsInView(false),
      });

      gsap.fromTo(
        '.surf-title',
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      );

      const cards = contentRef.current?.querySelectorAll('.level-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 80, rotateY: -15 },
          {
            opacity: 1,
            y: 0,
            rotateY: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: contentRef.current,
              start: 'top 70%',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="surf-school"
      className="relative py-24 md:py-32 bg-wave-orange overflow-hidden"
    >
      {/* Circular Gallery Background */}
      {isInView && <SurfCircularGallery scrollProgress={scrollProgress} />}

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="surf-title text-lg font-medium text-white/80 mb-2">LEARN FROM THE BEST</p>
          <h2 className="surf-title text-display text-5xl md:text-7xl text-white mb-4 drop-shadow-lg">
            SURF SCHOOL
          </h2>
          <p className="surf-title text-lg text-white/80 max-w-3xl mx-auto drop-shadow-md">
            Varkala's best surf instructors will get you riding waves in no time. Beginner or expert, they'll teach you that the ocean has a sense of humor and you're the punchline.
          </p>
        </div>

        {/* Brand Ambassador */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-16 p-8 bg-white/30 backdrop-blur-lg rounded-3xl border border-white/40 max-w-4xl mx-auto shadow-xl">
          <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center">
            <Waves className="w-16 h-16 text-wave-orange" />
          </div>
          <div className="text-center md:text-left max-w-xl">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Award className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Brand Ambassador</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-md">Sudev Nair</h3>
            <p className="text-white/95 text-sm md:text-base drop-shadow-sm">Award winning Actor, gymnast, dancer, martial artist, Sudev Nair is a lot of things. Surfer... well he did finally upgrade from foam to hardboard last Monday without crying... more than once. On an unrelated note, did we mention he is also the owner of Wavealokam? yeah...</p>
          </div>
        </div>

        {/* Skill Levels */}
        <div ref={contentRef} className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto perspective-1000">
          {levels.map((level, index) => (
            <div
              key={level.name}
              className="level-card p-6 md:p-8 bg-white/30 backdrop-blur-lg rounded-2xl border border-white/40 hover:bg-white/40 transition-all duration-300 hover:-translate-y-2 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-wave-orange font-bold">
                  {index + 1}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">{level.name}</h3>
              </div>
              <p className="text-white/95 text-sm md:text-base leading-relaxed drop-shadow-sm">{level.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button
            onClick={() => {
              const element = document.querySelector('#itinerary');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 bg-white text-wave-orange font-bold text-lg rounded-full hover:bg-white/90 transition-all duration-300 hover:scale-105 shadow-xl"
          >
            Book Your Surf Lesson
          </button>
        </div>
      </div>
    </section>
  );
};

export default SurfSchoolSection;
