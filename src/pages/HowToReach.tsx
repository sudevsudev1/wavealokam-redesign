import { Helmet } from 'react-helmet-async';
import { Plane, Train, Car, MapPin, Clock, IndianRupee } from 'lucide-react';
import PillarNav from '@/components/pillar/PillarNav';
import PillarHero from '@/components/pillar/PillarHero';
import { howToReachHeroImages } from '@/data/pillarHeroImages';
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
      time: '1.5 hours by road',
      notes: 'Closest airport. Direct flights from major Indian cities and some international routes.',
      transfer: 'Pre-booked taxi (₹2200-2500) Uber/Ola do not work here with any dependability.',
    },
    {
      name: 'Cochin International Airport (COK)',
      distance: '~180 km from Wavealokam',
      time: '5-6 hours by road',
      notes: 'More international connections. But so far. Yet better than having to change flights to come to Trivandrum airport and taking a cab again.',
      transfer: 'Taxi (approx 8k-10k INR). Wavealokam can arrange one for you if you ask nicely. Directly pay to vendor. We know the honest ones. IMPORTANT PRO TIP!!! Ask driver to take the MC road. NOT the highway, NOT the coastal road. Your back will thank you and so will half an hour of your time.',
    },
  ];

  const trainStations = [
    {
      name: 'Varkala Sivagiri Station',
      distance: '~7 km from Wavealokam',
      notes: 'Main station. Well-connected to Trivandrum, Kochi, Bangalore, Mumbai.',
      tip: 'Book AC Chair Car or Sleeper for longer journeys. Trains from Bangalore take ~12 hours. Wavealokam will send one our regular auto guys to pick you up. Don\'t worry. Pay him directly. Approx INR 200.',
    },
    {
      name: 'Varkala Tunnel Station',
      distance: '~5 km from Wavealokam',
      notes: 'Smaller station, fewer trains stop here. Check if yours does.',
      tip: 'Closer to Edava but less convenient overall. But you know what they say... Wavealokam will send one our regular auto guys to pick you up. Don\'t worry. Pay him directly. Approx INR 200.',
    },
  ];

  const roadTravel = [
    {
      from: 'Trivandrum (Thiruvananthapuram)',
      distance: '~50 km',
      time: '1.5 hours',
      notes: 'Smooth coastal road. Beautiful drive. Unlike some of the other coastal roads we know. From other cities with better PR but lesser cool. Talking about you Kochi.',
    },
    {
      from: 'Kochi (Cochin)',
      distance: '~180 km',
      time: '5-6 hours',
      notes: 'Take MC road. The Highway is all dug up and perpetually under construction and the coastal road this side was... well... never really \'constructed\' constructed.',
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
      answer: 'Pre-booked taxis run ₹2200 - 2500. Uber/Ola are as dependable as the ocean\'s mood. Wavealokam has regular, trusted and honest cabs we can arrange for your pick up. Just say the word and pay the money to the cab guy directly.',
    },
    {
      question: 'What if I arrive late at night?',
      answer: 'Pre-book your taxi. Wavealokam will help you out with that don\'t worry. Our guy will be waiting for you at the airport. Airport taxi counter is also always open. But they might charge more and you will have to do the driver brief yourself. Preferably in Malayalam. Let us know your arrival time and we\'ll make sure someone is awake to receive you.',
    },
    {
      question: 'Should I rent a scooter or car?',
      answer: 'Scooter is perfect for Varkala exploration. Easy to park, cheap to rent (₹500/day). Car only needed if you\'re planning longer trips. We can help arrange both.',
    },
    {
      question: 'Is Uber/Ola reliable in Varkala?',
      answer: 'No. No. NO and for the last time NOooooo. No matter what anybody says, especially the CEO of Ola and Uber, the only chance of you getting one of these here is if someone managed to convince an Uber driver to drop them off here from the airport at the exact moment when you were looking for a cab and your destination is also the airport. In that case, congratulations you have to pay only half, Rs. 1250, of what you would otherwise have to pay, which would be both way fare, approx Rs. 2500. But the odds of this happening are worse than you saving Rs. 1250 by listening to Wavealokam\'s managers to plan your trip efficiently.',
    },
    {
      question: 'Any safe travel tips?',
      answer: 'Kerala is generally very safe, but standard travel precautions apply. There could be other vacationers once in a while who understimate how good the cops here are at keeping Varkala safe and peaceful. They have all learnt their lesson. Neverthless, our managers are very responsible and are always checking up on the guests, every ready to help and assist. They are always just a call away. (Sometimes they don\'t respond immediately to texts because they work so much. Even we are irritated about this.)',
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
          heroImages={howToReachHeroImages}
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
