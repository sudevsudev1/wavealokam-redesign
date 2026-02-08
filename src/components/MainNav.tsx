import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

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
    setIsMobileOpen(false);
  };

  const handleLinkClick = () => {
    setOpenDropdown(null);
    setIsMobileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to={ROUTES.home}
            className="text-xl font-bold text-wave-orange hover:opacity-90 transition-opacity"
            aria-label="Wavealokam Homepage"
          >
            WAVEALOKAM
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                {item.children ? (
                  // Dropdown trigger
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    onMouseEnter={() => setOpenDropdown(item.label)}
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      "text-foreground/70 hover:text-foreground hover:bg-muted/50",
                      openDropdown === item.label && "text-foreground bg-muted/50"
                    )}
                    aria-expanded={openDropdown === item.label}
                    aria-haspopup="true"
                    aria-label={`${item.label} menu`}
                  >
                    {item.label}
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      openDropdown === item.label && "rotate-180"
                    )} />
                  </button>
                ) : (
                  // Regular link - use React Router Link
                  <Link
                    to={item.href}
                    onClick={handleLinkClick}
                    className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    aria-label={`Navigate to ${item.label}`}
                  >
                    {item.label}
                  </Link>
                )}

                {/* Dropdown Menu */}
                {item.children && openDropdown === item.label && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-56 bg-background border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <div className="py-2">
                      {item.children.map((child) => (
                        child.isHomepageSection ? (
                          // Homepage section link - use native anchor
                          <a
                            key={child.label}
                            href={child.href}
                            onClick={(e) => {
                              e.preventDefault();
                              handleHomepageSectionClick(child.href);
                            }}
                            className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                            aria-label={child.label}
                          >
                            {child.label}
                          </a>
                        ) : (
                          // Regular route - use React Router Link
                          <Link
                            key={child.label}
                            to={child.href}
                            onClick={handleLinkClick}
                            className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
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
          </div>

          {/* CTA Button - Desktop */}
          <div className="hidden lg:block">
            <Link
              to={ROUTES.contact}
              className="px-5 py-2.5 bg-wave-orange text-white text-sm font-semibold rounded-full hover:bg-wave-orange/90 transition-all hover:scale-105 shadow-lg shadow-wave-orange/20"
              aria-label="Contact Wavealokam to book"
            >
              Book / Contact
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="lg:hidden p-2 text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <div key={item.label}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                        className="flex items-center justify-between w-full px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                        aria-expanded={openDropdown === item.label}
                      >
                        <span className="font-medium">{item.label}</span>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          openDropdown === item.label && "rotate-180"
                        )} />
                      </button>
                      {openDropdown === item.label && (
                        <div className="ml-4 pl-4 border-l-2 border-wave-orange/30 space-y-1 py-2">
                          {item.children.map((child) => (
                            child.isHomepageSection ? (
                              <a
                                key={child.label}
                                href={child.href}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleHomepageSectionClick(child.href);
                                }}
                                className="block px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground transition-colors"
                              >
                                {child.label}
                              </a>
                            ) : (
                              <Link
                                key={child.label}
                                to={child.href}
                                onClick={handleLinkClick}
                                className="block px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground transition-colors"
                              >
                                {child.label}
                              </Link>
                            )
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={handleLinkClick}
                      className="block px-4 py-3 font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              
              {/* Mobile CTA */}
              <Link
                to={ROUTES.contact}
                onClick={handleLinkClick}
                className="mt-4 mx-4 py-3 bg-wave-orange text-white text-center font-semibold rounded-xl hover:bg-wave-orange/90 transition-colors"
              >
                Book / Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default MainNav;
