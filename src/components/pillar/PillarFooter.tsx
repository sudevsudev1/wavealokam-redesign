import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { ROUTES } from '@/lib/routes';

const pillarLinks = [
  { name: 'Stay', href: ROUTES.stay },
  { name: 'Surf + Stay', href: ROUTES.surfStay },
  { name: 'Workation', href: ROUTES.workation },
  { name: 'Long Stay', href: ROUTES.longStay },
  { name: 'Varkala Guide', href: ROUTES.guide },
  { name: 'Best Time to Visit', href: ROUTES.bestTime },
  { name: 'How to Reach', href: ROUTES.reach },
  { name: 'Contact', href: ROUTES.contact },
];

const PillarFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to={ROUTES.home} className="inline-block">
              <h2 className="text-3xl font-bold text-[hsl(var(--wave-orange))] mb-4">WAVEALOKAM</h2>
            </Link>
            <p className="text-background/70 mb-6 max-w-md">
              Your beachside surf retreat in Varkala, Kerala. Where "I'm just here for two days" is the most adorable lie we too had once said.
            </p>

            {/* Social Links */}
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/wavealokam/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[hsl(var(--wave-orange))] flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/wavealokam/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[hsl(var(--wave-orange))] flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Pillar Pages */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-[hsl(var(--wave-orange))]">Explore</h3>
            <ul className="space-y-2">
              {pillarLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-[hsl(var(--wave-orange))] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to={ROUTES.blog}
                  className="text-background/70 hover:text-[hsl(var(--wave-orange))] transition-colors"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-[hsl(var(--wave-orange))]">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[hsl(var(--wave-orange))] shrink-0 mt-0.5" />
                <span className="text-background/70">Wavealokam Beach Retreat, Sree Eight, Edava, Varkala, Kerala 695311</span>
              </li>
              <li>
                <a
                  href="tel:+919323858013"
                  className="flex items-center gap-3 text-background/70 hover:text-[hsl(var(--wave-orange))] transition-colors"
                >
                  <Phone className="w-5 h-5 text-[hsl(var(--wave-orange))]" />
                  +91 93238 58013
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@wavealokam.com"
                  className="flex items-center gap-3 text-background/70 hover:text-[hsl(var(--wave-orange))] transition-colors"
                >
                  <Mail className="w-5 h-5 text-[hsl(var(--wave-orange))]" />
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
            <Link to={ROUTES.home} className="text-background/50 hover:text-[hsl(var(--wave-orange))] transition-colors">
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

export default PillarFooter;
