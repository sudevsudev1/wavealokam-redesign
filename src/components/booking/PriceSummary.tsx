import { useState, useEffect } from 'react';
import { MessageCircle, BadgePercent, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { PriceBreakdown, BookingState } from '@/types/booking';
import { exportItineraryPdf } from '@/utils/itineraryPdfExport';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PriceSummaryProps {
  breakdown: PriceBreakdown;
  nights: number;
  onBookNow: () => void;
  isValid: boolean;
  bookingState?: BookingState;
}

const PriceSummary = ({ breakdown, nights, onBookNow, isValid, bookingState }: PriceSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldBeSticky, setShouldBeSticky] = useState(false);

  const handleExportPdf = () => {
    if (bookingState) {
      exportItineraryPdf(bookingState, breakdown);
    }
  };

  // Scroll-based sticky logic - from itinerary section until footer
  useEffect(() => {
    const handleScroll = () => {
      const itinerarySection = document.getElementById('itinerary');
      const roomSelector = document.getElementById('room-selector-section');
      const footer = document.querySelector('footer');
      
      if (!itinerarySection) {
        setShouldBeSticky(false);
        return;
      }

      const itineraryRect = itinerarySection.getBoundingClientRect();
      const roomRect = roomSelector?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Start: When itinerary section's top edge crosses into upper half of viewport
      const hasEnteredItinerary = itineraryRect.top < viewportHeight * 0.7;
      
      // End condition 1: Room selector's top edge reaches top of viewport
      const hasReachedRoomSelector = roomRect ? roomRect.top <= 100 : false;
      
      // End condition 2: Footer has entered viewport
      const hasReachedFooter = footerRect ? footerRect.top <= viewportHeight : false;

      // Show sticky when we've entered itinerary and haven't reached either end point
      const shouldShow = hasEnteredItinerary && !hasReachedRoomSelector && !hasReachedFooter;
      
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
                
                {/* Action buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={onBookNow}
                    disabled={!isValid}
                    className="w-full py-4 bg-wave-orange text-primary-foreground font-bold rounded-xl hover:bg-wave-orange/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Send via WhatsApp
                  </button>
                  
                  {bookingState && isValid && (
                    <button
                      onClick={handleExportPdf}
                      className="w-full py-3 bg-foreground/10 text-foreground font-semibold rounded-xl hover:bg-foreground/20 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  )}
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
    </>
  );
};

export default PriceSummary;
