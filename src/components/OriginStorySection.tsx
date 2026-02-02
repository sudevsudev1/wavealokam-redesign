import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Volume2, VolumeX } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Story segments with images and narrative text
const storySegments = [
  {
    image: '/origin-story/his_dream_was_simple.webp',
    title: 'Chapter One',
    text: 'His dream was simple...',
    subtitle: 'A vision takes root'
  },
  {
    image: '/origin-story/household_with_three_women_and_a_brother.webp',
    title: '',
    text: 'Growing up in a household with three women and a brother',
    subtitle: 'shaped who he would become'
  },
  {
    image: '/origin-story/the_ones_he_fantasizes_of_having.webp',
    title: '',
    text: 'The ones he fantasizes of having...',
    subtitle: 'Dreams of adventure'
  },
  {
    image: '/origin-story/former_beauty_queen.webp',
    title: 'Enter Priya',
    text: 'A former beauty queen',
    subtitle: 'with dreams of her own'
  },
  {
    image: '/origin-story/Femina_Miss_India.webp',
    title: '',
    text: 'Femina Miss India',
    subtitle: 'The spotlight years'
  },
  {
    image: '/origin-story/runway.webp',
    title: '',
    text: 'Walking the runway',
    subtitle: 'Grace under pressure'
  },
  {
    image: '/origin-story/choreographer_power_trips.webp',
    title: '',
    text: 'Choreographer power trips',
    subtitle: 'The industry\'s dark side'
  },
  {
    image: '/origin-story/wasnt_competent.webp',
    title: '',
    text: 'She wasn\'t competent, they said',
    subtitle: 'But she knew better'
  },
  {
    image: '/origin-story/that_was_unforgivable.webp',
    title: '',
    text: 'That was unforgivable',
    subtitle: 'A turning point'
  },
  {
    image: '/origin-story/famous_in_Kerala_-_surprise.webp',
    title: 'Plot Twist',
    text: 'Famous in Kerala - surprise!',
    subtitle: 'Recognition at home'
  },
  {
    image: '/origin-story/literal_beauty_queen_for_a_wife.webp',
    title: '',
    text: 'A literal beauty queen for a wife',
    subtitle: 'Love finds a way'
  },
  {
    image: '/origin-story/fell_in_love.webp',
    title: '',
    text: 'They fell in love',
    subtitle: 'Against all odds'
  },
  {
    image: '/origin-story/wedding.webp',
    title: 'The Union',
    text: 'The wedding',
    subtitle: 'Two souls, one dream'
  },
  {
    image: '/origin-story/got_rich.webp',
    title: '',
    text: 'They got rich',
    subtitle: 'Hard work pays off'
  },
  {
    image: '/origin-story/Supposed_to_be_chill_investors.webp',
    title: 'New Beginnings',
    text: 'Supposed to be chill investors',
    subtitle: 'The retirement plan'
  },
  {
    image: '/origin-story/Sudev_remains_the_chill_investor.webp',
    title: '',
    text: 'Sudev remains the chill investor',
    subtitle: 'Living the dream'
  },
  {
    image: '/origin-story/Here_s_a_picture_of_Sudev_with_his_local_friends.avif',
    title: '',
    text: 'Here\'s a picture of Sudev with his local friends',
    subtitle: 'Building community'
  },
  {
    image: '/origin-story/Here_is_a_picture_of_Sudev_with_all_his_friends.webp',
    title: '',
    text: 'Here is a picture of Sudev with all his friends',
    subtitle: 'The extended family'
  },
  {
    image: '/origin-story/That_s_when_Amardeep_discovered_Sudev_was_actually.webp',
    title: 'The Discovery',
    text: 'That\'s when Amardeep discovered Sudev was actually...',
    subtitle: 'More than meets the eye'
  },
  {
    image: '/origin-story/Varkala_was_their_first_trip_together.webp',
    title: '',
    text: 'Varkala was their first trip together',
    subtitle: 'Where magic happens'
  },
  {
    image: '/origin-story/drove_down.webp',
    title: '',
    text: 'They drove down',
    subtitle: 'The journey begins'
  },
  {
    image: '/origin-story/Wavealokam_started_as_a_partnership.webp',
    title: 'Wavealokam',
    text: 'Wavealokam started as a partnership',
    subtitle: 'A dream takes shape'
  },
  {
    image: '/origin-story/Nobody_s_living_in_a_slum_anymore.webp',
    title: '',
    text: 'Nobody\'s living in a slum anymore',
    subtitle: 'Lifting everyone up'
  },
  {
    image: '/origin-story/Here_we_are.webp',
    title: '',
    text: 'Here we are',
    subtitle: 'The present moment'
  },
  {
    image: '/origin-story/happily_ever_after.webp',
    title: 'The End',
    text: 'Happily ever after',
    subtitle: '...or is it just the beginning?'
  }
];

