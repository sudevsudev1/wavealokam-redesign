import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { MessageCircle, Phone, MapPin, Mail, Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import { contactHeroImages } from '@/data/pillarHeroImages';
import TrustBlock from '@/components/pillar/TrustBlock';
import PillarFAQ from '@/components/pillar/PillarFAQ';
import InternalLinks from '@/components/pillar/InternalLinks';
import PillarFooter from '@/components/pillar/PillarFooter';
import { useToast } from '@/hooks/use-toast';

interface OTA {
  name: string;
  rating: number;
  url: string;
}

const otas: OTA[] = [
  { name: "Google", rating: 4.9, url: "https://www.google.com/travel/search?q=wavealokam" },
  { name: "Booking.com", rating: 4.8, url: "https://www.booking.com/hotel/in/wavealokam.en-gb.html" },
  { name: "Agoda", rating: 4.9, url: "https://www.agoda.com/en-in/wavealokam/hotel/varkala-in.html" },
  { name: "MakeMyTrip", rating: 4.7, url: "https://www.makemytrip.com/hotels/wavealokam_beach_retreat-details-varkala.html" },
  { name: "Trip Advisor", rating: 5, url: "https://www.tripadvisor.in/Hotel_Review-g11864386-d32677942-Reviews-Wavealokam_Beach_Retreat-Edava_Varkala_Thiruvananthapuram_District_Kerala.html" },
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
          <Star className="absolute w-3 h-3 text-wave-orange/30" />
          <div className="absolute overflow-hidden" style={{ width: getFillWidth(i) }}>
            <Star className="w-3 h-3 text-wave-orange fill-wave-orange" />
          </div>
        </div>
      ))}
      <span className="ml-1 text-xs text-foreground/80">{rating}/5</span>
    </div>
  );
};

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dates: '',
    guests: '',
    country: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Message sent!',
      description: 'We\'ll get back to you within 24 hours. Usually faster.',
    });
    
    setFormData({ name: '', email: '', dates: '', guests: '', country: '', message: '' });
    setIsSubmitting(false);
  };

  const buildUTM = (ctaType: string) => {
    return `utm_source=pillar&utm_medium=organic&utm_campaign=contact&utm_content=${ctaType}`;
  };

  const whatsappNumber = '+919323858013';
  const whatsappMessage = encodeURIComponent('Hi! I found you on the website and wanted to inquire about booking.');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}&${buildUTM('whatsapp')}`;
  const phoneUrl = 'tel:+919323858013';

  const faqs = [
    {
      question: 'How quickly do you respond?',
      answer: 'WhatsApp: Usually within an hour during waking hours (8 AM - 10 PM IST). Email: Within 24 hours. We\'re humans, not bots, so occasionally we\'re surfing.',
    },
    {
      question: 'What\'s the booking process?',
      answer: 'Quick chat on WhatsApp or phone to confirm dates and room type. Then book through our OTA links (Booking.com, Airbnb) or pay directly. We\'ll send you all the details you need.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'UPI, bank transfer for direct bookings. International cards work through OTAs. Cash accepted for on-site extras. No crypto yet, sorry.',
    },
    {
      question: 'Do I need to pay a deposit?',
      answer: 'For peak season (Dec-Jan) and long stays, we may request a small advance. Otherwise, OTA booking secures your spot. We\'re flexible with reasonable people.',
    },
    {
      question: 'Can you help arrange airport transfers?',
      answer: 'Absolutely. Just let us know your flight details and we\'ll arrange a trusted driver at cost price. No markup, just coordination.',
    },
  ];

  const internalLinks = [
    { name: 'Stay', href: '/stay', description: 'Room types & amenities' },
    { name: 'Surf + Stay', href: '/surf-stay', description: 'Learn to surf packages' },
    { name: 'Varkala Guide', href: '/varkala-guide', description: 'Plan your trip' },
  ];

  return (
    <>
      <Helmet>
        <title>Contact Wavealokam | Book Your Stay in Varkala Kerala</title>
        <meta name="description" content="Contact Wavealokam beach retreat in Varkala. WhatsApp, call, or fill out our form. We respond fast and help plan your Kerala beach holiday." />
      </Helmet>

      <PillarNav />
      
      <main className="pt-16">
        <PillarHero
          title="Contact Wavealokam"
          subtitle="Questions? Booking inquiries? Just want to say hi? We're here."
          heroImages={contactHeroImages}
        />

        {/* Quick Contact Options */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-8">
              Reach Out
            </h2>
            
            {/* WhatsApp & Call Buttons */}
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  WhatsApp Us
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <a href={phoneUrl}>
                  <Phone className="w-5 h-5 mr-2" />
                  Call: +91 93238 58013
                </a>
              </Button>
            </div>

            {/* OTA Buttons with Ratings */}
            <p className="text-muted-foreground text-center text-sm mb-4">Or book via your preferred platform:</p>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-12">
              {otas.map((ota) => (
                <a
                  key={ota.name}
                  href={`${ota.url}?${buildUTM(ota.name.toLowerCase().replace(/\s+/g, '-'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl backdrop-blur-sm border bg-wave-orange/10 border-wave-orange/30 hover:bg-wave-orange/20 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                >
                  <span className="text-sm md:text-base font-semibold text-foreground">
                    {ota.name}
                  </span>
                  <StarRating rating={ota.rating} />
                </a>
              ))}
            </div>

            {/* Address & Map */}
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-muted/20 rounded-2xl">
                <div className="flex items-start gap-4 mb-6">
                  <MapPin className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <h3 className="font-bold text-foreground mb-2">Address</h3>
                    <p className="text-muted-foreground">
                      Wavealokam Beach Retreat<br />
                      Sree Eight, Edava<br />
                      Varkala, Kerala 695311<br />
                      India
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <h3 className="font-bold text-foreground mb-2">Email</h3>
                    <a href="mailto:info@wavealokam.com" className="text-primary hover:underline">
                      info@wavealokam.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Google Map Embed */}
              <div className="rounded-2xl overflow-hidden min-h-[200px] border border-border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3945.8076!2d76.6897!3d8.7334!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b05ef46cdef53e3%3A0x51d30e3f8f7a4fb9!2sWavealokam%20Beach%20Retreat!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Wavealokam Beach Retreat Location"
                  className="w-full h-full min-h-[200px]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              Send Us a Message
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              Fill this out and we'll get back to you. Or just WhatsApp us if you want instant gratification.
            </p>

            <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dates">Preferred Dates</Label>
                  <Input
                    id="dates"
                    value={formData.dates}
                    onChange={(e) => setFormData({ ...formData, dates: e.target.value })}
                    placeholder="e.g., Jan 15-20"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="guests">Number of Guests</Label>
                  <Input
                    id="guests"
                    value={formData.guests}
                    onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                    placeholder="e.g., 2 adults"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Where are you from?"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your trip plans, questions, or just say hi..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </section>

        <TrustBlock />
        <PillarFAQ faqs={faqs} />
        <InternalLinks links={internalLinks} />
      </main>

      <PillarFooter />
    </>
  );
};

export default Contact;
