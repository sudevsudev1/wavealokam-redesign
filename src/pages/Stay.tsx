import { Helmet } from 'react-helmet-async';
import { Wifi, Coffee, Waves, Users, Heart, MapPin, Bed, Wind } from 'lucide-react';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import TrustBlock from '@/components/pillar/TrustBlock';
import CTAStrip from '@/components/pillar/CTAStrip';
import PillarFAQ from '@/components/pillar/PillarFAQ';
import InternalLinks from '@/components/pillar/InternalLinks';
import PillarFooter from '@/components/pillar/PillarFooter';

const Stay = () => {
  const roomTypes = [
    {
      name: 'King Room with Balcony',
      size: '45 m²',
      features: ['King-size bed', 'Private balcony', 'Ocean sounds', 'Mini fridge', 'Smart TV'],
      ideal: 'Couples, honeymooners',
    },
    {
      name: 'Double Room with Balcony',
      size: '28 m²',
      features: ['Double bed', 'Private balcony', 'Ocean sounds', 'Mini fridge', 'Smart TV'],
      ideal: 'Solo travelers, friends',
    },
  ];

  const included = [
    { icon: Wifi, text: 'Fast WiFi throughout' },
    { icon: Coffee, text: 'Tea/coffee in room' },
    { icon: Waves, text: '180m to private beach' },
    { icon: Wind, text: 'Daily housekeeping (on request)' },
    { icon: Bed, text: 'Premium bedding' },
  ];

  const idealFor = [
    { icon: Heart, title: 'Couples', desc: 'Romantic getaways with sunset views' },
    { icon: Users, title: 'Friends', desc: 'Beach trips without the crowds' },
    { icon: MapPin, title: 'Solo Travelers', desc: 'Peace, reflection, and new connections' },
  ];

  const nearbyHighlights = [
    'Varkala Cliff – 10 mins drive',
    'Private Edava Beach – 2 min walk',
    'Cafes & restaurants at North Cliff – 15 mins',
    'Papanasam Beach – 12 mins',
    'Backwater kayaking spots – 20 mins',
  ];

  const faqs = [
    {
      question: 'What are the check-in and check-out times?',
      answer: 'Check-in is from 2 PM, check-out by 11 AM. Early check-in or late check-out? Just ask. We\'re flexible when rooms allow.',
    },
    {
      question: 'Is breakfast included?',
      answer: 'Depends on your booking. Some rates include Lekha Chechi\'s legendary Kerala breakfast. If yours doesn\'t, you can add it for ₹350/person. Trust us, it\'s worth it.',
    },
    {
      question: 'How reliable is the WiFi?',
      answer: 'Solid enough for video calls and Netflix. We have fiber with a backup connection. Perfect for workations, adequate for posting that sunset shot.',
    },
    {
      question: 'Is parking available?',
      answer: 'Yes, free on-site parking. Your car will enjoy the beach vibes too.',
    },
    {
      question: 'Is the property accessible?',
      answer: 'Ground floor rooms available. Some areas have steps. Contact us before booking if you have specific accessibility needs and we\'ll give you the honest details.',
    },
  ];

  const internalLinks = [
    { name: 'Surf + Stay Packages', href: '/surf-stay', description: 'Add surfing to your stay' },
    { name: 'Workation', href: '/workation', description: 'Work remotely from paradise' },
    { name: 'Long Stay Discounts', href: '/long-stay', description: 'Weekly & monthly rates' },
  ];

  return (
    <>
      <Helmet>
        <title>Stay at Wavealokam Varkala | Boutique Beach Retreat in Kerala</title>
        <meta name="description" content="Book your stay at Wavealokam, a peaceful boutique beach retreat in Edava, Varkala. Private beach access, surf lessons, and authentic Kerala hospitality. Perfect for couples, friends & solo travelers." />
      </Helmet>

      <PillarNav />
      
      <main className="pt-16">
        <PillarHero
          title="Stay at Wavealokam in Varkala"
          subtitle="A peaceful boutique retreat where the beach is private, the vibes are chill, and two-day trips turn into week-long stays."
        />

        {/* Room Types */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              Our Rooms
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Boutique rooms designed for rest. Not luxury theater, just genuine comfort.
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {roomTypes.map((room, index) => (
                <div key={index} className="bg-muted/20 rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-muted rounded-xl mb-4 flex items-center justify-center text-muted-foreground">
                    [Room Image Placeholder]
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{room.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{room.size} • Ideal for {room.ideal}</p>
                  <ul className="space-y-2">
                    {room.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              What's Included
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-4xl mx-auto">
              {included.map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center p-4">
                  <item.icon className="w-10 h-10 text-primary mb-3" />
                  <span className="text-sm text-foreground/80">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Who It's For
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {idealFor.map((item, index) => (
                <div key={index} className="text-center p-6 bg-muted/20 rounded-2xl">
                  <item.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nearby Highlights */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-8">
              What's Nearby
            </h2>
            <ul className="max-w-lg mx-auto space-y-3">
              {nearbyHighlights.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-foreground/80">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CTAStrip pageSlug="stay" />
        <TrustBlock />
        <PillarFAQ faqs={faqs} />
        <InternalLinks links={internalLinks} />
      </main>

      <PillarFooter />
    </>
  );
};

export default Stay;
