import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Volume2, VolumeX } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Text segments with their trigger images
// When a text segment reaches center, its associated image animates in
interface TextSegment {
  text: string;
  image?: string;
  isCaption?: boolean;
}

const storySegments: TextSegment[] = [
  { text: 'Amardeep is a former beauty queen.', image: '/origin-story/former_beauty_queen.webp' },
  { text: 'Femina Miss India Gujarat 2017 and elite model who spent years perfecting the art of the', image: '/origin-story/Femina_Miss_India.webp' },
  { text: 'runway walk before discovering her actual calling: hospitality.', image: '/origin-story/runway.webp' },
  { text: 'Turns out, after enough air kisses and small-minded choreographer power trips, even the glamorous life gets annoyingly unfulfilling. Who knew.', image: '/origin-story/choreographer_power_trips.webp' },
  { text: 'Hospitality wasn\'t the plan though.' },
  { text: 'She and Sudev fell in love in 2021 while he was living his "disappear for a year and forge yourself in solitude" phase. Except it wasn\'t poetic solitude - it was a slum rehabilitation housing complex in Mumbai because he genuinely had no money. True story. Also no friends, but that came standard with the Sudev package.', image: '/origin-story/fell_in_love.webp' },
  { text: 'Here is a picture of Sudev with all his friends.', image: '/origin-story/Here_is_a_picture_of_Sudev_with_all_his_friends.webp', isCaption: true },
  { text: 'How he managed to land a literal beauty queen for a wife remains one of life\'s great unsolved mysteries. We\'ve stopped asking.', image: '/origin-story/literal_beauty_queen_for_a_wife.webp' },
  { text: 'Anyway, Varkala was their first trip together.', image: '/origin-story/Varkala_was_their_first_trip_together.webp' },
  { text: 'That\'s when Amardeep discovered Sudev was actually famous in Kerala -', image: '/origin-story/famous_in_Kerala_-_surprise.webp' },
  { text: 'surprise! He\'d found Varkala and surfing back in 2019 during what he thought was rock bottom. That was Until he had to also move to that slum rehabilitation complex because rent became too much luxury. This became his new rock bottom standard. But Varkala gave him surfing, and surfing gave him cathartic ocean weeps that eventually became a full-blown addiction. That\'s the high he now peddles to others.', image: '/origin-story/That_s_when_Amardeep_discovered_Sudev_was_actually.webp' },
  { text: 'He worked hard, got popular,' },
  { text: 'got rich. Possibly Amardeep\'s entry into his life shifted the cosmic odds.', image: '/origin-story/got_rich.webp' },
  { text: 'Either way, his dream was simple: own a place in Varkala. A vacation home for chilling, hosting friends', image: '/origin-story/his_dream_was_simple.webp' },
  { text: '- the ones he fantasizes of one day having, surfing,', image: '/origin-story/the_ones_he_fantasizes_of_having.webp' },
  { text: 'living happily ever after.', image: '/origin-story/happily_ever_after.webp' },
  { text: 'That was not to be.' },
  { text: 'Wave-a-lokam started as a partnership between Sudev, Amardeep, and Sudev\'s local friend who was supposedly "well-versed with local workings and business." The plan:', image: '/origin-story/Wavealokam_started_as_a_partnership.webp' },
  { text: 'Sudev and Amardeep would be chill investors; the friend would handle operations. Classic setup. I know what you are thinking. "But Sudev has no friends."', image: '/origin-story/Supposed_to_be_chill_investors.webp' },
  { text: '"Exactly!"', isCaption: true },
  { text: 'Here\'s a picture of Sudev with his local friends.', image: '/origin-story/Here_s_a_picture_of_Sudev_with_his_local_friends.avif', isCaption: true },
  { text: 'Said local friend turned out to be not' },
  { text: 'particularly competent, honest, or hardworking. Maybe forgiveable. But then they realized he wasn\'t even good with wit and one-liners.', image: '/origin-story/wasnt_competent.webp' },
  { text: 'That was unforgivable.', image: '/origin-story/that_was_unforgivable.webp' },
  { text: 'Amardeep packed up from Mumbai, drove down to Varkala, and cleaned house. Took over like she\'d been running hospitality her entire life.', image: '/origin-story/drove_down.webp' },
  { text: 'Turns out managing a household with three women and a brother translates directly into managing an entire bed-and-breakfast operation. Who knew domestic chaos was executive training?', image: '/origin-story/household_with_three_women_and_a_brother.webp' },
  { text: 'And so here we are.', image: '/origin-story/Here_we_are.webp' },
  { text: 'Sudev remains the chill investor who shows up on non-shooting days, surfs, sips cocktails on the terrace, and returns to sets to earn money that Amardeep efficiently converts into guest satisfaction and operational excellence.', image: '/origin-story/Sudev_remains_the_chill_investor.webp' },
  { text: 'It\'s a system. It works.' },
  { text: 'Nobody\'s living in a slum anymore. Progress.', image: '/origin-story/Nobody_s_living_in_a_slum_anymore.webp' },
];

