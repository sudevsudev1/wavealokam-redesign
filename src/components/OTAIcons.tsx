import { Star } from "lucide-react";

interface OTA {
  name: string;
  rating: number;
  url: string;
}

const otas: OTA[] = [
  {
    name: "Google",
    rating: 4.9,
    url: "https://www.google.com/travel/search?q=wavealokam&ved=2ahUKEwjY",
  },
  {
    name: "Booking.com",
    rating: 4.8,
    url: "https://www.booking.com/hotel/in/wavealokam.en-gb.html?aid=7344211&label=metatripad-link-dmetain-hotel-12511381_xqdz-23940be54d997d133cf2ebadd7217efb_los-01_bw-011_tod-9_dom-in_curr-INR_gst-02_nrm-01_clkid-d3f63d15-70be-9e45-9125-2e2ebe3267c9_aud-0000_mbl-L_pd-T_sc-2_defdate-1_spo-0_clksrc-0_mcid-10&sid=221f60d9529b2682a224750e360421e6&all_sr_blocks=1251138103_408183029_2_0_0_1178844&checkin=2026-02-08&checkout=2026-02-09&dest_id=-2114230&dest_type=city&dist=0&group_adults=2&group_children=0&hapos=1&highlighted_blocks=1251138103_408183029_2_0_0_1178844&hpos=1&matching_block_id=1251138103_408183029_2_0_0_1178844&no_rooms=1&req_adults=2&req_children=0&room1=A%2CA&sb_price_type=total&sr_order=popularity&sr_pri_blocks=1251138103_408183029_2_0_0_1178844_428040&srepoch=1769574370&srpvid=c6501f2fea3e02a9&type=total&ucfs=1&",
  },
  {
    name: "Agoda",
    rating: 4.9,
    url: "https://www.agoda.com/en-in/wavealokam/hotel/varkala-in.html?cid=-310&ds=U%2FE%2FVqDO8JqITQXt",
  },
  {
    name: "MakeMyTrip",
    rating: 4.7,
    url: "https://www.makemytrip.com/hotels/wavealokam_beach_retreat-details-varkala.html",
  },
  {
    name: "Trip Advisor",
    rating: 5,
    url: "https://www.tripadvisor.in/Hotel_Review-g11864386-d32677942-Reviews-Wavealokam_Beach_Retreat-Edava_Varkala_Thiruvananthapuram_District_Kerala.html",
  },
];

const StarRating = ({ rating, darkMode }: { rating: number; darkMode: boolean }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            darkMode
              ? i < fullStars
                ? "text-white fill-white"
                : i === fullStars && hasHalfStar
                  ? "text-white fill-white/50"
                  : "text-white/30"
              : i < fullStars
                ? "text-wave-orange fill-wave-orange"
                : i === fullStars && hasHalfStar
                  ? "text-wave-orange fill-wave-orange/50"
                  : "text-wave-orange/30"
          }`}
        />
      ))}
      <span className={`ml-1 text-xs ${darkMode ? "text-white/80" : "text-foreground/80"}`}>{rating}/5</span>
    </div>
  );
};

interface OTAIconsProps {
  darkMode?: boolean;
}

const OTAIcons = ({ darkMode = true }: OTAIconsProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8">
      {otas.map((ota) => (
        <a
          key={ota.name}
          href={ota.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl backdrop-blur-sm border transition-all duration-300 hover:scale-105 hover:-translate-y-1 ${
            darkMode
              ? "bg-white/10 border-white/20 hover:bg-white/20"
              : "bg-wave-orange/10 border-wave-orange/30 hover:bg-wave-orange/20"
          }`}
        >
          <span className={`text-sm md:text-base font-semibold ${darkMode ? "text-white" : "text-foreground"}`}>
            {ota.name}
          </span>
          <StarRating rating={ota.rating} darkMode={darkMode} />
        </a>
      ))}
    </div>
  );
};

export default OTAIcons;
