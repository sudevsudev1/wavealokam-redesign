import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MapPin, Waves, Coffee, Sun, Calendar, ArrowRight } from 'lucide-react';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import TrustBlock from '@/components/pillar/TrustBlock';
import CTAStrip from '@/components/pillar/CTAStrip';
import PillarFAQ from '@/components/pillar/PillarFAQ';
import PillarFooter from '@/components/pillar/PillarFooter';

const VarkalaGuide = () => {
  const hubLinks = [
    { name: 'Best Time to Visit Varkala', href: '/best-time-to-visit-varkala', desc: 'Month-by-month breakdown' },
    { name: 'How to Reach Varkala', href: '/how-to-reach-varkala', desc: 'Flights, trains, and road trips' },
    { name: 'Stay at Wavealokam', href: '/stay', desc: 'Our boutique beach retreat' },
    { name: 'Surf + Stay Packages', href: '/surf-stay', desc: 'Learn to surf while you stay' },
  ];

  const areas = [
    { name: 'Varkala Cliff (North)', desc: 'The famous stretch. Cafes, shops, sunset views. Tourist central but worth seeing.' },
    { name: 'Edava / Sree Eight Beach', desc: 'Where we are. Quieter, locals-focused, proper beach vibes without the crowds.' },
    { name: 'Kappil / Backwaters', desc: 'Where the lake meets the sea. Kayaking, boat rides, and that one Instagram spot.' },
  ];

  const thingsToDo = [
    'Surf lessons at Edava Beach',
    'Cliff walk at sunset (obvious but mandatory)',
    'Backwater kayaking at Kappil',
    'Temple visit at Janardhana Swamy',
    'Yoga at any of the 47 shala options',
    'Toddy shop experience (careful, it hits)',
    'Day trip to Kovalam or Trivandrum',
  ];

  const foodVibe = [
    'Cliff cafes: Israeli, Italian, healthy bowls, tourist prices',
    'Edava local spots: Kerala meals, fish fry, reasonable rates',
    'Beach shacks: Fresh seafood, cold beer, sandy toes',
    'Our rooftop: BYOB dinners with ocean views',
  ];

  const itinerary2Days = [
    { day: 'Day 1', activities: 'Arrive, settle in, beach walk, cliff sunset, dinner with a view' },
    { day: 'Day 2', activities: 'Morning surf lesson, big breakfast, backwater trip, Varkala North Cliff night or chill at Wavealokam\'s romantic rooftop.' },
  ];

  const itinerary4Days = [
    { day: 'Day 1', activities: 'Arrive, beach time, cliff exploration, sunset ritual begins' },
    { day: 'Day 2', activities: 'Surf lesson morning, temple visit afternoon, rooftop dinner' },
    { day: 'Day 3', activities: 'Backwater adventure (kayak or boat), local lunch, yoga session' },
    { day: 'Day 4', activities: 'Sleep in, last surf session, cliff cafe lunch, reluctant departure' },
  ];

  const faqs = [
    {
      question: 'Is Varkala safe for solo travelers?',
      answer: 'Yes. Varkala is well-touristed and generally safe. Standard precautions apply: don\'t flash valuables, swim where lifeguards recommend, and trust your instincts. Solo women travelers are common and comfortable here.',
    },
    {
      question: 'How do I get around Varkala?',
      answer: 'Scooter rental is popular and easy. Auto-rickshaws are everywhere. Taxis for longer trips. Walking works for the cliff area. We can help arrange transport.',
    },
    {
      question: 'What about the monsoon season?',
      answer: 'June to August is monsoon. Dramatic rains, fewer tourists, bigger waves (for experienced surfers only). Some cafes close. If you like cozy rainy vibes, it\'s actually quite beautiful.',
    },
    {
      question: 'Is it suitable for families with kids?',
      answer: 'Depends on the kids. The beach has currents, so constant supervision needed. The cliff has steep stairs. But families do come and enjoy it, especially with older children.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Varkala Travel Guide | Complete Kerala Beach Destination Guide | Wavealokam</title>
        <meta name="description" content="Your complete Varkala travel guide by Wavealokam. Best areas, things to do, food spots, and sample itineraries. Everything you need to plan your Kerala beach trip." />
      </Helmet>

      <PillarNav />
      
      <main className="pt-16">
        <PillarHero
          title="Varkala Travel Guide (Wavealokam Edition)"
          subtitle="Everything you need to know about Kerala's favorite cliff-top beach town. Written by people who actually live here."
        />

        {/* Hub Links */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Quick Links
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {hubLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="group flex flex-col p-6 bg-muted/20 rounded-2xl border border-border hover:border-primary hover:shadow-md transition-all"
                >
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                    {link.name}
                  </span>
                  <span className="text-sm text-muted-foreground mb-4">{link.desc}</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all mt-auto" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Areas Overview */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Areas of Varkala
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {areas.map((area, index) => (
                <div key={index} className="p-6 bg-background rounded-2xl border border-border">
                  <MapPin className="w-8 h-8 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">{area.name}</h3>
                  <p className="text-muted-foreground">{area.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Things to Do */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Top Things to Do
            </h2>
            <div className="max-w-2xl mx-auto">
              <ul className="grid md:grid-cols-2 gap-4">
                {thingsToDo.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 p-4 bg-muted/20 rounded-xl">
                    <Waves className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Food & Cafe Vibe */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Food & Cafe Scene
            </h2>
            <div className="max-w-2xl mx-auto">
              <ul className="space-y-4">
                {foodVibe.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border">
                    <Coffee className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Sample Itineraries */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Sample Itineraries
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* 2 Days */}
              <div className="p-6 bg-muted/20 rounded-2xl border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">2 Days</h3>
                </div>
                {itinerary2Days.map((item, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <span className="font-semibold text-primary">{item.day}</span>
                    <p className="text-foreground/80 mt-1">{item.activities}</p>
                  </div>
                ))}
              </div>

              {/* 4 Days */}
              <div className="p-6 bg-muted/20 rounded-2xl border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <Sun className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">4 Days</h3>
                </div>
                {itinerary4Days.map((item, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <span className="font-semibold text-primary">{item.day}</span>
                    <p className="text-foreground/80 mt-1">{item.activities}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CTAStrip pageSlug="varkala-guide" />
        <TrustBlock />
        <PillarFAQ faqs={faqs} />
      </main>

      <PillarFooter />
    </>
  );
};

export default VarkalaGuide;
