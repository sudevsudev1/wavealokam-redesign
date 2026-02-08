import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const pillarLinks = [
    { name: 'Stay at Wavealokam', href: '/stay' },
    { name: 'Surf + Stay Packages', href: '/surf-stay' },
    { name: 'Workation in Varkala', href: '/workation' },
    { name: 'Long Stays', href: '/long-stay' },
    { name: 'Varkala Travel Guide', href: '/varkala-guide' },
    { name: 'Best Time to Visit', href: '/best-time-to-visit-varkala' },
    { name: 'How to Reach Varkala', href: '/how-to-reach-varkala' },
    { name: 'Contact Us', href: '/contact' },
  ];

  const sectionLinks = [
    { name: 'Home', href: '#hero' },
    { name: 'Activities', href: '#activities' },
    { name: 'Rooms', href: '#rooms' },
    { name: 'Surf School', href: '#surf-school' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Build Your Itinerary', href: '#itinerary' },
  ];

  const handleSectionClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="relative bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h2 className="text-3xl font-bold text-wave-orange mb-4">WAVEALOKAM</h2>
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
                <li key={link.href}>
                  <button
                    onClick={() => handleSectionClick(link.href)}
                    className="text-background/70 hover:text-wave-orange transition-colors text-left"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
              <li>
                <Link
                  to="/blog"
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
                  href="tel:+919323858013"
                  className="flex items-center gap-3 text-background/70 hover:text-wave-orange transition-colors"
                >
                  <Phone className="w-5 h-5 text-wave-orange" />
                  +91 93238 58013
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
            <a href="#" className="text-background/50 hover:text-wave-orange transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-background/50 hover:text-wave-orange transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
