import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    title: 'GENERAL QUESTIONS',
    items: [
      {
        question: 'Where exactly is Wavealokam?',
        answer: "Edava, Varkala, Trivandrum, Kerala, India. We're the surf retreat where people come for a weekend and start researching remote work visas by Tuesday.",
      },
      {
        question: 'How far are you from Varkala Cliff?',
        answer: "10 minutes by vehicle when you go. and an eternity when it's time to leave because you won't want to.",
      },
      {
        question: "What's special about your location?",
        answer: 'Tourist-free beach 180 meters away. In Varkala, that\'s not a feature. It\'s a statistical impossibility. You\'ll appreciate this around day three when you\'ve experienced what "popular beach" actually means.',
      },
      {
        question: 'How do I book a room?',
        answer: 'WhatsApp, phone, or OTAs. We respond with the enthusiasm of golden retrievers and the efficiency of German trains. No "your call is important to us" music. No ticket numbers. Just humans who actually want you to book.',
      },
      {
        question: 'Are you right on the beach? Do all rooms have Sea View?',
        answer: "We are Near the ocean, not on it. Exactly one room has a proper ocean-facing window. Even that comes with artistic tree framing and a new construction photobombing the shot. We all hate the new construction. Politely of course. Pro Tip. Ask for room 103. If it's available, it's yours! Others have \"wow, that courtyard is really helping me focus on inner peace\" views. The good news? Every room gets the same balcony and ocean soundtrack. Ask beforehand which view you're getting. Manage expectations now, avoid buyer's remorse.",
      },
    ],
  },
  {
    title: 'ACCOMMODATION',
    items: [
      {
        question: 'Do you have dorm beds?',
        answer: "No. We're a bed and breakfast, not a hostel. Get a room like an adult.",
      },
      {
        question: 'What amenities are in both types of rooms?',
        answer: "All rooms - King and double - come with a mini fridge with freezer for your... you know what. A smart TV that's fairly smart but definitely didn't come first in its class, kettle with coffee, tea, milk powder, sugar. Toiletries. Housekeeping and room cleaning upon request, because we're helpful but not hovering. Privacy matters.",
      },
      {
        question: 'Can I sleep on your bean bags on the terrace instead of my room?',
        answer: "You can try. Others have. Some are still there, having fully dissociated from the concept of responsibility. The bean bags don't judge your life choices - they enable them. Consider this your warning and your invitation.",
      },
    ],
  },
  {
    title: 'FOOD & BREAKFAST',
    items: [
      {
        question: "What's for breakfast?",
        answer: "Lekha Chechi's Kerala breakfast - the kind that makes you understand why people write poetry about food. Fresh, homemade, authentic, and served until it isn't because other guests got to it first and you hadn't included it in your package.",
      },
      {
        question: "I didn't book breakfast. Can I still get it?",
        answer: 'Yes. You can pay for breakfast separately. Or you can attempt the secret hack mentioned elsewhere on the page.',
      },
      {
        question: "What's toddy?",
        answer: "Kerala's traditional palm wine that drinks like juice and prosecutes like tequila. Tastes harmless, acts guilty. The morning after involves a bathroom experience so profound you'll text friends about it. That suspicious grin on your face isn't drugs - it's relief. So much relief.",
      },
    ],
  },
  {
    title: 'SURFING',
    items: [
      {
        question: "I've never surfed before. Can I learn here?",
        answer: 'Yes. We start you in calm water where "wipeout" means "gentle collapse into three feet of water" and "shark" means "definitely just your own foot." You\'ll master standing up for brief, glorious moments. Long enough for photos. Short enough to stay humble.',
      },
      {
        question: 'How much are surf lessons?',
        answer: "Beginner lesson: 1500 INR for 1.5 hours of discovering muscles you didn't know you had and unlock coordination that might surprise you. Includes board, leash, transport, theory plus ofcourse actual surfing. Book 5+ sessions upfront, get 10% off. Bulk discounts on humility.",
      },
      {
        question: 'How long until I can surf on my own?',
        answer: "Around 10-12 sessions until you're speaking in waves and catching them solo instead of the instructor having to push you to match rhythm and speed. Then comes the magic - you'll feel the ocean's heartbeat, anticipate its mood, achieve oneness. We're not just teaching surfing - we're creating junkies. We're pushers of a very specific high. You'll thank us while booking session thirteen.",
      },
      {
        question: 'What about intermediate and advanced surfing?',
        answer: "Intermediate: Bigger waves, better technique, exponentially more spectacular failures. You'll progress from \"falling gracefully\" to \"falling with style.\" It's growth.\n\nAdvanced: Varkala's legendary swells that separate confident surfers from overconfident ones. These waves have been humbling people since before surfing had hashtags. Bring skills, bring respect, bring patience.",
      },
      {
        question: 'Who\'s your surf instructor/brand ambassador?',
        answer: "Our Instructors are all ISA Certified with years of experience. They are not just instructors, they also run the Vibe Department and are all Chief Vibe Officers. You'll see why.\n\nWe can tell you who is NOT an instructor though. Sudev Nair - actor, martial artist, dancer, gymnast, part time surfer and full time brand ambassador of Wave-a-lokam Surf School. Who the hell even has a brand ambassador for a surf school. Absolutely pointless. Exactly like the nose of the surfboard he broke last month.",
      },
    ],
  },
  {
    title: 'ACTIVITIES',
    items: [
      {
        question: 'What else can I do besides surfing?',
        answer: "Kayaking for the romantics, banana boats for the adrenaline addicts, speed boats for people with things to prove. Quad bikes, quiet beach time, temple, night life, rooftop chilling and enough options that we don't want to risk TLDR. Note that all activities are in and around Varkala with trusted folk. Not necessarily at or next door to Wave-a-lokam.",
      },
      {
        question: 'What are the backwater activities?',
        answer: "At Mangrove Forest Safari, here are the approximate prices:\n\n• Mangrove kayaking: 1000 INR, 2+ hours of peaceful paddling\n• Country boat: 1800 INR, 1 hour of living your best National Geographic fantasy\n• Stand Up Paddle: 1350 INR, 2 hours of abs workout marketed as recreation\n• Speed boat: 1500 INR, 35 minutes of \"omg I didn't know speed boats could do that\" presented as adventure\n\nAC car to Mangrove Village: 1300 INR for up to 4 humans or 3 humans and someone's overpacked backpack.",
      },
      {
        question: 'Is there stuff to do at night?',
        answer: "Private rooftop dining under actual stars. BYOB policy. Perfect for romance, proposals, or groups of friends avoiding their hotel beds because the view's too good and going inside feels like quitting.",
      },
    ],
  },
  {
    title: 'PACKAGES & PRICING',
    items: [
      {
        question: 'Do you have surf-and-stay packages?',
        answer: "Not formally. But owners adore long-term surf guests like grandparents adore grandchildren. Stay awhile, get offered discounts that make you seriously reconsider your return flight. It's not manipulation if everyone benefits. That's just good business disguised as affection.",
      },
      {
        question: "What's the itinerary builder thing on your website?",
        answer: "Our custom app where you build your dream Varkala experience, add everything you want, watch the numbers climb, then realize you've planned a three-week adventure into a four-day window. We handle the logistics, you handle the fun.",
      },
      {
        question: 'Are the prices on the itinerary builder final?',
        answer: "They're educated guesses dressed as numbers. Everything's at vendor cost because we're helpers, not hustlers. But it's not live booking - think vision board, not contract. Prices dance with seasons, availability plays hide and seek, and actual booking happens via WhatsApp or OTAs like civilized people.",
      },
    ],
  },
  {
    title: 'BOOKING & LOGISTICS',
    items: [
      {
        question: 'How does booking actually work?',
        answer: "Itinerary builder creates beautiful possibilities so you can plan your time and money instead of having to wing it after getting here. WhatsApp/phone/OTAs create actual reservations. One's inspiration, one's confirmation. Both matter. Only one gets you a bed though.",
      },
      {
        question: 'Will someone contact me after I submit an itinerary request?',
        answer: "The team will reach out soon. Or bypass the waiting game and text us directly because we're not building suspense - we're running a resort. We reply fast enough to seem eager, slow enough to seem employed.",
      },
      {
        question: 'What if I need transport?',
        answer: "We arrange everything at cost price paid directly to the cab/transportation. No commissions, no markups, just aggressive helpfulness. We coordinate, vendors deliver, you show up stress free",
      },
    ],
  },
  {
    title: 'RANDOM BUT IMPORTANT',
    items: [
      {
        question: 'Can I actually just chill and do nothing?',
        answer: "Please do. Radical rest is underrated. Wake up slow, eat well, stare at horizons, achieve nothing. It's one of life's rarest pleasures.",
      },
      {
        question: 'Will I want to leave?',
        answer: 'No.',
      },
      {
        question: 'Why is your marketing so weird?',
        answer: "Because honesty's more interesting than \"unparalleled luxury experience\" copy-pasted from 10,000 other resorts. We're real people running a real place where you'll actually have a good time. Corporate speak is for corporations. We're just trying to feed you good food and teach you to surf without lying about either.",
      },
    ],
  },
];

