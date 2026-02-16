import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MessageCircle, X } from 'lucide-react';

interface ItineraryConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryMessage?: string;
}

const ItineraryConfirmationDialog = ({ open, onOpenChange, itineraryMessage }: ItineraryConfirmationDialogProps) => {
  const handleWhatsApp = () => {
    const message = itineraryMessage 
      ? encodeURIComponent(itineraryMessage)
      : '';
    window.open(`https://wa.me/+918606164606${message ? `?text=${message}` : ''}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-orange-50 to-white border-2 border-wave-orange/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            ✨ Itinerary Sent!
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription asChild>
          <div className="space-y-4">
            <p className="text-sm text-foreground/80 leading-relaxed">
              Your dream itinerary is now subject to cosmic approval and room availability, whichever's more merciful. Our team will get back.
            </p>
            
            <p className="text-sm text-foreground/80 leading-relaxed">
              Want to skip the existential uncertainty? Message us on <strong className="text-wave-orange">+91 8606164606</strong>.
            </p>
            
            <p className="text-xs text-muted-foreground italic">
              Prayer is free. Certainty costs a WhatsApp text.
            </p>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleWhatsApp}
                className="flex-1 py-3 bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
              
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 py-3 bg-foreground/10 text-foreground font-semibold rounded-xl hover:bg-foreground/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Close
              </button>
            </div>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default ItineraryConfirmationDialog;
