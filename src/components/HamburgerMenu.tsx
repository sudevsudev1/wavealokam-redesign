import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
}

const menuItems: MenuItem[] = [
  { label: 'Home', href: '#hero' },
  { label: 'Activities', href: '#activities' },
  { label: 'Rooms', href: '#rooms' },
  { label: 'Dining', href: '#dining' },
  { label: 'Surf School', href: '#surf-school' },
  { label: 'Book Now', href: '#itinerary' },
];

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className="block text-5xl md:text-7xl text-display text-white hover:text-white/70 transition-all duration-300 transform hover:translate-x-4"
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
