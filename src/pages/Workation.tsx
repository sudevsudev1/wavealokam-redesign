import { Helmet } from 'react-helmet-async';
import { Wifi, Coffee, Sun, Clock, Waves, MapPin, Zap, Volume2 } from 'lucide-react';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import { workationHeroImages } from '@/data/pillarHeroImages';
import TrustBlock from '@/components/pillar/TrustBlock';
import CTAStrip from '@/components/pillar/CTAStrip';
import PillarFAQ from '@/components/pillar/PillarFAQ';
import InternalLinks from '@/components/pillar/InternalLinks';
import PillarFooter from '@/components/pillar/PillarFooter';

const Workation = () => {
  const workFeatures = [
    { icon: Wifi, title: 'Reliable WiFi', desc: 'Fiber connection + backup. Solid enough for Zoom calls and midnight deployments.' },
    { icon: Zap, title: 'Power Backup', desc: 'Inverter backup for essentials. Your laptop won\'t ghost you mid-presentation.' },
    { icon: Volume2, title: 'Quiet Hours', desc: 'Respect for focus time. Ocean sounds are the only ambient noise.' },
    { icon: Coffee, title: 'Coffee Station', desc: 'In-room kettle with coffee, tea, and the fuel you need.' },
  ];

  const idealStays = [
    { duration: '1 Week', desc: 'Test the waters. See if you can actually work with ocean views without being distracted.' },
    { duration: '2 Weeks', desc: 'The sweet spot. Enough time to build routines and explore on weekends.' },
    { duration: '1 Month', desc: 'Full integration. You\'ll know the local barista\'s name by week two.' },
  ];

  const suggestedRoutine = [
    { time: '6:00 AM', activity: 'Optional sunrise surf or beach walk' },
    { time: '7:30 AM', activity: 'Kerala breakfast (the good kind)' },
    { time: '8:30 AM', activity: 'Deep work block – no meetings zone' },
    { time: '12:30 PM', activity: 'Lunch break + short beach walk' },
    { time: '1:30 PM', activity: 'Afternoon work block' },
    { time: '5:00 PM', activity: 'Surf session or cafe hop' },
    { time: '7:00 PM', activity: 'Sunset from the terrace' },
    { time: '8:00 PM', activity: 'Dinner + wind down' },
  ];

  const faqs = [
    {
      question: 'How reliable is the WiFi really?',
      answer: 'Fiber connection, typically 50-100 Mbps. We have a backup connection for when the primary acts up. Good enough for video calls, large file uploads, and streaming. Not enterprise-level, but solid for remote work.',
    },
    {
      question: 'Is there power backup?',
      answer: 'Yes. Inverter backup covers lights and charging. Extended outages are rare, but Kerala does get monsoon drama occasionally. Your work won\'t be interrupted.',
    },
    {
      question: 'Are there quiet hours?',
      answer: 'We\'re naturally quiet. No party hostel vibes here. Most guests are here for peace. That said, ocean waves don\'t come with a mute button.',
    },
    {
      question: 'Is laundry available?',
      answer: 'Yes. Laundry service available. Usually same-day or next-day return. Pricing by the piece.',
    },
    {
      question: 'Any cafes nearby for a change of scene?',
      answer: 'Plenty at Varkala Cliff, 10-15 minutes away. Good coffee, better views, reliable WiFi. We can recommend our favorites.',
    },
  ];

  const internalLinks = [
    { name: 'Long Stay Rates', href: '/long-stay', description: 'Weekly & monthly discounts' },
    { name: 'Stay Details', href: '/stay', description: 'Room info & amenities' },
    { name: 'How to Reach', href: '/how-to-reach-varkala', description: 'Travel logistics' },
  ];

  return (
    <>
      <Helmet>
        <title>Workation in Varkala | Remote Work from Beach in Kerala | Wavealokam</title>
        <meta name="description" content="Work remotely from Wavealokam in Varkala, Kerala. Reliable WiFi, peaceful beach setting, and the perfect routine. Ideal 1-4 week workation destination." />
      </Helmet>

      <PillarNav />
      
      <main className="pt-16">
        <PillarHero
          title="Workation in Varkala at Wavealokam"
          subtitle="Your office soundtrack: waves, not traffic. Work with ocean as your background noise."
          heroImages={workationHeroImages}
        />

        {/* Work Features */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Work-Friendly Setup
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {workFeatures.map((feature, index) => (
                <div key={index} className="p-6 bg-muted/20 rounded-2xl border border-border text-center">
                  <feature.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ideal Stay Durations */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Ideal Stay Lengths
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {idealStays.map((stay, index) => (
                <div key={index} className="p-6 bg-background rounded-2xl border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-bold text-foreground">{stay.duration}</h3>
                  </div>
                  <p className="text-muted-foreground">{stay.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Suggested Routine */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              A Workation Day
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              This is a suggestion, not a schedule. Do what works for you.
            </p>
            <div className="max-w-2xl mx-auto">
              {suggestedRoutine.map((item, index) => (
                <div key={index} className="flex gap-4 mb-4 pb-4 border-b border-border last:border-0">
                  <span className="text-primary font-semibold w-20 shrink-0">{item.time}</span>
                  <span className="text-foreground/80">{item.activity}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Location Benefits */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Why Varkala for Workation?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center p-6">
                <Waves className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Morning Surf</h3>
                <p className="text-muted-foreground">Start your day with exercise that doesn't feel like exercise.</p>
              </div>
              <div className="text-center p-6">
                <Sun className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Perfect Weather</h3>
                <p className="text-muted-foreground">Tropical warmth year-round. Monsoons (Jun-Aug) are dramatic but cozy.</p>
              </div>
              <div className="text-center p-6">
                <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Quiet Location</h3>
                <p className="text-muted-foreground">Edava is calmer than main Varkala. Fewer tourists, more focus.</p>
              </div>
            </div>
          </div>
        </section>

        <CTAStrip pageSlug="workation" />
        <TrustBlock />
        <PillarFAQ faqs={faqs} />
        <InternalLinks links={internalLinks} />
      </main>

      <PillarFooter />
    </>
  );
};

export default Workation;
