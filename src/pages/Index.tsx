import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import MainNav from '@/components/MainNav';
import HamburgerMenu from '@/components/HamburgerMenu';


import DiscountQuizBox from '@/components/DiscountQuizBox';
import HeroSection from '@/components/HeroSection';
import SurfboardScrollSection from '@/components/SurfboardScrollSection';
import ActivitiesSection from '@/components/ActivitiesSection';
import RoomsSection from '@/components/RoomsSection';
import SurfSchoolSection from '@/components/SurfSchoolSection';
import BookingWizard from '@/components/BookingWizard';
import GallerySection from '@/components/GallerySection';
import OriginStorySection from '@/components/OriginStorySection';
import FAQSection from '@/components/FAQSection';
import Footer from '@/components/Footer';
import { useScrollToHash } from '@/hooks/useScrollToHash';

gsap.registerPlugin(ScrollTrigger);

const Index = () => {
  // Handle scrolling to hash anchors (from cross-page navigation)
  useScrollToHash();

  useEffect(() => {
    // Initialize smooth scroll behavior
    ScrollTrigger.defaults({
      toggleActions: 'play none none reverse',
    });

    // Refresh ScrollTrigger after DOM is fully ready
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.killAll();
    };
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      {/* Main Navigation */}
      <MainNav />
      
      {/* Hamburger Menu (overlay) - above nav */}
      <HamburgerMenu />
      
      


      {/* Discount Quiz Box */}
      <DiscountQuizBox />

      {/* Page Sections */}
      <HeroSection />
      <SurfboardScrollSection />
      <ActivitiesSection />
      <RoomsSection />
      <SurfSchoolSection />
      <BookingWizard />
      <GallerySection />
      <OriginStorySection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
