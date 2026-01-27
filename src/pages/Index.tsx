import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import HamburgerMenu from '@/components/HamburgerMenu';
import WhatsAppButton from '@/components/WhatsAppButton';
import HeroSection from '@/components/HeroSection';
import SurfboardScrollSection from '@/components/SurfboardScrollSection';
import ActivitiesSection from '@/components/ActivitiesSection';
import RoomsSection from '@/components/RoomsSection';
import DiningSection from '@/components/DiningSection';
import SurfSchoolSection from '@/components/SurfSchoolSection';
import ItineraryBuilder from '@/components/ItineraryBuilder';
import Footer from '@/components/Footer';

gsap.registerPlugin(ScrollTrigger);

const Index = () => {
  useEffect(() => {
    // Initialize smooth scroll behavior
    ScrollTrigger.defaults({
      toggleActions: 'play none none reverse',
    });

    // Refresh ScrollTrigger on page load
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.killAll();
    };
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      {/* Fixed Navigation */}
      <HamburgerMenu />
      
      {/* Fixed WhatsApp Button */}
      <WhatsAppButton />

      {/* Page Sections */}
      <HeroSection />
      <SurfboardScrollSection />
      <ActivitiesSection />
      <RoomsSection />
      <DiningSection />
      <SurfSchoolSection />
      <ItineraryBuilder />
      <Footer />
    </div>
  );
};

export default Index;
