import { Helmet } from 'react-helmet-async';
import { Calendar, Wallet, Home, Coffee, Shirt, MapPin, Heart } from 'lucide-react';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import TrustBlock from '@/components/pillar/TrustBlock';
import CTAStrip from '@/components/pillar/CTAStrip';
import PillarFAQ from '@/components/pillar/PillarFAQ';
import InternalLinks from '@/components/pillar/InternalLinks';
import PillarFooter from '@/components/pillar/PillarFooter';

const LongStay = () => {
  const idealFor = [
    { icon: Home, title: 'Remote Workers', desc: 'Work from paradise for weeks, not days. WiFi works, distractions don\'t.' },
    { icon: Heart, title: 'Writers & Creatives', desc: 'Ocean views, quiet mornings, and zero urgency. Let the muse find you.' },
    { icon: Calendar, title: 'Slow Travelers', desc: 'Skip the checklist tourism. Stay somewhere long enough to feel at home.' },
    { icon: Wallet, title: 'Recovery & Wellness', desc: 'Post-burnout resets, yoga retreats, or just... existing peacefully.' },
  ];

  const weeklyRhythm = [
    { day: 'Monday', activity: 'Fresh start. Morning surf, focused work, sunset walk.' },
    { day: 'Tuesday-Thursday', activity: 'Build routines. Work blocks, beach breaks, explore cafes.' },
    { day: 'Friday', activity: 'Wind down. Lighter schedule, maybe try the backwaters.' },
    { day: 'Weekend', activity: 'Day trips to Kovalam, Trivandrum, or just hammock time.' },
  ];

  const practicalities = [
    { icon: Shirt, title: 'Laundry', desc: 'On-site laundry service. Next-day return, per-piece pricing.' },
    { icon: Coffee, title: 'Food Options', desc: 'Breakfast included options available. Local restaurants nearby. Kitchen access can be arranged for long stays.' },
    { icon: MapPin, title: 'Groceries', desc: 'Small shops in Edava village. Bigger stores at main Varkala, 10 mins away.' },
  ];

  const faqs = [
    {
      question: 'Do you offer long-stay discounts?',
      answer: 'Yes. The longer you stay, the better it gets. We don\'t publish fixed rates because it depends on room type, season, and duration. Contact us for custom quotes. We\'re generous with people who commit.',
    },
    {
      question: 'How often is housekeeping?',
      answer: 'Weekly deep clean included for long stays. Daily refresh available on request. We won\'t hover, but we won\'t let things get weird either.',
    },
    {
      question: 'Can I get meals included?',
      answer: 'Breakfast packages available. For lunch/dinner, we can connect you with local home-cooked meal options or you can explore the many restaurants nearby.',
    },
    {
      question: 'Is there a security deposit?',
      answer: 'For stays over 2 weeks, we may request a small refundable deposit. Nothing outrageous, just enough to cover any damages to the furniture from your interpretive dance sessions.',
    },
    {
      question: 'Can I book a month and leave early if needed?',
      answer: 'We\'re flexible with reasonable notice. Life happens. Just communicate with us and we\'ll figure it out together.',
    },
    {
      question: 'What\'s the longest someone has stayed?',
      answer: 'Multiple months. Some guests came for a week and stayed the whole season. We don\'t ask questions, we just make sure the WiFi keeps working.',
    },
  ];

  const internalLinks = [
    { name: 'Workation Guide', href: '/workation', description: 'Work remotely from here' },
    { name: 'Surf + Stay', href: '/surf-stay', description: 'Add surfing to your stay' },
    { name: 'Best Time to Visit', href: '/best-time-to-visit-varkala', description: 'Plan your season' },
  ];

  return (
    <>
      <Helmet>
        <title>Long Stay in Varkala | Weekly & Monthly Rates | Wavealokam Kerala</title>
        <meta name="description" content="Long stays at Wavealokam, Varkala. Weekly and monthly rates for remote workers, writers, and slow travelers. Peaceful beach setting in Kerala with all amenities." />
      </Helmet>

      <PillarNav />
      
      <main className="pt-16">
        <PillarHero
          title="Long Stays in Varkala (Weekly & Monthly)"
          subtitle="Some places you visit. Some places you stay. This one has a way of keeping people longer than planned."
        />

        {/* Who It's For */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Who Long Stay Is For
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {idealFor.map((item, index) => (
                <div key={index} className="p-6 bg-muted/20 rounded-2xl border border-border text-center">
                  <item.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Weekly Rhythm */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              A Suggested Weekly Rhythm
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Structure helps. But you're an adult. Do whatever you want.
            </p>
            <div className="max-w-2xl mx-auto">
              {weeklyRhythm.map((item, index) => (
                <div key={index} className="flex gap-4 mb-4 pb-4 border-b border-border last:border-0">
                  <span className="text-primary font-semibold w-32 shrink-0">{item.day}</span>
                  <span className="text-foreground/80">{item.activity}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Practicalities */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              The Practical Stuff
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {practicalities.map((item, index) => (
                <div key={index} className="p-6 bg-muted/20 rounded-2xl text-center">
                  <item.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Long Stay Rates
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Rates depend on room type, season, and duration. We don't do cookie-cutter pricing because every stay is different. Contact us for a personalized quote.
            </p>
            <div className="inline-block p-6 bg-background rounded-2xl border-2 border-primary">
              <p className="text-lg font-semibold text-foreground mb-2">Want long-stay rates?</p>
              <p className="text-muted-foreground">WhatsApp us with your dates and we'll send you a custom offer.</p>
            </div>
          </div>
        </section>

        <CTAStrip pageSlug="long-stay" />
        <TrustBlock />
        <PillarFAQ faqs={faqs} />
        <InternalLinks links={internalLinks} />
      </main>

      <PillarFooter />
    </>
  );
};

export default LongStay;
