import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ROUTES } from '@/lib/routes';

const PillarNav = () => {
  const [isOpen, setIsOpen] = useState(false);

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
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={ROUTES.home} className="text-xl font-bold text-[hsl(var(--wave-orange))]">
            WAVEALOKAM
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-foreground/70 hover:text-[hsl(var(--wave-orange))] transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <Link
              to={ROUTES.contact}
              className="px-4 py-2 bg-[hsl(var(--wave-orange))] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Book Now
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="py-2 text-foreground/70 hover:text-[hsl(var(--wave-orange))] transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to={ROUTES.contact}
                onClick={() => setIsOpen(false)}
                className="mt-2 px-4 py-3 bg-[hsl(var(--wave-orange))] text-white text-center font-semibold rounded-lg"
              >
                Book Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default PillarNav;