const OriginStorySection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [audioStarted, setAudioStarted] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Audio control
  const toggleMute = () => {
    if (audioRef.current) {
      if (!audioStarted) {
        audioRef.current.play().catch(() => {
          // Autoplay blocked, user needs to interact
        });
        setAudioStarted(true);
      }
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (!sectionRef.current || !containerRef.current) return;

    const section = sectionRef.current;
    const container = containerRef.current;
    const cards = cardsRef.current;
    const totalCards = storySegments.length;
    
    // Calculate total scroll distance
    const getScrollDistance = () => {
      const cardWidth = window.innerWidth * 0.85;
      const gap = window.innerWidth * 0.05;
      return (cardWidth + gap) * (totalCards - 1);
    };

    // Main horizontal scroll animation
    const scrollTween = gsap.to(container, {
      x: () => -getScrollDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${getScrollDistance() + window.innerHeight}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const cardIndex = Math.round(progress * (totalCards - 1));
          setCurrentCardIndex(cardIndex);
          
          // Start audio when entering section
          if (progress > 0.01 && !audioStarted && audioRef.current) {
            audioRef.current.play().catch(() => {});
            setAudioStarted(true);
          }
        }
      }
    });

    // Ken Burns effect on each card
    cards.forEach((card, index) => {
      if (!card) return;
      
      const image = card.querySelector('.story-image') as HTMLElement;
      const textElements = card.querySelectorAll('.story-text');
      
      if (image) {
        // Ken Burns zoom effect
        gsap.fromTo(image,
          { scale: 1.1 },
          {
            scale: 1.3,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: () => `+=${getScrollDistance() + window.innerHeight}`,
              scrub: 1
            }
          }
        );
      }

      // Staggered text reveal for each card
      if (textElements.length > 0) {
        gsap.fromTo(textElements,
          { 
            opacity: 0, 
            y: 30,
            filter: 'blur(10px)'
          },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            stagger: 0.1,
            duration: 0.5,
            scrollTrigger: {
              trigger: card,
              containerAnimation: scrollTween,
              start: 'left 80%',
              end: 'left 30%',
              scrub: 1
            }
          }
        );
      }
    });

    // Parallax depth effect
    cards.forEach((card, index) => {
      if (!card) return;
      
      const depthOffset = (index % 3 - 1) * 20; // Alternate up/down
      
      gsap.fromTo(card,
        { y: -depthOffset },
        {
          y: depthOffset,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            containerAnimation: scrollTween,
            start: 'left right',
            end: 'right left',
            scrub: 1
          }
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === section || st.vars.containerAnimation === scrollTween) {
          st.kill();
        }
      });
    };
  }, [audioStarted]);

  return (
    <section 
      ref={sectionRef}
      id="origin-story"
      className="relative min-h-screen bg-gradient-to-b from-[hsl(var(--wave-purple))] via-[hsl(var(--wave-purple-light))] to-[hsl(var(--wave-blue-ocean))] overflow-hidden"
    >
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/audio/origin-story-theme.mp3"
        loop
        muted={isMuted}
        preload="auto"
      />

      {/* Audio Control Button */}
      <button
        onClick={toggleMute}
        className="fixed bottom-8 left-8 z-50 p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
        aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      {/* Section Header */}
      <div className="absolute top-0 left-0 w-full pt-12 pb-8 px-8 z-20">
        <h2 className="text-display-xl text-4xl md:text-6xl lg:text-7xl text-white text-center opacity-90">
          Our Story
        </h2>
        <p className="text-white/60 text-center mt-4 text-lg">
          Scroll to explore the journey →
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="fixed top-1/2 right-8 -translate-y-1/2 z-50 flex flex-col gap-2">
        {storySegments.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentCardIndex 
                ? 'bg-white scale-150' 
                : index < currentCardIndex 
                  ? 'bg-white/60' 
                  : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Horizontal Scroll Container */}
      <div 
        ref={containerRef}
        className="flex items-center gap-[5vw] pt-32 pb-16 px-[7.5vw]"
        style={{ width: `${storySegments.length * 90}vw` }}
      >
        {storySegments.map((segment, index) => (
          <div
            key={index}
            ref={el => { if (el) cardsRef.current[index] = el; }}
            className="relative w-[85vw] h-[70vh] flex-shrink-0 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Image with Ken Burns Effect */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={segment.image}
                alt={segment.text}
                className="story-image w-full h-full object-cover"
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Text Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              {segment.title && (
                <span className="story-text inline-block px-4 py-1 mb-4 text-sm font-semibold uppercase tracking-widest text-white/90 bg-white/10 backdrop-blur-sm rounded-full">
                  {segment.title}
                </span>
              )}
              <h3 className="story-text text-display text-3xl md:text-5xl lg:text-6xl text-white mb-4">
                {segment.text}
              </h3>
              <p className="story-text text-white/70 text-lg md:text-xl">
                {segment.subtitle}
              </p>
            </div>

            {/* Card number indicator */}
            <div className="absolute top-6 right-6 text-white/30 font-bold text-6xl md:text-8xl">
              {String(index + 1).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OriginStorySection;
