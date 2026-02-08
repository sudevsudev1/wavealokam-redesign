import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import HamburgerMenu from '@/components/HamburgerMenu';

const PillarNav = () => {
  const navLinks = [
    { name: 'Stay', href: ROUTES.stay },
    { name: 'Surf + Stay', href: ROUTES.surfStay },
    { name: 'Workation', href: ROUTES.workation },
    { name: 'Long Stay', href: ROUTES.longStay },
    { name: 'Guide', href: ROUTES.guide },
    { name: 'Contact', href: ROUTES.contact },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to={ROUTES.home} className="text-base sm:text-lg md:text-xl font-bold text-[hsl(var(--wave-orange))] shrink-0">
              WAVEALOKAM
            </Link>

            {/* Navigation Links - Wrap on smaller screens */}
            <div className="flex items-center flex-wrap justify-end gap-1.5 sm:gap-2 md:gap-4 lg:gap-6 ml-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-[10px] sm:text-xs md:text-sm font-medium text-foreground/70 hover:text-[hsl(var(--wave-orange))] transition-colors whitespace-nowrap"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to={ROUTES.contact}
                className="hidden md:block px-3 py-1.5 sm:px-4 sm:py-2 bg-[hsl(var(--wave-orange))] text-white text-xs sm:text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hamburger Menu - positioned below the nav bar */}
      <HamburgerMenu />
    </>
  );
};

export default PillarNav;
