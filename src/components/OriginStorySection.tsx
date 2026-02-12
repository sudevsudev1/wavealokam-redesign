import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Volume2, VolumeX, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

gsap.registerPlugin(ScrollTrigger);

// Content segments with optional images
// Images appear when their segment scrolls into view
interface ContentSegment {
  text: string;
  image?: string;
  isCaption?: boolean; // For standalone image captions
}

const storyContent: ContentSegment[] = [
  { text: "", image: "/origin-story/former_beauty_queen.webp" },
  { text: "Amardeep is a former beauty queen." },
  { text: "", image: "/origin-story/Femina_Miss_India.webp" },
  { text: "Femina Miss India Gujarat 2017 and elite model who spent years perfecting the art of the runway walk" },
  { text: "", image: "/origin-story/runway.webp" },
  { text: "before discovering her actual calling: hospitality." },
  { text: "", image: "/origin-story/choreographer_power_trips.webp" },
  {
    text: "After enough air kisses and power trips of dull-witted choreographers nicknamed Chubhna (grating to the ear) Adams and such, even the glamorous life gets annoyingly unfulfilling.",
  },
  { text: "Hospitality wasn't the plan though..." },
  { text: "", image: "/origin-story/fell_in_love.webp" },
  {
    text: 'She and Sudev fell in love in 2021 while he was living his "disappear for a year and forge yourself in solitude" phase. Except it wasn\'t poetic solitude or just 1 year - it was a slum rehabilitation housing complex in Mumbai because he genuinely had no money. True story. Also no friends, but that came standard with the Sudev package.',
  },
  { text: "", image: "/origin-story/Here_is_a_picture_of_Sudev_with_all_his_friends.webp" },
  { text: "Here is a picture of Sudev with all his friends.", isCaption: true },
  { text: "", image: "/origin-story/literal_beauty_queen_for_a_wife.webp" },
  {
    text: "How he managed to land a literal beauty queen for a wife remains one of life's great unsolved mysteries. We've stopped asking. Anyway, Varkala was their first trip together.",
  },
  { text: "", image: "/origin-story/Varkala_was_their_first_trip_together.webp" },
  { text: "That's when Amardeep discovered Sudev was actually famous in Kerala -" },
  { text: "", image: "/origin-story/famous_in_Kerala_-_surprise.webp" },
  { text: "Surprise!" },
  { text: "", image: "/origin-story/That_s_when_Amardeep_discovered_Sudev_was_actually.webp" },
  {
    text: "He'd found Varkala and surfing back in 2019 during what he thought was rock bottom. That was until later when he had to also move to that slum rehabilitation complex because rent became too much luxury. This became his new rock bottom standard. But Varkala gave him surfing, and surfing gave him cathartic ocean weeps that eventually became a full-blown addiction. That's the high he now peddles to others.",
  },
  { text: "He worked hard, got popular, got rich." },
  { text: "", image: "/origin-story/got_rich.webp" },
  { text: "Possibly Amardeep's entry into his life shifted the cosmic odds." },
  { text: "", image: "/origin-story/his_dream_was_simple.webp" },
  { text: "Either way, his dream was simple: own a place in Varkala. A vacation home for chilling, hosting friends" },
  { text: "", image: "/origin-story/the_ones_he_fantasizes_of_having.webp" },
  { text: "- the ones he fantasizes of one day having..." },
  { text: "", image: "/origin-story/happily_ever_after.webp" },
  { text: "Surfing, living happily ever after." },
  { text: "That was not to be." },
  { text: "", image: "/origin-story/Wavealokam_started_as_a_partnership.webp" },
  {
    text: 'Wave-a-lokam started as a partnership between Sudev, Amardeep, and Sudev\'s local friend who was supposedly "well-versed with local workings and business." The plan: Sudev and Amardeep would be chill investors;',
  },
  { text: "", image: "/origin-story/Supposed_to_be_chill_investors.webp" },
  {
    text: 'The friend would handle operations. Classic setup. I know what you are thinking. "But Sudev has no friends."',
  },
  { text: '"Exactly!"', isCaption: true },
  { text: "", image: "/origin-story/Here_s_a_picture_of_Sudev_with_his_local_friends.avif" },
  { text: "Here's a picture of Sudev with his local friends.", isCaption: true },
  { text: "Said local friend" },
  { text: "", image: "/origin-story/wasnt_competent.webp" },
  {
    text: "turned out to be not particularly competent, honest, or hardworking. Could have been forgiven if not for the fact that he wasn't even good with wit and one-liners.",
  },
  { text: "", image: "/origin-story/that_was_unforgivable.webp" },
  { text: "That was unforgivable." },
  { text: "", image: "/origin-story/drove_down.webp" },
  {
    text: "Amardeep packed up from Mumbai, drove down to Varkala, Nero Ishtu in tow (they're in the back seat), and cleaned house. Took over like she'd been running hospitality her entire life.",
  },
  { text: "", image: "/origin-story/household_with_three_women_and_a_brother.webp" },
  {
    text: "Managing a household with three women and a brother translates directly into managing an entire bed-and-breakfast operation. Domestic Chaos is a degree in Hotel Management.",
  },
  { text: "", image: "/origin-story/Here_we_are.webp" },
  { text: "And so here we are. (Featuring aforementioned Ishtu and Nero. They big and naughty now)" },
  { text: "", image: "/origin-story/Sudev_remains_the_chill_investor.webp" },
  {
    text: 'Sudev remains the chill investor who shows up on non-shooting days, surfs, sips cocktails on the rooftop, blames Amardeep for being the temptress who always gets him fat and "too happy to want to work hard for a career anymore" but eventually returns to shooting to earn money that Amardeep efficiently converts into guest satisfaction and operational excellence.',
  },
  { text: "It's a system. It works." },
  { text: "", image: "/origin-story/Nobody_s_living_in_a_slum_anymore.webp" },
  { text: "Nobody's living in a slum rehab anymore. Progress." },
];

