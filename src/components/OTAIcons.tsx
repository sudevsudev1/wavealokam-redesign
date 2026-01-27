import { Star } from 'lucide-react';

interface OTA {
  name: string;
  rating: number;
  url: string;
}

const otas: OTA[] = [
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

const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < fullStars
              ? 'text-white fill-white'
              : i === fullStars && hasHalfStar
              ? 'text-white fill-white/50'
              : 'text-white/30'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-white/80">{rating}/5</span>
    </div>
  );
};

const OTAIcons = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8">
      {otas.map((ota) => (
        <a
          key={ota.name}
          href={ota.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:-translate-y-1"
        >
          <span className="text-sm md:text-base font-semibold text-white">{ota.name}</span>
          <StarRating rating={ota.rating} />
        </a>
      ))}
    </div>
  );
};

export default OTAIcons;
