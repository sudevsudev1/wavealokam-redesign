import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const scrollMessages = [
  "SURF.",
  "FEAST.",
  "EXPLORE.",
];

// Responsive text sizes handled in JSX

const SurfboardScrollSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const messages = messagesRef.current?.querySelectorAll('.scroll-message');
      
      if (messages) {
        messages.forEach((message, index) => {
          gsap.fromTo(
            message,
            {
              opacity: 0,
              scale: 0.8,
              y: 100,
            },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: message,
                start: 'top 80%',
                end: 'top 30%',
                scrub: 1,
              },
            }
          );

          // Fade out after viewing
          gsap.to(message, {
            opacity: 0,
            scale: 0.9,
            y: -50,
            scrollTrigger: {
              trigger: message,
              start: 'top 20%',
              end: 'top -10%',
              scrub: 1,
            },
          });
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[200vh] bg-wave-orange overflow-hidden"
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-wave-orange-dark/30 to-wave-purple/50" />

      {/* Scrolling Messages */}
      <div
        ref={messagesRef}
        className="relative z-10 flex flex-col items-center justify-center py-32"
      >
        {scrollMessages.map((message, index) => (
          <div
            key={index}
            className="scroll-message min-h-[60vh] flex items-center justify-center px-2"
          >
            <h2 className="text-display-xl text-[15vw] sm:text-[14vw] md:text-[13vw] lg:text-[12vw] text-white/90 text-center whitespace-nowrap">
              {message}
            </h2>
          </div>
        ))}
      </div>

      {/* Removed wave pattern overlay that was causing vertical line artifact */}
    </section>
  );
};

export default SurfboardScrollSection;
