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
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDesktop = desktopDropdownRef.current?.contains(target);
      const isInsideMobile = mobileDropdownRef.current?.contains(target);
      if (!isInsideDesktop && !isInsideMobile) {
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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        {/* Row 1: Logo */}
        <div className="flex items-center justify-between h-12 md:h-14 lg:h-16">
          <Link 
            to={ROUTES.home}
            className="text-lg sm:text-xl font-bold text-wave-orange hover:opacity-90 transition-opacity"
            aria-label="Wavealokam Homepage"
          >
            WAVEALOKAM
          </Link>

          {/* Desktop Navigation - single row */}
          <div className="hidden lg:flex items-center gap-2" ref={desktopDropdownRef}>
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                {item.children ? (
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      "text-foreground/70 hover:text-foreground hover:bg-muted/50",
                      openDropdown === item.label && "text-foreground bg-muted/50"
                    )}
                    aria-expanded={openDropdown === item.label}
                    aria-haspopup="true"
                  >
                    {item.label}
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      openDropdown === item.label && "rotate-180"
                    )} />
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    onClick={handleLinkClick}
                    className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                )}

                {/* Dropdown Menu */}
                {item.children && openDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-background border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 z-50">
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
                            className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            {child.label}
                          </a>
                        ) : (
                          <Link
                            key={child.label}
                            to={child.href}
                            onClick={handleLinkClick}
                            className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
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

            <Link
              to={ROUTES.contact}
              className="ml-2 px-5 py-2.5 bg-wave-orange text-white text-sm font-semibold rounded-full hover:bg-wave-orange/90 transition-all hover:scale-105 shadow-lg shadow-wave-orange/20"
            >
              Book / Contact
            </Link>
          </div>
        </div>

        {/* Row 2: Mobile/Tablet Navigation Links - wrapping */}
        <div className="lg:hidden pb-2 -mt-1" ref={mobileDropdownRef}>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                {item.children ? (
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    className={cn(
                      "flex items-center gap-0.5 px-2 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors",
                      "text-foreground/70 hover:text-foreground hover:bg-muted/50",
                      openDropdown === item.label && "text-foreground bg-muted/50"
                    )}
                    aria-expanded={openDropdown === item.label}
                  >
                    {item.label}
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      openDropdown === item.label && "rotate-180"
                    )} />
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    onClick={handleLinkClick}
                    className="px-2 py-1 text-[11px] sm:text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                  >
                    {item.label}
                  </Link>
                )}

                {/* Dropdown Menu for mobile */}
                {item.children && openDropdown === item.label && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-background border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 z-50">
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
                            className="block px-4 py-2 text-xs text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            {child.label}
                          </a>
                        ) : (
                          <Link
                            key={child.label}
                            to={child.href}
                            onClick={handleLinkClick}
                            className="block px-4 py-2 text-xs text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
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

            <Link
              to={ROUTES.contact}
              className="px-3 py-1 bg-wave-orange text-white text-[11px] sm:text-xs font-semibold rounded-full hover:bg-wave-orange/90 transition-colors"
            >
              Book
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNav;