// Extract unique images for background layer
const backgroundImages = storySegments
  .filter(s => s.image)
  .map(s => s.image!);

const OriginStorySection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [audioStarted, setAudioStarted] = useState(false);
  const [isInSection, setIsInSection] = useState(false);

  const toggleMute = () => {
    if (audioRef.current) {
      if (!audioStarted) {
        audioRef.current.play().catch(() => {});
        setAudioStarted(true);
      }
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (!sectionRef.current) return;

    const section = sectionRef.current;

    // Track when user is in this section for audio button visibility
    ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      end: 'bottom 20%',
      onEnter: () => setIsInSection(true),
      onLeave: () => setIsInSection(false),
      onEnterBack: () => setIsInSection(true),
      onLeaveBack: () => setIsInSection(false),
    });

    // Start audio when entering section
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      onEnter: () => {
        if (!audioStarted && audioRef.current) {
          audioRef.current.play().catch(() => {});
          setAudioStarted(true);
        }
      },
    });

    // Build a map of image index to text trigger index
    let imageIndex = 0;
    const imageToTextMap: { imageIdx: number; textIdx: number }[] = [];
    storySegments.forEach((segment, textIdx) => {
      if (segment.image) {
        imageToTextMap.push({ imageIdx: imageIndex, textIdx });
        imageIndex++;
      }
    });

    // Animate each background image based on its trigger text position
    imageToTextMap.forEach(({ imageIdx, textIdx }) => {
      const imageEl = imageRefs.current[imageIdx];
      const textEl = textRefs.current[textIdx];
      
      if (!imageEl || !textEl) return;

      // Set initial state - hidden and blurred
      gsap.set(imageEl, {
        opacity: 0,
        scale: 0.8,
        filter: 'blur(30px)',
      });

      // Create scroll-driven animation
      // Image fades in as text approaches center, sharp at center, fades out after
      gsap.timeline({
        scrollTrigger: {
          trigger: textEl,
          start: 'top 80%',
          end: 'bottom 20%',
          scrub: 1,
        },
      })
        .to(imageEl, {
          opacity: 0.6,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          ease: 'power2.out',
        })
        .to(imageEl, {
          opacity: 0,
          scale: 1.1,
          filter: 'blur(20px)',
          duration: 0.5,
          ease: 'power2.in',
        });
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [audioStarted]);

  // Build image index counter for refs
  let currentImageIndex = 0;

  return (
    <section
      ref={sectionRef}
      id="origin-story"
      className="relative min-h-screen bg-gradient-to-b from-[hsl(var(--wave-purple))] via-[hsl(var(--wave-purple-light))] to-[hsl(var(--wave-blue-ocean))] py-24 md:py-32 overflow-hidden"
    >
      {/* Background Images Layer - Fixed position within section */}
      <div className="absolute inset-0 pointer-events-none">
        {backgroundImages.map((src, idx) => (
          <div
            key={idx}
            ref={el => { imageRefs.current[idx] = el; }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0 }}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-contain max-w-4xl mx-auto"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--wave-purple)/0.7)] via-[hsl(var(--wave-purple-light)/0.6)] to-[hsl(var(--wave-blue-ocean)/0.7)] pointer-events-none" />

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
        className={`fixed bottom-8 left-8 z-50 p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 ${
          isInSection ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      {/* Content Layer */}
      <div className="relative z-10">
        {/* Title */}
        <div className="max-w-4xl mx-auto px-6 md:px-8 mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl lg:text-7xl text-white text-center font-bold leading-tight drop-shadow-lg">
            The Wave-a-lokam Origin Story
          </h2>
        </div>

        {/* Continuous Text Flow */}
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <div className="text-white text-xl md:text-2xl leading-relaxed drop-shadow-md">
            {storySegments.map((segment, idx) => {
              // Track which image this segment triggers
              const hasImage = !!segment.image;
              const imageIdx = hasImage ? currentImageIndex++ : -1;
              
              return (
                <span
                  key={idx}
                  ref={el => { textRefs.current[idx] = el; }}
                  className={`inline ${
                    segment.isCaption
                      ? 'block text-center italic text-white/90 my-8'
                      : ''
                  }`}
                >
                  {segment.text}{' '}
                </span>
              );
            })}
          </div>
        </div>

        {/* End flourish */}
        <div className="text-center py-16">
          <div className="inline-block w-16 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default OriginStorySection;
