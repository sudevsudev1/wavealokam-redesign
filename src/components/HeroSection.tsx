import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Surfboard from './Surfboard';
import OTAIcons from './OTAIcons';

const HeroSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    const ctx = gsap.context(() => {
      // Animation timeline
      const tl = gsap.timeline({ delay: 0.3 });

      // Title fades in
      tl.from('.hero-title', {
        opacity: 0,
        y: 50,
        duration: 1,
        ease: 'power3.out',
      })
        // Subtitle fades in
        .from(
          '.hero-subtitle',
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        // Surfboard slides in from bottom
        .from(
          '.hero-surfboard',
          {
            opacity: 0,
            y: 200,
            duration: 1.2,
            ease: 'power3.out',
          },
          '-=0.3'
        )
        // OTA icons fade in
        .from(
          '.hero-ota',
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.5'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(33, 100%, 50%) 0%, hsl(38, 100%, 54%) 100%)',
      }}
    >
      {/* Logo */}
      <div className="absolute top-6 left-6 z-20">
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          WAVEALOKAM
        </h2>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 pt-20 pb-8">
        {/* Tagline */}
        <h1 className="hero-title text-display-xl text-6xl md:text-8xl lg:text-9xl text-white mb-4">
          IT'S WAVECATION
          <br />
          TIME!
        </h1>

        <p className="hero-subtitle text-xl md:text-2xl text-white/90 font-medium mb-8 max-w-2xl mx-auto">
          Surf. Feast. Explore. Your beachside adventure awaits at Varkala.
        </p>

        {/* OTA Ratings */}
        <div className="hero-ota">
          <OTAIcons />
        </div>
      </div>

      {/* Surfboard - Positioned for scroll animation */}
      <div className="hero-surfboard relative z-20 mt-auto">
        <Surfboard />
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/70">
        <span className="text-sm font-medium">Scroll to explore</span>
        <div className="w-6 h-10 rounded-full border-2 border-white/50 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-white/70 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
