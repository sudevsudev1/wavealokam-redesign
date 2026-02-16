import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MessageCircle, X } from 'lucide-react';

interface QuizConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answer1: string;
  answer2: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}

const QuizConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  answer1, 
  answer2,
  guestName,
  guestEmail,
  guestPhone
}: QuizConfirmationDialogProps) => {
  const getWhatsAppMessage = () => {
    const message = `Hey Wavealokam! I answered your two stupid questions. Now give me my discount 😂

Name: ${guestName}
Email: ${guestEmail}
Phone: ${guestPhone}

Q1 : What does Wavealokam mean?
A1 : ${answer1 || '(Not answered)'}

Q2 : What is the easiest way to get free breakfast from the owner Amardeep?
A2 : ${answer2 || '(Not answered)'}`;
    return encodeURIComponent(message);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/+918606164606?text=${getWhatsAppMessage()}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-orange-50 to-white border-2 border-wave-orange/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            ✉️ Sent your email with the following -
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription asChild>
          <div className="space-y-4">
            <div className="bg-white/80 rounded-xl p-4 border border-wave-orange/20 space-y-3">
              <p className="text-sm text-foreground/90 font-medium">
                Hey Wavealokam, I answered your 2 stupid questions. Now give me my discount! 😂
              </p>
              
              <div className="space-y-1 text-sm text-foreground/80 border-b border-wave-orange/10 pb-3">
                <p><strong>Name:</strong> {guestName}</p>
                <p><strong>Email:</strong> {guestEmail}</p>
                <p><strong>Phone:</strong> {guestPhone}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-foreground/80">
                  <strong className="text-wave-orange">Q1:</strong> What does Wavealokam mean?
                </p>
                <p className="text-sm text-foreground/80 pl-4 border-l-2 border-wave-orange/30">
                  <strong>A1:</strong> {answer1 || '(Not answered)'}
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-foreground/80">
                  <strong className="text-wave-orange">Q2:</strong> What is the easiest way to get free breakfast from the owner Amardeep?
                </p>
                <p className="text-sm text-foreground/80 pl-4 border-l-2 border-wave-orange/30">
                  <strong>A2:</strong> {answer2 || '(Not answered)'}
                </p>
              </div>
            </div>
            
            <p className="text-sm text-foreground/80 leading-relaxed">
              Someone from the booking team will get back to you soon-ish. But if you are getting impatient, text us directly. <strong className="text-wave-orange">+918606164606</strong>. We don't do "allow 5-7 business days". We're here, we're keen, we're borderline desperate for human contact. Zero dignity, maximum efficiency.
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

export default QuizConfirmationDialog;