const FAQSection = () => {
  return (
    <section
      id="faq"
      className="relative bg-gradient-to-b from-[hsl(var(--wave-blue-ocean))] to-[hsl(var(--wave-purple))] py-24 md:py-32"
    >
      <div className="max-w-4xl mx-auto px-6 md:px-8">
        {/* Title */}
        <h2 className="text-4xl md:text-6xl lg:text-7xl text-white text-center font-bold leading-tight mb-16">
          FAQ
        </h2>

        {/* FAQ Categories */}
        <div className="space-y-12">
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {/* Category Title */}
              <h3 className="text-xl md:text-2xl font-bold text-white/90 mb-6 tracking-wide">
                {category.title}
              </h3>

              {/* Questions */}
              <Accordion type="multiple" className="space-y-3">
                {category.items.map((item, itemIndex) => (
                  <AccordionItem
                    key={itemIndex}
                    value={`${categoryIndex}-${itemIndex}`}
                    className="border border-white/20 rounded-xl bg-white/5 backdrop-blur-sm overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 text-left text-white hover:no-underline hover:bg-white/10 transition-colors">
                      <span className="text-lg md:text-xl font-medium pr-4">
                        {item.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                      <p className="text-white/80 text-base md:text-lg leading-relaxed whitespace-pre-line">
                        {item.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16 pt-8 border-t border-white/20">
          <p className="text-xl md:text-2xl text-white font-medium mb-4">
            Got more questions? Text us. We're almost always online.
          </p>
          <p className="text-white/70">
            Planning your trip? Check our <Link to="/varkala-guide" className="underline hover:text-white">Varkala travel guide</Link>, learn about the <Link to="/best-time-to-visit-varkala" className="underline hover:text-white">best time to visit</Link>, or find out <Link to="/how-to-reach-varkala" className="underline hover:text-white">how to reach Varkala</Link>. Ready to book? <Link to="/contact" className="underline hover:text-white">Contact Wavealokam</Link> directly.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
