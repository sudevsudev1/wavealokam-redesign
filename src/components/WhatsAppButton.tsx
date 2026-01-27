import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {
  const whatsappNumber = '+919539800445'; // Wavealokam WhatsApp number
  const message = encodeURIComponent('Hi! I would like to know more about Wavealokam.');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-[80] w-14 h-14 rounded-full bg-wave-orange flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_hsl(var(--wave-orange)/0.6)] group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white group-hover:rotate-12 transition-transform duration-300" />
      
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-wave-orange animate-ping opacity-30" />
    </a>
  );
};

export default WhatsAppButton;
