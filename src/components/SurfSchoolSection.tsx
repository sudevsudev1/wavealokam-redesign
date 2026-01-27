import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Award, Users, Waves } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const levels = [
  { name: 'Beginners', description: 'First-time surfers welcome. Learn the basics in calm waters.' },
  { name: 'Intermediate', description: 'Perfect your technique and ride bigger waves.' },
  { name: 'Advanced', description: 'Challenge yourself with Varkala\'s legendary swells.' },
];

const SurfSchoolSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
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
      className="relative py-24 md:py-32 bg-gradient-to-b from-wave-blue-ocean to-wave-purple overflow-hidden"
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="surf-title text-lg font-medium text-wave-orange mb-2">LEARN FROM THE BEST</p>
          <h2 className="surf-title text-display text-5xl md:text-7xl text-white mb-4">
            SURF SCHOOL
          </h2>
          <p className="surf-title text-lg text-white/80 max-w-2xl mx-auto">
            Learn to surf with Varkala's finest instructors. Whether you're catching your first wave or mastering advanced techniques.
          </p>
        </div>

        {/* Brand Ambassador */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-16 p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-4xl mx-auto">
          <div className="w-32 h-32 rounded-full bg-wave-orange flex items-center justify-center">
            <Waves className="w-16 h-16 text-white" />
          </div>
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Award className="w-5 h-5 text-wave-orange" />
              <span className="text-wave-orange font-medium">Brand Ambassador</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">Sudev Nair</h3>
            <p className="text-white/70">Professional surfer & certified instructor with 10+ years of experience in Varkala waves</p>
          </div>
        </div>

        {/* Skill Levels */}
        <div ref={contentRef} className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto perspective-1000">
          {levels.map((level, index) => (
            <div
              key={level.name}
              className="level-card p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:-translate-y-2"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-wave-orange flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <h3 className="text-2xl font-bold text-white">{level.name}</h3>
              </div>
              <p className="text-white/70">{level.description}</p>
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
            className="px-8 py-4 bg-wave-orange text-white font-bold text-lg rounded-full hover:bg-wave-orange-dark transition-all duration-300 hover:scale-105 shadow-xl"
          >
            Book Your Surf Lesson
          </button>
        </div>
      </div>
    </section>
  );
};

export default SurfSchoolSection;
