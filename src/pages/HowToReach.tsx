import { Helmet } from 'react-helmet-async';
import { Plane, Train, Car, MapPin, Clock, IndianRupee } from 'lucide-react';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import TrustBlock from '@/components/pillar/TrustBlock';
import CTAStrip from '@/components/pillar/CTAStrip';
import PillarFAQ from '@/components/pillar/PillarFAQ';
import InternalLinks from '@/components/pillar/InternalLinks';
import PillarFooter from '@/components/pillar/PillarFooter';

const HowToReach = () => {
  const airports = [
    {
      name: 'Trivandrum International Airport (TRV)',
      distance: '~50 km from Wavealokam',
      time: '1-1.5 hours by road',
      notes: 'Closest airport. Direct flights from major Indian cities and some international routes.',
      transfer: 'Pre-booked taxi (₹1200-1500) or Uber/Ola',
    },
    {
      name: 'Cochin International Airport (COK)',
      distance: '~180 km from Wavealokam',
      time: '3.5-4 hours by road',
      notes: 'More international connections. Consider train from Ernakulam to Varkala if you have time.',
      transfer: 'Train + taxi combo or direct taxi (₹4000-5000)',
    },
  ];

  const trainStations = [
    {
      name: 'Varkala Sivagiri Station',
      distance: '~7 km from Wavealokam',
      notes: 'Main station. Well-connected to Trivandrum, Kochi, Bangalore, Mumbai.',
      tip: 'Book AC Chair Car or Sleeper for longer journeys. Trains from Bangalore take ~12 hours.',
    },
    {
      name: 'Varkala Tunnel Station',
      distance: '~5 km from Wavealokam',
      notes: 'Smaller station, fewer trains stop here. Check if yours does.',
      tip: 'Closer to Edava but less convenient overall.',
    },
  ];

  const roadTravel = [
    {
      from: 'Trivandrum (Thiruvananthapuram)',
      distance: '~50 km',
      time: '1-1.5 hours',
      notes: 'Smooth coastal road. Beautiful drive.',
    },
    {
      from: 'Kochi (Cochin)',
      distance: '~180 km',
      time: '3.5-4 hours',
      notes: 'Take NH66. Consider breaking journey if traveling overnight.',
    },
    {
      from: 'Kollam',
      distance: '~35 km',
      time: '45 mins - 1 hour',
      notes: 'Shortest major city connection. Backwater cruises available from here.',
    },
  ];

  const toWavealokam = [
    { from: 'Varkala Cliff/North Cliff', time: '10-15 mins by auto/taxi' },
    { from: 'Varkala Sivagiri Station', time: '15-20 mins by auto/taxi' },
    { from: 'Papanasam Beach', time: '10-12 mins' },
    { from: 'Trivandrum Airport', time: '1-1.5 hours by taxi' },
  ];

  const faqs = [
    {
      question: 'How much does a taxi from Trivandrum airport cost?',
      answer: 'Pre-booked taxis run ₹1200-1500. Uber/Ola might be slightly cheaper but availability varies. We can arrange pickup for you at cost price.',
    },
    {
      question: 'What if I arrive late at night?',
      answer: 'Pre-book your taxi. Late-night Ubers are unreliable. Airport taxi counter is always open. Let us know your arrival time and we\'ll make sure someone is awake to receive you.',
    },
    {
      question: 'Should I rent a scooter or car?',
      answer: 'Scooter is perfect for Varkala exploration. Easy to park, cheap to rent (₹300-400/day). Car only needed if you\'re planning longer trips. We can help arrange both.',
    },
    {
      question: 'Is Uber/Ola reliable in Varkala?',
      answer: 'Moderately. Works better in peak season. For airport transfers or specific timing, pre-book through us or hotel. Local autos are everywhere.',
    },
    {
      question: 'Any safe travel tips?',
      answer: 'Stick to pre-booked taxis at night. Share your location with someone. Kerala is generally very safe, but standard travel precautions apply. Don\'t accept "tours" from random strangers.',
    },
  ];

  const internalLinks = [
    { name: 'Best Time to Visit', href: '/best-time-to-visit-varkala', description: 'Plan your timing' },
    { name: 'Stay at Wavealokam', href: '/stay', description: 'Book your room' },
    { name: 'Contact Us', href: '/contact', description: 'We\'ll help with transfers' },
  ];

  return (
    <>
      <Helmet>
        <title>How to Reach Varkala | Flights, Trains & Road Routes to Kerala Beach</title>
        <meta name="description" content="Complete guide to reaching Varkala, Kerala. Nearest airports, train stations, road routes, and transport to Wavealokam. With costs and travel tips." />
      </Helmet>

      <PillarNav />
      
      <main className="pt-16">
        <PillarHero
          title="How to Reach Varkala (Flights, Trains, Road)"
          subtitle="Getting to Kerala's cliff-top beach town is easier than you think. Here's every route, with real costs."
        />

        {/* By Air */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center gap-3 mb-12">
              <Plane className="w-8 h-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">By Air</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {airports.map((airport, index) => (
                <div key={index} className="p-6 bg-muted/20 rounded-2xl border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-4">{airport.name}</h3>
                  <div className="space-y-3 text-foreground/80">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{airport.distance}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{airport.time}</span>
                    </div>
                    <p className="text-muted-foreground">{airport.notes}</p>
                    <div className="pt-2 border-t border-border">
                      <span className="text-sm font-medium text-primary">Transfer:</span>
                      <span className="text-sm ml-2">{airport.transfer}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* By Train */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center gap-3 mb-12">
              <Train className="w-8 h-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">By Train</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {trainStations.map((station, index) => (
                <div key={index} className="p-6 bg-background rounded-2xl border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-4">{station.name}</h3>
                  <div className="space-y-3 text-foreground/80">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{station.distance}</span>
                    </div>
                    <p className="text-muted-foreground">{station.notes}</p>
                    <div className="pt-2 border-t border-border">
                      <span className="text-sm font-medium text-primary">Tip:</span>
                      <span className="text-sm ml-2">{station.tip}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* By Road */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center gap-3 mb-12">
              <Car className="w-8 h-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">By Road</h2>
            </div>
            <div className="max-w-3xl mx-auto">
              {roadTravel.map((route, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4 p-4 mb-4 bg-muted/20 rounded-xl border border-border">
                  <div className="md:w-48 font-bold text-foreground">{route.from}</div>
                  <div className="flex-1 text-foreground/80">
                    <span className="text-primary">{route.distance}</span>
                    <span className="mx-2">•</span>
                    <span>{route.time}</span>
                    <p className="text-sm text-muted-foreground mt-1">{route.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Getting to Wavealokam */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              Getting to Wavealokam (Edava)
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              We're in Edava, near Sree Eight Beach. Not at the main cliff, but close enough. Here's travel time from key spots.
            </p>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {toWavealokam.map((item, index) => (
                <div key={index} className="flex justify-between p-4 bg-background rounded-xl border border-border">
                  <span className="text-foreground">{item.from}</span>
                  <span className="text-primary font-medium">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTAStrip pageSlug="how-to-reach-varkala" />
        <TrustBlock />
        <PillarFAQ faqs={faqs} />
        <InternalLinks links={internalLinks} />
      </main>

      <PillarFooter />
    </>
  );
};

export default HowToReach;
