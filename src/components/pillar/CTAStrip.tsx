import { MessageCircle, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CTAStripProps {
  pageSlug: string;
}

interface OTA {
  name: string;
  rating: number;
  url: string;
}

const otas: OTA[] = [
  {
    name: "Google",
    rating: 4.9,
    url: "https://www.google.com/travel/search?q=wavealokam",
  },
  {
    name: "Booking.com",
    rating: 4.8,
    url: "https://www.booking.com/hotel/in/wavealokam.en-gb.html",
  },
  {
    name: "Agoda",
    rating: 4.9,
    url: "https://www.agoda.com/en-in/wavealokam/hotel/varkala-in.html",
  },
  {
    name: "MakeMyTrip",
    rating: 4.7,
    url: "https://www.makemytrip.com/hotels/wavealokam_beach_retreat-details-varkala.html",
  },
  {
    name: "Trip Advisor",
    rating: 5,
    url: "https://www.tripadvisor.in/Hotel_Review-g11864386-d32677942-Reviews-Wavealokam_Beach_Retreat-Edava_Varkala_Thiruvananthapuram_District_Kerala.html",
  },
];

const StarRating = ({ rating }: { rating: number }) => {
  const getFillWidth = (starIndex: number) => {
    if (starIndex < 4) return '100%';
    return rating === 5 ? '100%' : '90%';
  };

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="relative w-3 h-3">
          <Star className="absolute w-3 h-3 text-white/30" />
          <div className="absolute overflow-hidden" style={{ width: getFillWidth(i) }}>
            <Star className="w-3 h-3 text-white fill-white" />
          </div>
        </div>
      ))}
      <span className="ml-1 text-xs text-white/80">{rating}/5</span>
    </div>
  );
};

const CTAStrip = ({ pageSlug }: CTAStripProps) => {
  const whatsappNumber = '+919323858013';
  const phoneNumber = '+919323858013';
  
  const buildUTM = (ctaType: string) => {
    return `utm_source=pillar&utm_medium=organic&utm_campaign=${pageSlug}&utm_content=${ctaType}`;
  };

  const whatsappMessage = encodeURIComponent('Hi! I found you via the website and would love to know more about staying at Wavealokam.');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}&${buildUTM('whatsapp')}`;
  const phoneUrl = `tel:${phoneNumber}`;

  return (
    <section className="py-12 bg-gradient-to-r from-[hsl(var(--wave-orange))] to-[hsl(var(--wave-orange-light))]">
      <div className="container mx-auto px-6">
        <h3 className="text-white text-center text-xl font-semibold mb-6">
          Ready to Book?
        </h3>
        
        {/* WhatsApp & Call Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
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
            className="bg-[hsl(var(--wave-orange))] text-white border-2 border-white hover:bg-white hover:text-[hsl(var(--wave-orange))] font-semibold transition-colors"
          >
            <a href={phoneUrl}>
              <Phone className="w-5 h-5 mr-2" />
              Call Now
            </a>
          </Button>
        </div>

        {/* OTA Buttons with Ratings */}
        <p className="text-white/80 text-center text-sm mb-4">Or book via your preferred platform:</p>
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {otas.map((ota) => (
            <a
              key={ota.name}
              href={`${ota.url}?${buildUTM(ota.name.toLowerCase().replace(/\s+/g, '-'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl backdrop-blur-sm border bg-white/10 border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            >
              <span className="text-sm md:text-base font-semibold text-white">
                {ota.name}
              </span>
              <StarRating rating={ota.rating} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CTAStrip;
