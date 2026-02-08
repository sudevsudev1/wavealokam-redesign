import { Helmet } from 'react-helmet-async';
import { Waves, Sun, Shield, Backpack, Clock, Users, GraduationCap } from 'lucide-react';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import TrustBlock from '@/components/pillar/TrustBlock';
import CTAStrip from '@/components/pillar/CTAStrip';
import PillarFAQ from '@/components/pillar/PillarFAQ';
import InternalLinks from '@/components/pillar/InternalLinks';
import PillarFooter from '@/components/pillar/PillarFooter';
const SurfStay = () => {
  const packages = [{
    name: 'Beginner Package',
    description: 'Perfect first-timers. Learn to stand, ride whitewater, and fall gracefully.',
    includes: ['Daily 1.5 hr lessons', 'Board & equipment', 'Theory sessions', 'Beach transport'],
    duration: '3-5 days recommended. 10% discount on pre paying for 5 sessions'
  }, {
    name: 'Intermediate Package',
    description: 'Ready for green waves? Bigger waves, better technique, more spectacular wipeouts.',
    includes: ['Daily 2 hr sessions', 'Wave selection coaching', 'Video analysis', 'Flexible scheduling'],
    duration: '5-7 days recommended. 10% discount on prepaying for 5 sessions and 15% for 7.'
  }];
  const typicalDay = [{
    time: '6:30 AM',
    activity: 'Wake up to ocean sounds'
  }, {
    time: '7:00 AM',
    activity: 'Light breakfast & coffee'
  }, {
    time: '7:30 AM',
    activity: 'Morning surf session (best waves)'
  }, {
    time: '10:00 AM',
    activity: 'Big Kerala breakfast'
  }, {
    time: '11:00 AM',
    activity: 'Rest, read, or explore'
  }, {
    time: '4:00 PM',
    activity: 'Afternoon session or beach time'
  }, {
    time: '6:30 PM',
    activity: 'Sunset from the terrace'
  }, {
    time: '8:00 PM',
    activity: 'Dinner at local spots or rooftop'
  }];
  const whatToBring = ['Swimwear (we provide rashguards)', 'Sunscreen (reef-safe preferred)', 'Flip-flops', 'Light clothes for warm weather', 'Enthusiasm for falling repeatedly'];
  const weProvide = ['Surfboards (soft-tops for beginners)', 'Leashes & rashguards', 'Transport to surf spots', 'Fresh water rinse stations', 'First-aid trained instructors'];
  const faqs = [{
    question: 'I\'ve never surfed. Can I actually learn here?',
    answer: 'Absolutely. Most of our guests are first-timers. We start in calm, shallow water where "wipeout" means "gentle flop into three feet of water." You\'ll be standing (briefly, proudly) by session 2. But actually by end of session 1. We are just required to say session 2 by some unsaid mediocrity rule.'
  }, {
    question: 'How long are the lessons?',
    answer: 'Beginner lessons are 1.5 hours including theory and practice. Intermediate sessions run 2 hours. Any longer and your arms start filing complaints. You won\'t be able to surf through the soreness for the next 6 days. Then what\'s the point.'
  }, {
    question: 'What boards do you use?',
    answer: 'Soft-top boards for beginners. They\'re forgiving, buoyant, and won\'t hurt when they inevitably bonk you. Advanced surfers can request hard boards.'
  }, {
    question: 'When is the best season for surfing?',
    answer: 'September to May offers consistent beginner-friendly waves. June-August (monsoon) brings bigger swells for experienced surfers only. We\'ll be honest about conditions for your level.'
  }, {
    question: 'Are the instructors certified?',
    answer: 'All instructors are ISA-certified with years of local experience. They\'re also our Chief Vibe Officers. You\'ll understand when you meet them.'
  }];
  const internalLinks = [{
    name: 'Stay Only',
    href: '/stay',
    description: 'Just need a room?'
  }, {
    name: 'Long Stay',
    href: '/long-stay',
    description: 'Surf for weeks, not days'
  }, {
    name: 'Varkala Guide',
    href: '/varkala-guide',
    description: 'Plan your trip'
  }];
  return <>
      <Helmet>
        <title>Surf + Stay Packages in Varkala | Learn to Surf at Wavealokam</title>
        <meta name="description" content="Learn to surf in Varkala with Wavealokam's surf + stay packages. ISA-certified instructors, beginner-friendly waves, and beachside accommodation. Book your Kerala surf holiday." />
      </Helmet>

      <PillarNav />
      
      <main className="pt-16">
        <PillarHero title="Surf + Stay Packages at Wavealokam" subtitle="Wake up, surf, eat, repeat. The Kerala surf holiday you didn't know you needed." />

        {/* Packages */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              Our Packages
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              We love people who surf with us and give them discounts when they book directly with us.
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {packages.map((pkg, index) => <div key={index} className="bg-muted/20 rounded-2xl p-8 border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Waves className="w-8 h-8 text-primary" />
                    <h3 className="text-2xl font-bold text-foreground">{pkg.name}</h3>
                  </div>
                  <p className="text-muted-foreground mb-6">{pkg.description}</p>
                  <p className="text-sm font-medium text-primary mb-4">{pkg.duration}</p>
                  <ul className="space-y-2">
                    {pkg.includes.map((item, i) => <li key={i} className="flex items-center gap-2 text-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {item}
                      </li>)}
                  </ul>
                </div>)}
            </div>
          </div>
        </section>

        {/* Typical Day */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              A Typical Day
            </h2>
            <div className="max-w-2xl mx-auto">
              {typicalDay.map((item, index) => <div key={index} className="flex gap-4 mb-4 pb-4 border-b border-border last:border-0">
                  <span className="text-primary font-semibold w-20 shrink-0">{item.time}</span>
                  <span className="text-foreground/80">{item.activity}</span>
                </div>)}
            </div>
          </div>
        </section>

        {/* Safety & Instructors */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Safety & Our Team
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center p-6 bg-muted/20 rounded-2xl">
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Safety First</h3>
                <p className="text-muted-foreground">First-aid trained staff, proper equipment, and honest assessments of conditions.</p>
              </div>
              <div className="text-center p-6 bg-muted/20 rounded-2xl">
                <GraduationCap className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">ISA Certified</h3>
                <p className="text-muted-foreground">Internationally certified instructors who actually know how to teach.</p>
              </div>
              <div className="text-center p-6 bg-muted/20 rounded-2xl">
                <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Small Groups</h3>
                <p className="text-muted-foreground">Max 5 students per instructor. More attention, faster progress.</p>
              </div>
            </div>
          </div>
        </section>

        {/* What to Bring / We Provide */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Backpack className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">What to Bring</h2>
                </div>
                <ul className="space-y-3">
                  {whatToBring.map((item, index) => <li key={index} className="flex items-center gap-3 text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item}
                    </li>)}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Sun className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">We Provide</h2>
                </div>
                <ul className="space-y-3">
                  {weProvide.map((item, index) => <li key={index} className="flex items-center gap-3 text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item}
                    </li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <CTAStrip pageSlug="surf-stay" />
        <TrustBlock />
        <PillarFAQ faqs={faqs} />
        <InternalLinks links={internalLinks} />
      </main>

      <PillarFooter />
    </>;
};
export default SurfStay;