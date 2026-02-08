import { Helmet } from 'react-helmet-async';
import { Sun, Cloud, CloudRain, Users, Waves, Briefcase, Heart } from 'lucide-react';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import TrustBlock from '@/components/pillar/TrustBlock';
import CTAStrip from '@/components/pillar/CTAStrip';
import PillarFAQ from '@/components/pillar/PillarFAQ';
import InternalLinks from '@/components/pillar/InternalLinks';
import PillarFooter from '@/components/pillar/PillarFooter';

const BestTimeToVisit = () => {
  const months = [
    { month: 'January', weather: 'Perfect', temp: '24-32°C', crowd: 'High', surf: 'Beginner-friendly', icon: Sun },
    { month: 'February', weather: 'Perfect', temp: '25-33°C', crowd: 'High', surf: 'Beginner-friendly', icon: Sun },
    { month: 'March', weather: 'Hot', temp: '26-34°C', crowd: 'Medium', surf: 'Beginner-friendly', icon: Sun },
    { month: 'April', weather: 'Hot', temp: '27-34°C', crowd: 'Low', surf: 'Variable', icon: Sun },
    { month: 'May', weather: 'Hot & humid', temp: '27-33°C', crowd: 'Low', surf: 'Pre-monsoon swells', icon: Cloud },
    { month: 'June', weather: 'Monsoon', temp: '25-30°C', crowd: 'Very Low', surf: 'Advanced only', icon: CloudRain },
    { month: 'July', weather: 'Monsoon', temp: '24-29°C', crowd: 'Very Low', surf: 'Advanced only', icon: CloudRain },
    { month: 'August', weather: 'Monsoon', temp: '24-29°C', crowd: 'Very Low', surf: 'Advanced only', icon: CloudRain },
    { month: 'September', weather: 'Post-monsoon', temp: '25-30°C', crowd: 'Low', surf: 'Good swells', icon: Cloud },
    { month: 'October', weather: 'Pleasant', temp: '25-31°C', crowd: 'Medium', surf: 'All levels', icon: Sun },
    { month: 'November', weather: 'Perfect', temp: '24-31°C', crowd: 'Medium', surf: 'All levels', icon: Sun },
    { month: 'December', weather: 'Perfect', temp: '24-31°C', crowd: 'High', surf: 'Beginner-friendly', icon: Sun },
  ];

  const travelerRecs = [
    { icon: Users, type: 'Families', best: 'Nov-Feb', reason: 'Calm seas, pleasant weather, all attractions open' },
    { icon: Waves, type: 'Surfers (Beginner)', best: 'Sept-April', reason: 'Smaller, consistent waves. Warm water, easy conditions.' },
    { icon: Waves, type: 'Surfers (Advanced)', best: 'May. (June to mid August if you have a death wish and can manage to paddle out. All the best.)', reason: 'Monsoon swells bring power. Fewer tourists, more waves.' },
    { icon: Briefcase, type: 'Workation', best: 'Sep-May', reason: 'Avoid peak monsoon. Great weather, fewer distractions.' },
    { icon: Heart, type: 'Couples', best: 'Nov-Feb', reason: 'Romantic weather, sunset dinners, quiet beaches.' },
  ];

  const faqs = [
    {
      question: 'Does it rain during monsoon?',
      answer: 'What kind of... yes! It\'s monsoon. In coastal Kerala. June-August brings torrential, dramatic rain. Most resorts close. We stay open at half price, operating at a loss for the three people who understand that monsoon isn\'t a bug, it\'s a feature.\n\nEmpty beaches. Crashing waves. The kind of solitude that either breaks you or fixes you. If you need "things to do," stay home. If you want to sit in the rain and feel something real, come through. Different breed of traveler entirely. Unlike the reviewer who gave us 4 stars saying there is nothing to do in Varkala. Such is life.',
    },
    {
      question: 'How humid does it get?',
      answer: 'Quite humid, especially March-May and during monsoon. The sea breeze helps. You\'ll adapt faster than you think. Pack light, breathable clothes.',
    },
    {
      question: 'Are the sea conditions safe year-round?',
      answer: 'Monsoon (Jun-Aug) brings rough seas and strong currents. Swimming is not recommended then. Experienced surfers love it. Everyone else should respect the ocean.',
    },
    {
      question: 'When are crowds at their worst?',
      answer: 'Christmas-New Year week and peak January. Varkala Cliff gets packed. Our location in Edava stays calmer, but book ahead if you\'re coming then.',
    },
    {
      question: 'What about shoulder season?',
      answer: 'March-April and October-November are sweet spots. Fewer tourists, decent weather, better prices. Locals call it the smart season.',
    },
  ];

  const internalLinks = [
    { name: 'How to Reach Varkala', href: '/how-to-reach-varkala', description: 'Plan your journey' },
    { name: 'Varkala Guide', href: '/varkala-guide', description: 'Complete destination guide' },
    { name: 'Surf + Stay', href: '/surf-stay', description: 'Learn to surf here' },
  ];

  return (
    <>
      <Helmet>
        <title>Best Time to Visit Varkala | Month-by-Month Kerala Weather Guide</title>
        <meta name="description" content="When to visit Varkala, Kerala? Complete month-by-month breakdown of weather, surf conditions, crowds, and what to expect. Plan your perfect Kerala beach trip." />
      </Helmet>

      <PillarNav />
      
      <main className="pt-16">
        <PillarHero
          title="Best Time to Visit Varkala"
          subtitle="Honest answers about weather, waves, and when to come (hint: there's no bad time, just different vibes)"
        />

        {/* Month by Month */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Month-by-Month Breakdown
            </h2>
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-4">
                {months.map((m, index) => (
                  <div key={index} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border">
                    <div className="flex items-center gap-3 md:w-32">
                      <m.icon className="w-6 h-6 text-primary" />
                      <span className="font-bold text-foreground">{m.month}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 flex-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Weather:</span>
                        <span className="ml-1 text-foreground">{m.weather}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Temp:</span>
                        <span className="ml-1 text-foreground">{m.temp}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Crowds:</span>
                        <span className="ml-1 text-foreground">{m.crowd}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Surf:</span>
                        <span className="ml-1 text-foreground">{m.surf}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Season Comparison */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Peak vs Shoulder Season
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-6 bg-background rounded-2xl border border-border">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Sun className="w-6 h-6 text-primary" />
                  Peak Season (Nov-Feb)
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Best weather, warmest vibes</li>
                  <li>• Everything is open and running</li>
                  <li>• Higher prices, need to book ahead</li>
                  <li>• Varkala Cliff can feel crowded</li>
                  <li>• Perfect for first-timers</li>
                </ul>
              </div>
              <div className="p-6 bg-background rounded-2xl border border-border">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Cloud className="w-6 h-6 text-primary" />
                  Shoulder Season (Mar-May, Sep-Oct)
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Still good weather, less predictable</li>
                  <li>• Fewer tourists, more space</li>
                  <li>• Better deals on accommodation</li>
                  <li>• Some places have limited hours</li>
                  <li>• Great for repeat visitors</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Recommendations by Traveler Type */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Best Time by Traveler Type
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {travelerRecs.map((rec, index) => (
                <div key={index} className="p-6 bg-muted/20 rounded-2xl border border-border">
                  <rec.icon className="w-8 h-8 text-primary mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-1">{rec.type}</h3>
                  <p className="text-primary font-semibold mb-2">{rec.best}</p>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTAStrip pageSlug="best-time-to-visit-varkala" />
        <TrustBlock />
        <PillarFAQ faqs={faqs} />
        <InternalLinks links={internalLinks} />
      </main>

      <PillarFooter />
    </>
  );
};

export default BestTimeToVisit;
