import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h2 className="text-3xl font-bold text-wave-orange mb-4">WAVEALOKAM</h2>
            <p className="text-background/70 mb-6 max-w-md">
              Your beachside surf retreat in Varkala, Kerala. Where waves meet cliffs and adventures begin.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/wavealokam/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-wave-orange flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/wavealokam/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-wave-orange flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-wave-orange">Quick Links</h3>
            <ul className="space-y-2">
              {['Home', 'Activities', 'Rooms', 'Dining', 'Surf School', 'Book Now'].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(' ', '-')}`}
                    className="text-background/70 hover:text-wave-orange transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-wave-orange">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-wave-orange shrink-0 mt-0.5" />
                <span className="text-background/70">
                  Wavealokam, Sree Eight Beach Road, Varkala, Kerala 695141
                </span>
              </li>
              <li>
                <a
                  href="tel:+919539800445"
                  className="flex items-center gap-3 text-background/70 hover:text-wave-orange transition-colors"
                >
                  <Phone className="w-5 h-5 text-wave-orange" />
                  +91 95398 00445
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
          <p className="text-background/50 text-sm">
            © {currentYear} Wavealokam. All rights reserved.
          </p>
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
