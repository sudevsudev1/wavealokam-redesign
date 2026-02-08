import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to={ROUTES.home} className="text-lg sm:text-xl font-bold text-[hsl(var(--wave-orange))]">
            WAVEALOKAM
          </Link>

          {/* Navigation Links - Always visible */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-xs sm:text-sm font-medium text-foreground/70 hover:text-[hsl(var(--wave-orange))] transition-colors whitespace-nowrap"
              >
                {link.name}
              </Link>
            ))}
            <Link
              to={ROUTES.contact}
              className="hidden sm:block px-3 sm:px-4 py-1.5 sm:py-2 bg-[hsl(var(--wave-orange))] text-white text-xs sm:text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PillarNav;
