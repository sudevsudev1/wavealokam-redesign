import { MessageCircle, BadgePercent } from 'lucide-react';
import { PriceBreakdown } from '@/types/booking';

interface PriceSummaryProps {
  breakdown: PriceBreakdown;
  nights: number;
  onBookNow: () => void;
  isValid: boolean;
}

const PriceSummary = ({ breakdown, nights, onBookNow, isValid }: PriceSummaryProps) => {
  return (
    <div className="sticky top-24 bg-white rounded-2xl p-6 border border-border shadow-lg">
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
      
      {/* Book button */}
      <button
        onClick={onBookNow}
        disabled={!isValid}
        className="w-full py-4 bg-wave-orange text-white font-bold rounded-xl hover:bg-wave-orange/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
      >
        <MessageCircle className="w-5 h-5" />
        Send via WhatsApp
      </button>
      
      <p className="text-xs text-muted-foreground text-center mt-3">
        Prices are estimates. Final rates may vary seasonally.
      </p>
    </div>
  );
};

export default PriceSummary;
