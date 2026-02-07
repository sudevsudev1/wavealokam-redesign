import { MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CTAStripProps {
  pageSlug: string;
}

const CTAStrip = ({ pageSlug }: CTAStripProps) => {
  const whatsappNumber = '+919323858013';
  const phoneNumber = '+919323858013';
  
  const buildUTM = (ctaType: string) => {
    return `utm_source=pillar&utm_medium=organic&utm_campaign=${pageSlug}&utm_content=${ctaType}`;
  };

  const whatsappMessage = encodeURIComponent('Hi! I found you via the website and would love to know more about staying at Wavealokam.');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}&${buildUTM('whatsapp')}`;
  const phoneUrl = `tel:${phoneNumber}`;
  
  // OTA placeholder URLs with UTM
  const bookingUrl = `https://www.booking.com/hotel/in/wavealokam.html?${buildUTM('booking')}`;
  const airbnbUrl = `https://www.airbnb.com/rooms/wavealokam?${buildUTM('airbnb')}`;

  return (
    <section className="py-12 bg-gradient-to-r from-[hsl(var(--wave-orange))] to-[hsl(var(--wave-orange-light))]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* India CTAs */}
          <div className="text-center lg:text-left">
            <p className="text-white/90 text-sm font-medium mb-3 uppercase tracking-wide">
              📍 Calling from India?
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-white text-[hsl(var(--wave-orange))] hover:bg-white/90 font-semibold"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  WhatsApp Us
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 font-semibold"
              >
                <a href={phoneUrl}>
                  <Phone className="w-5 h-5 mr-2" />
                  Call Now
                </a>
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-16 bg-white/30" />

          {/* International CTAs */}
          <div className="text-center lg:text-right">
            <p className="text-white/90 text-sm font-medium mb-3 uppercase tracking-wide">
              🌍 International Guest?
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
              <Button
                asChild
                size="lg"
                className="bg-white text-[hsl(var(--wave-orange))] hover:bg-white/90 font-semibold"
              >
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Book on Booking.com
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 font-semibold"
              >
                <a href={airbnbUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Book on Airbnb
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTAStrip;
