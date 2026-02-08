import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/routes';
import { HOME_SECTIONS } from '@/lib/homeSections';

interface NavItem {
  label: string;
  href: string;
  isHomepageSection?: boolean;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Stay', href: ROUTES.stay },
  { label: 'Surf + Stay', href: ROUTES.surfStay },
  { label: 'Workation', href: ROUTES.workation },
  { label: 'Long Stay', href: ROUTES.longStay },
  {
    label: 'Plan Your Stay',
    href: '#',
    children: [
      { label: 'Varkala Travel Guide', href: ROUTES.guide },
      { label: 'Best Time to Visit', href: ROUTES.bestTime },
      { label: 'How to Reach Varkala', href: ROUTES.reach },
      { label: 'Build Your Itinerary', href: HOME_SECTIONS.itinerary, isHomepageSection: true },
    ],
  },
];

const MainNav = () => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHomepageSectionClick = (href: string) => {
    // href is already in format "/#section"
    const hash = href.replace('/', '');
    if (location.pathname === '/') {
      // Already on homepage, just scroll
      const element = document.querySelector(hash);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Navigate to homepage with hash - use native navigation
      window.location.href = href;
    }
    setOpenDropdown(null);
  };

  const handleLinkClick = () => {
    setOpenDropdown(null);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link 
            to={ROUTES.home}
            className="text-lg sm:text-xl font-bold text-wave-orange hover:opacity-90 transition-opacity shrink-0"
            aria-label="Wavealokam Homepage"
          >
            WAVEALOKAM
          </Link>

          {/* Navigation Links - Always visible */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4" ref={dropdownRef}>
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                {item.children ? (
                  // Dropdown trigger
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    className={cn(
                      "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                      "text-foreground/70 hover:text-foreground hover:bg-muted/50",
                      openDropdown === item.label && "text-foreground bg-muted/50"
                    )}
                    aria-expanded={openDropdown === item.label}
                    aria-haspopup="true"
                    aria-label={`${item.label} menu`}
                  >
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">Plan</span>
                    <ChevronDown className={cn(
                      "w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200",
                      openDropdown === item.label && "rotate-180"
                    )} />
                  </button>
                ) : (
                  // Regular link
                  <Link
                    to={item.href}
                    onClick={handleLinkClick}
                    className="px-1.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors whitespace-nowrap"
                    aria-label={`Navigate to ${item.label}`}
                  >
                    {item.label}
                  </Link>
                )}

                {/* Dropdown Menu */}
                {item.children && openDropdown === item.label && (
                  <div 
                    className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 w-48 sm:w-56 bg-background border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 z-50"
                  >
                    <div className="py-2">
                      {item.children.map((child) => (
                        child.isHomepageSection ? (
                          <a
                            key={child.label}
                            href={child.href}
                            onClick={(e) => {
                              e.preventDefault();
                              handleHomepageSectionClick(child.href);
                            }}
                            className="block px-4 py-2.5 text-xs sm:text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                            aria-label={child.label}
                          >
                            {child.label}
                          </a>
                        ) : (
                          <Link
                            key={child.label}
                            to={child.href}
                            onClick={handleLinkClick}
                            className="block px-4 py-2.5 text-xs sm:text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                            aria-label={`Navigate to ${child.label}`}
                          >
                            {child.label}
                          </Link>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* CTA Button - visible on all screens */}
            <Link
              to={ROUTES.contact}
              className="ml-1 sm:ml-2 px-2 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-wave-orange text-white text-[10px] sm:text-xs md:text-sm font-semibold rounded-full hover:bg-wave-orange/90 transition-all hover:scale-105 shadow-lg shadow-wave-orange/20 whitespace-nowrap"
              aria-label="Contact Wavealokam to book"
            >
              <span className="hidden sm:inline">Book / Contact</span>
              <span className="sm:hidden">Book</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNav;
