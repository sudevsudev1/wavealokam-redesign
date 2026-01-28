import { useState, useEffect, useRef } from 'react';
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
  hasDates?: boolean;
}

const PriceSummary = ({ breakdown, nights, onBookNow, isValid, bookingState, hasDates = false }: PriceSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [shouldBeSticky, setShouldBeSticky] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = () => {
    if (bookingState) {
      exportItineraryPdf(bookingState, breakdown);
    }
  };

  // Scroll-based sticky logic for mobile/tablet
  useEffect(() => {
    const handleScroll = () => {
      const itinerarySection = document.getElementById('itinerary');
      const roomSelector = document.getElementById('room-selector-section');
      
      if (!itinerarySection || !roomSelector) {
        setShouldBeSticky(false);
        return;
      }

      const itineraryRect = itinerarySection.getBoundingClientRect();
      const roomRect = roomSelector.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Should be sticky when:
      // 1. Itinerary section is in view (top is above viewport bottom, bottom is below viewport top)
      // 2. Room selector top hasn't reached the top of viewport yet
      const isItineraryInView = itineraryRect.top < viewportHeight && itineraryRect.bottom > 0;
      const isRoomSelectorBelowTop = roomRect.top > 0;

      setShouldBeSticky(hasDates && isItineraryInView && isRoomSelectorBelowTop);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasDates]);

  // Determine opacity based on state
  const getOpacity = () => {
    if (isExpanded || isHovered) return 1;
    return 0.5;
  };

  // Desktop: static in grid layout
  // Mobile/Tablet: sticky at bottom when conditions met
  const isMobileSticky = shouldBeSticky && typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      {/* Desktop version - static in grid */}
      <div 
        ref={containerRef}
        className="hidden lg:block md:sticky md:top-24 bg-white rounded-2xl p-6 border border-border shadow-lg"
      >
        <h3 className="text-xl font-bold text-foreground mb-4">Price Estimate</h3>
        
        <div className="space-y-3 mb-6">
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
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <BadgePercent className="w-4 h-4" />
                Discount ({breakdown.discountPercentage}%)
              </span>
              <span className="font-medium">-₹{breakdown.discount.toLocaleString()}</span>
            </div>
          )}
          
          {/* Grand total */}
          <div className="border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Total Estimate</span>
              <span className="text-2xl font-bold text-wave-orange">
                ₹{breakdown.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        
        {/* Discount hint */}
        {breakdown.discountPercentage === 0 && nights > 0 && nights < 3 && (
          <div className="mb-4 p-3 bg-wave-orange/10 rounded-xl border border-wave-orange/20">
            <p className="text-xs text-wave-orange font-medium">
              💡 Stay 3+ nights for 10% off!
            </p>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={onBookNow}
            disabled={!isValid}
            className="w-full py-4 bg-wave-orange text-white font-bold rounded-xl hover:bg-wave-orange/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
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
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          Prices are estimates. Final rates may vary seasonally.
        </p>
      </div>

      {/* Mobile/Tablet version - collapsible sticky at bottom */}
      <div 
        className={`lg:hidden ${
          shouldBeSticky 
            ? 'fixed bottom-0 left-0 right-0 z-50' 
            : ''
        }`}
        style={{ 
          opacity: shouldBeSticky ? getOpacity() : 1,
          transition: 'opacity 0.3s ease'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className={`bg-white border-t border-border shadow-2xl ${shouldBeSticky ? '' : 'rounded-2xl border shadow-lg'}`}>
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
                  <div className="flex justify-between text-sm text-green-600">
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
                    className="w-full py-4 bg-wave-orange text-white font-bold rounded-xl hover:bg-wave-orange/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
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

      {/* Spacer for when sticky is active on mobile */}
      {shouldBeSticky && (
        <div className="lg:hidden h-20" />
      )}
    </>
  );
};

export default PriceSummary;
