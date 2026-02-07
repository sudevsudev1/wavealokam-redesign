import { Waves, Home, GraduationCap, Sun, Star } from 'lucide-react';

const TrustBlock = () => {
  const trustPoints = [
    { icon: Waves, text: 'Peaceful beach retreat in Edava/Varkala' },
    { icon: Home, text: 'Boutique rooms, personal attention' },
    { icon: GraduationCap, text: 'Surf access & lessons available' },
    { icon: Sun, text: 'Ideal for stay-only, surf+stay, workations, and long stays' },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
          Why Wavealokam?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {trustPoints.map((point, index) => (
            <div 
              key={index}
              className="flex items-start gap-4 p-5 bg-background rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow"
            >
              <point.icon className="w-6 h-6 text-[hsl(var(--wave-orange))] shrink-0 mt-0.5" />
              <p className="text-foreground/80">{point.text}</p>
            </div>
          ))}
        </div>

        {/* Reviews/Testimonials Placeholder */}
        <div className="flex flex-wrap justify-center gap-4 items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">4.8/5 on Booking.com</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">4.9/5 on Airbnb</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">5/5 on Google</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBlock;