const OriginStorySection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [isInSection, setIsInSection] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const toggleMute = () => {
    if (audioRef.current) {
      if (!audioStarted) {
        audioRef.current.muted = false;
        audioRef.current.play().catch(() => {});
        setAudioStarted(true);
      }
      audioRef.current.muted = isMuted; // toggle: if currently unmuted, mute it
      setIsMuted(!isMuted);
    }
  };

  // Start playing when expanded
  useEffect(() => {
    if (isOpen && audioRef.current && !audioStarted) {
      audioRef.current.muted = false;
      audioRef.current.play().then(() => {
        setAudioStarted(true);
        setIsMuted(false);
      }).catch(() => {
        // Browser blocked autoplay — keep muted state
        setIsMuted(true);
      });
    }
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setAudioStarted(false);
    }
  }, [isOpen]);

  // Pause when scrolling out of section
  useEffect(() => {
    if (!isInSection && audioStarted && audioRef.current) {
      audioRef.current.pause();
    }
    if (isInSection && isOpen && audioRef.current && audioStarted && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  }, [isInSection, isOpen, audioStarted]);

  useEffect(() => {
    if (!sectionRef.current || !isOpen) return;

    const section = sectionRef.current;

    // Track when user is in this section for audio button visibility
    const sectionTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top 80%",
      end: "bottom 20%",
      onEnter: () => setIsInSection(true),
      onLeave: () => setIsInSection(false),
      onEnterBack: () => setIsInSection(true),
      onLeaveBack: () => setIsInSection(false),
    });

    // Start audio when entering section
    const audioTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top 50%",
      onEnter: () => {
        if (!audioStarted && audioRef.current) {
          audioRef.current.play().catch(() => {});
          setAudioStarted(true);
        }
      },
    });

    // Animate each segment
    const animations: gsap.core.Tween[] = [];
    const triggers: ScrollTrigger[] = [];

    segmentRefs.current.forEach((segment) => {
      if (!segment) return;

      const image = segment.querySelector(".story-image-container");
      const text = segment.querySelector(".story-text");

      // Image animation: blur → focus → slight zoom
      if (image) {
        gsap.set(image, {
          opacity: 0,
          scale: 0.8,
          filter: "blur(20px)",
        });

        const imageTween = gsap.to(image, {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: segment,
            start: "top 70%",
            end: "top 30%",
            scrub: 1,
          },
        });
        animations.push(imageTween);
        if (imageTween.scrollTrigger) triggers.push(imageTween.scrollTrigger);

        // Ken Burns subtle zoom while in view
        const img = image.querySelector("img");
        if (img) {
          const kenBurnsTween = gsap.to(img, {
            scale: 1.1,
            ease: "none",
            scrollTrigger: {
              trigger: segment,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          });
          animations.push(kenBurnsTween);
          if (kenBurnsTween.scrollTrigger) triggers.push(kenBurnsTween.scrollTrigger);
        }
      }

      // Text animation: fade in and up
      if (text) {
        gsap.set(text, {
          opacity: 0,
          y: 30,
        });

        const textTween = gsap.to(text, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: segment,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        });
        animations.push(textTween);
        if (textTween.scrollTrigger) triggers.push(textTween.scrollTrigger);
      }
    });

    return () => {
      sectionTrigger.kill();
      audioTrigger.kill();
      triggers.forEach((st) => st.kill());
      animations.forEach((anim) => anim.kill());
    };
  }, [audioStarted, isOpen]);

  return (
    <section
      ref={sectionRef}
      id="origin-story"
      className="relative bg-gradient-to-b from-[hsl(var(--wave-purple))] via-[hsl(var(--wave-purple-light))] to-[hsl(var(--wave-blue-ocean))] py-24 md:py-32"
    >
      {/* Background Music */}
      <audio ref={audioRef} src="/audio/origin-story-theme.mp3" loop preload="auto" />

      {/* Audio Control Button - always rendered, visibility controlled by CSS */}
      <button
        onClick={toggleMute}
        className={`fixed bottom-8 left-8 z-50 p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 ${
          isInSection && isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        aria-label={isMuted ? "Unmute background music" : "Mute background music"}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      <div className="max-w-4xl mx-auto px-6 md:px-8">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Collapsible Trigger */}
          <CollapsibleTrigger className="w-full group">
            <div className="flex flex-col items-center gap-6 cursor-pointer">
              <h2 className="text-4xl md:text-6xl lg:text-7xl text-white text-center font-bold leading-tight group-hover:text-white/90 transition-colors">
                The Wave-a-lokam Origin Story
              </h2>
              <div
                className={`p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white group-hover:bg-white/20 transition-all duration-300 ${isOpen ? "rotate-180" : ""}`}
              >
                <ChevronDown size={28} />
              </div>
              {!isOpen && <p className="text-white/60 text-lg">Click to read</p>}
            </div>
          </CollapsibleTrigger>

          {/* Collapsible Content */}
          <CollapsibleContent className="mt-16 md:mt-24">
            <div ref={contentRef} className="max-w-3xl mx-auto">
              {storyContent.map((segment, index) => (
                <div
                  key={index}
                  ref={(el) => {
                    segmentRefs.current[index] = el;
                  }}
                  className={`mb-8 ${segment.image ? "mb-12" : ""}`}
                >
                  {/* Image */}
                  {segment.image && (
                    <div className="story-image-container relative w-full mb-8 rounded-2xl overflow-hidden shadow-2xl">
                      <img src={segment.image} alt="" className="w-full h-auto object-contain" loading="lazy" />
                    </div>
                  )}

                  {/* Text */}
                  {segment.text && (
                    <p
                      className={`story-text text-white leading-relaxed ${
                        segment.isCaption
                          ? "text-lg md:text-xl text-center italic text-white/80"
                          : "text-xl md:text-2xl"
                      }`}
                    >
                      {segment.text}
                    </p>
                  )}
                </div>
              ))}

              {/* End flourish */}
              <div className="text-center py-16">
                <div className="inline-block w-16 h-1 bg-white/30 rounded-full" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
};

export default OriginStorySection;
