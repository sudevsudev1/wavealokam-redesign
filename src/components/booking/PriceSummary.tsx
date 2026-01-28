import { useState, useEffect } from 'react';
import { MessageCircle, BadgePercent, Download, ChevronUp, ChevronDown, Mail, Loader2 } from 'lucide-react';
import { PriceBreakdown, BookingState } from '@/types/booking';
import { exportItineraryPdf, generatePlainTextItinerary, getPdfFileName } from '@/utils/itineraryPdfExport';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GuestDetails } from './GuestDetailsForm';
import ItineraryConfirmationDialog from './ItineraryConfirmationDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PriceSummaryProps {
  breakdown: PriceBreakdown;
  nights: number;
  onBookNow: () => void;
  isValid: boolean;
  bookingState?: BookingState;
  guestDetails?: GuestDetails;
  areGuestDetailsValid?: boolean;
}

const PriceSummary = ({ 
  breakdown, 
  nights, 
  onBookNow, 
  isValid, 
  bookingState,
  guestDetails,
  areGuestDetailsValid = false
}: PriceSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldBeSticky, setShouldBeSticky] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [itineraryMessage, setItineraryMessage] = useState('');

  const canUseActions = isValid && areGuestDetailsValid;

  const sendItineraryEmail = async (pdfBase64: string, pdfFileName: string): Promise<boolean> => {
    if (!bookingState || !guestDetails) return false;
    
    try {
      const itineraryDetails = generatePlainTextItinerary(bookingState, breakdown, guestDetails);
      
      const { data, error } = await supabase.functions.invoke('send-itinerary-email', {
        body: {
          guestName: guestDetails.name.trim(),
          guestEmail: guestDetails.email.trim(),
          guestPhone: guestDetails.phone.trim(),
          itineraryDetails,
          pdfBase64,
          pdfFileName
        }
      });

      if (error) {
        console.error('Error sending email:', error);
        toast.error('Failed to send email. Please try again.');
        return false;
      }

      if (!data?.success) {
        console.error('Email send failed:', data?.error);
        toast.error(data?.error || 'Failed to send email');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error invoking edge function:', err);
      toast.error('Failed to send email. Please try again.');
      return false;
    }
  };

  const getWhatsAppItineraryMessage = (): string => {
    if (!bookingState || !guestDetails) return '';
    return generatePlainTextItinerary(bookingState, breakdown, guestDetails);
  };

  const handleExportPdf = async () => {
    if (!bookingState || !guestDetails) return;
    
    setIsSendingEmail(true);
    try {
      // Export PDF and get base64
      const pdfBase64 = exportItineraryPdf(bookingState, breakdown, guestDetails);
      const pdfFileName = getPdfFileName(bookingState);
      
      // Also send email automatically when downloading
      const emailSent = await sendItineraryEmail(pdfBase64, pdfFileName);
      
      if (emailSent) {
        toast.success('PDF downloaded and email sent!');
        setItineraryMessage(getWhatsAppItineraryMessage());
        setShowConfirmationDialog(true);
      } else {
        toast.success('PDF downloaded successfully');
      }
    } catch (err) {
      console.error('Error exporting PDF:', err);
      toast.error('Failed to export PDF');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!bookingState || !guestDetails) return;
    
    setIsSendingEmail(true);
    try {
      // Generate PDF for attachment
      const pdfBase64 = exportItineraryPdf(bookingState, breakdown, guestDetails);
      const pdfFileName = getPdfFileName(bookingState);
      
      const emailSent = await sendItineraryEmail(pdfBase64, pdfFileName);
      
      if (emailSent) {
        setItineraryMessage(getWhatsAppItineraryMessage());
        setShowConfirmationDialog(true);
      }
    } catch (err) {
      console.error('Error sending email:', err);
      toast.error('Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Scroll-based sticky logic - from room selector until day planner bottom reaches viewport bottom
  useEffect(() => {
    const handleScroll = () => {
      const roomSelector = document.getElementById('room-selector-section');
      const dayPlannerSection = document.getElementById('day-planner-section');
      
      if (!roomSelector) {
        setShouldBeSticky(false);
        return;
      }

      const roomRect = roomSelector.getBoundingClientRect();
      const dayPlannerRect = dayPlannerSection?.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Start: When room selector enters view
      const hasEnteredRoomSelector = roomRect.top < viewportHeight;
      
      // End: When day planner bottom reaches 30% up from viewport bottom (i.e., at 70% of viewport height)
      const threshold = viewportHeight * 0.7;
      const dayPlannerBottomReached = dayPlannerRect ? dayPlannerRect.bottom <= threshold : false;

      // Show sticky when room selector is in view and day planner bottom hasn't reached viewport bottom
      const shouldShow = hasEnteredRoomSelector && !dayPlannerBottomReached;
      
      setShouldBeSticky(shouldShow);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Unified collapsible sticky version for all devices */}
      <div 
        className={`${
          shouldBeSticky 
            ? 'fixed bottom-0 left-0 right-0 z-50' 
            : ''
        }`}
      >
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className={`bg-background border-t border-border shadow-2xl ${shouldBeSticky ? '' : 'rounded-2xl border shadow-lg'}`}>
            {/* Collapsed header - always visible */}
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">Total Estimate</span>
                  <span className="text-2xl font-bold text-wave-orange">
                    ₹{breakdown.grandTotal.toLocaleString()}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>

            {/* Expanded content */}
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
                {/* Room costs */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rooms ({nights} nights)</span>
                  <span className="font-medium text-foreground">₹{breakdown.roomsTotal.toLocaleString()}</span>
                </div>
                
                {/* Activities */}
                {breakdown.activitiesTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Activities</span>
                    <span className="font-medium text-foreground">₹{breakdown.activitiesTotal.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Transport */}
                {breakdown.transportTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transport</span>
                    <span className="font-medium text-foreground">₹{breakdown.transportTotal.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Scooter */}
                {breakdown.scooterTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Two Wheeler</span>
                    <span className="font-medium text-foreground">₹{breakdown.scooterTotal.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">₹{breakdown.subtotal.toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Discount */}
                {breakdown.discount > 0 && (
                  <div className="flex justify-between text-sm text-accent">
                    <span className="flex items-center gap-1">
                      <BadgePercent className="w-4 h-4" />
                      Discount ({breakdown.discountPercentage}%)
                    </span>
                    <span className="font-medium">-₹{breakdown.discount.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Discount hint */}
                {breakdown.discountPercentage === 0 && nights > 0 && nights < 3 && (
                  <div className="p-3 bg-wave-orange/10 rounded-xl border border-wave-orange/20">
                    <p className="text-xs text-wave-orange font-medium">
                      💡 Stay 3+ nights for 10% off!
                    </p>
                  </div>
                )}

                {/* Guest details warning */}
                {isValid && !areGuestDetailsValid && (
                  <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Please fill in your name, email, and phone number above to enable download and send options.
                    </p>
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={onBookNow}
                    disabled={!canUseActions}
                    className="w-full py-4 bg-wave-orange text-primary-foreground font-bold rounded-xl hover:bg-wave-orange/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Send via WhatsApp
                  </button>

                  {/* Send via Email button */}
                  <button
                    onClick={handleSendEmail}
                    disabled={!canUseActions || isSendingEmail}
                    className="w-full py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Send via Email
                  </button>
                  
                  {/* Download PDF button */}
                  <button
                    onClick={handleExportPdf}
                    disabled={!canUseActions || isSendingEmail}
                    className="w-full py-3 bg-foreground/10 text-foreground font-semibold rounded-xl hover:bg-foreground/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download PDF
                  </button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Prices are estimates. Final rates may vary seasonally.
                </p>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* Spacer for when sticky is active */}
      {shouldBeSticky && (
        <div className="h-20" />
      )}

      {/* Confirmation Dialog */}
      <ItineraryConfirmationDialog 
        open={showConfirmationDialog} 
        onOpenChange={setShowConfirmationDialog}
        itineraryMessage={itineraryMessage}
      />
    </>
  );
};

export default PriceSummary;
