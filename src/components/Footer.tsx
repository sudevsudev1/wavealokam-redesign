import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { HOME_SECTIONS } from "@/lib/homeSections";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  const pillarLinks = [
    { name: 'Stay at Wavealokam', href: ROUTES.stay },
    { name: 'Surf + Stay Packages', href: ROUTES.surfStay },
    { name: 'Workation in Varkala', href: ROUTES.workation },
    { name: 'Long Stays', href: ROUTES.longStay },
    { name: 'Varkala Travel Guide', href: ROUTES.guide },
    { name: 'Best Time to Visit', href: ROUTES.bestTime },
    { name: 'How to Reach Varkala', href: ROUTES.reach },
    { name: 'Contact Us', href: ROUTES.contact },
  ];

  const sectionLinks = [
    { name: 'Home', href: HOME_SECTIONS.hero, isSection: true },
    { name: 'Activities', href: HOME_SECTIONS.activities, isSection: true },
    { name: 'Rooms', href: ROUTES.stay, isSection: false },
    { name: 'Surf School', href: ROUTES.surfStay, isSection: false },
    { name: 'Gallery', href: HOME_SECTIONS.gallery, isSection: true },
    { name: 'Book Now', href: ROUTES.stay, isSection: false },
  ];

  const handleSectionClick = (href: string) => {
    if (location.pathname === '/') {
      // Already on homepage, extract hash and scroll
      const hash = href.replace('/', '');
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to homepage with hash using native navigation
      window.location.href = href;
    }
  };

  return (
    <footer className="relative bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Link to={ROUTES.home}>
              <h2 className="text-3xl font-bold text-wave-orange mb-4 hover:opacity-90 transition-opacity">WAVEALOKAM</h2>
            </Link>
            <p className="text-background/70 mb-6 max-w-md">You can walk barefoot here. Emotionally and literally.</p>

            {/* Social Links */}
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/wavealokam/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-wave-orange flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Follow Wavealokam on Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/wavealokam/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-wave-orange flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Follow Wavealokam on Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Pillar Pages - SEO Backbone */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-wave-orange">Explore Wavealokam</h3>
            <ul className="space-y-2">
              {pillarLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-wave-orange transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Section Links */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-wave-orange">Quick Links</h3>
            <ul className="space-y-2">
              {sectionLinks.map((link) => (
                <li key={link.href + link.name}>
                  {link.isSection ? (
                    <button
                      onClick={() => handleSectionClick(link.href)}
                      className="text-background/70 hover:text-wave-orange transition-colors text-left"
                    >
                      {link.name}
                    </button>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-background/70 hover:text-wave-orange transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link
                  to={ROUTES.blog}
                  className="text-background/70 hover:text-wave-orange transition-colors"
                >
                  How to Kerala
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-wave-orange">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-wave-orange shrink-0 mt-0.5" />
                <span className="text-background/70">Wavealokam, Sree Eight Beach Road, Varkala, Kerala 695141</span>
              </li>
              <li>
                <a
                  href="tel:+918606164606"
                  className="flex items-center gap-3 text-background/70 hover:text-wave-orange transition-colors"
                >
                  <Phone className="w-5 h-5 text-wave-orange" />
                  +91 86061 64606
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@wavealokam.com"
                  className="flex items-center gap-3 text-background/70 hover:text-wave-orange transition-colors"
                >
                  <Mail className="w-5 h-5 text-wave-orange" />
                  info@wavealokam.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/50 text-sm">© {currentYear} Wavealokam. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link to={ROUTES.home} className="text-background/50 hover:text-wave-orange transition-colors">
              Home
            </Link>
            <span className="text-background/50">Privacy Policy</span>
            <span className="text-background/50">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
