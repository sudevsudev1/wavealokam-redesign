import { PriceBreakdown } from '@/types/booking';
import { MessageCircle, Percent } from 'lucide-react';

interface PriceSummaryProps {
  breakdown: PriceBreakdown;
  nights: number;
  onBookNow: () => void;
  isValid: boolean;
}

const PriceSummary = ({ breakdown, nights, onBookNow, isValid }: PriceSummaryProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl sticky top-24">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Price Summary
      </h3>

      <div className="space-y-3 text-sm">
        {breakdown.roomsTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Accommodation ({nights} nights)</span>
            <span className="font-medium">₹{breakdown.roomsTotal.toLocaleString()}</span>
          </div>
        )}
        
        {breakdown.activitiesTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Activities</span>
            <span className="font-medium">₹{breakdown.activitiesTotal.toLocaleString()}</span>
          </div>
        )}
        
        {breakdown.scooterTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Scooter Rental</span>
            <span className="font-medium">₹{breakdown.scooterTotal.toLocaleString()}</span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">₹{breakdown.subtotal.toLocaleString()}</span>
          </div>
        </div>

        {breakdown.discount > 0 && (
          <div className="flex justify-between text-green-600 bg-green-50 p-2 rounded-lg">
            <span className="flex items-center gap-1">
              <Percent className="w-4 h-4" />
              Discount ({breakdown.discountPercentage}%)
            </span>
            <span className="font-medium">-₹{breakdown.discount.toLocaleString()}</span>
          </div>
        )}

        <div className="border-t-2 border-gray-900 pt-3">
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span className="text-wave-orange">₹{breakdown.grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {breakdown.discountPercentage > 0 && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          🎉 You're saving ₹{breakdown.discount.toLocaleString()} with your {breakdown.discountPercentage}% discount!
        </p>
      )}

      <button
        onClick={onBookNow}
        disabled={!isValid}
        className="w-full mt-6 py-4 bg-wave-orange text-white font-bold text-lg rounded-xl hover:bg-wave-orange-dark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 pulse-glow"
      >
        <MessageCircle className="w-5 h-5" />
        Book on WhatsApp
      </button>

      {!isValid && (
        <p className="text-red-500 text-xs mt-2 text-center">
          Please select dates and ensure room capacity matches guests
        </p>
      )}
    </div>
  );
};

export default PriceSummary;
