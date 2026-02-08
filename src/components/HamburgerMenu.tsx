import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import { HOME_SECTIONS } from '@/lib/homeSections';

interface MenuItem {
  label: string;
  href: string;
  isRoute?: boolean; // true = use React Router, false = homepage section scroll
}

const menuItems: MenuItem[] = [
  { label: 'Home', href: ROUTES.home, isRoute: true },
  { label: 'Stay', href: ROUTES.stay, isRoute: true },
  { label: 'Surf + Stay', href: ROUTES.surfStay, isRoute: true },
  { label: 'Workation', href: ROUTES.workation, isRoute: true },
  { label: 'Long Stay', href: ROUTES.longStay, isRoute: true },
  { label: 'Activities', href: HOME_SECTIONS.activities, isRoute: false },
  { label: 'Rooms', href: HOME_SECTIONS.rooms, isRoute: false },
  { label: 'Surf School', href: HOME_SECTIONS.surfSchool, isRoute: false },
  { label: 'Gallery', href: HOME_SECTIONS.gallery, isRoute: false },
  { label: 'Origin Story', href: HOME_SECTIONS.originStory, isRoute: false },
  { label: 'FAQ', href: HOME_SECTIONS.faq, isRoute: false },
  { label: 'Book Now', href: HOME_SECTIONS.itinerary, isRoute: false },
  { label: 'How to Kerala', href: ROUTES.blog, isRoute: true },
];

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleNavClick = (item: MenuItem) => {
    setIsOpen(false);
    
    if (item.isRoute) {
      // Use React Router for page navigation
      navigate(item.href);
    } else {
      // Homepage section navigation
      if (location.pathname === '/') {
        // Already on homepage, extract hash from href (e.g., "/#rooms" -> "#rooms")
        const hash = item.href.replace('/', '');
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Navigate to homepage with hash using native navigation
        window.location.href = item.href;
      }
    }
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 right-6 z-[100] w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Full Screen Menu Overlay */}
      <div
        className={`fixed inset-0 z-[90] bg-wave-orange transition-all duration-500 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="h-full flex flex-col items-center justify-center">
          <nav className="space-y-6">
            {menuItems.map((item, index) => (
              <button
                key={item.href + item.label}
                onClick={() => handleNavClick(item)}
                className="block text-4xl md:text-6xl text-display text-white hover:text-white/70 transition-all duration-300 transform hover:translate-x-4"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.4s ease-out ${index * 0.1}s`,
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default HamburgerMenu;
