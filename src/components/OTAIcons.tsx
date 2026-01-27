import { Star } from 'lucide-react';

interface OTA {
  name: string;
  rating: number;
  url: string;
}

const otas: OTA[] = [
  {
    name: 'Google',
    rating: 5.0,
    url: 'https://www.google.com/travel/search?q=wavealokam&ved=2ahUKEwjY',
  },
  {
    name: 'Booking.com',
    rating: 4.8,
    url: 'https://www.booking.com/hotel/in/wavealokam.html',
  },
  {
    name: 'Airbnb',
    rating: 4.9,
    url: 'https://www.airbnb.co.in/rooms/761928917398498862',
  },
  {
    name: 'MakeMyTrip',
    rating: 4.5,
    url: 'https://www.makemytrip.com/hotels/hotel-details/?hotelId=202107271754285889',
  },
  {
    name: 'Goibibo',
    rating: 4.7,
    url: 'https://www.goibibo.com/hotels/wavealokam-hotel-in-varkala-7438251287106330111/',
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
                ? 'text-white fill-white'
                : i === fullStars && hasHalfStar
                ? 'text-white fill-white/50'
                : 'text-white/30'
              : i < fullStars
                ? 'text-wave-orange fill-wave-orange'
                : i === fullStars && hasHalfStar
                ? 'text-wave-orange fill-wave-orange/50'
                : 'text-wave-orange/30'
          }`}
        />
      ))}
      <span className={`ml-1 text-xs ${darkMode ? 'text-white/80' : 'text-foreground/80'}`}>{rating}/5</span>
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
              ? 'bg-white/10 border-white/20 hover:bg-white/20'
              : 'bg-wave-orange/10 border-wave-orange/30 hover:bg-wave-orange/20'
          }`}
        >
          <span className={`text-sm md:text-base font-semibold ${darkMode ? 'text-white' : 'text-foreground'}`}>{ota.name}</span>
          <StarRating rating={ota.rating} darkMode={darkMode} />
        </a>
      ))}
    </div>
  );
};

export default OTAIcons;
