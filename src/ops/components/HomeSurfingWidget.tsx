import { useNavigate } from 'react-router-dom';
import { useBoardRentals, useSurfLessons, useSurfSchools, useGuestStays } from '../hooks/useSurfing';
import { Card, CardContent } from '@/components/ui/card';
import { Waves } from 'lucide-react';
import { useMemo } from 'react';

export default function HomeSurfingWidget() {
  const navigate = useNavigate();
  const { data: rentals = [] } = useBoardRentals();
  const { data: lessons = [] } = useSurfLessons();
  const { data: schools = [] } = useSurfSchools();
  const { data: stays = [] } = useGuestStays();

  const unpaidRentals = rentals.filter(r => !r.is_paid).reduce((s, r) => s + r.amount_due, 0);
  const unpaidCommissions = lessons.filter(l => !l.is_paid).reduce((s, l) => s + l.total_commission, 0);
  const totalRevenue = rentals.reduce((s, r) => s + r.amount_due, 0) + lessons.reduce((s, l) => s + l.total_fees, 0);

  // Check for unreturned boards > 48h
  const unreturnedCount = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return rentals.filter(r => {
      const rentalTime = new Date(r.rental_date).getTime();
      return r.boards_returned < r.num_boards && rentalTime < cutoff;
    }).length;
  }, [rentals]);

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => navigate('/ops/surfing')}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Waves className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Surfing</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">₹{totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${unpaidRentals > 0 ? 'text-orange-600' : ''}`}>₹{unpaidRentals.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Rentals Owed</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${unpaidCommissions > 0 ? 'text-orange-600' : ''}`}>₹{unpaidCommissions.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Comm. Owed</p>
          </div>
        </div>
        {unreturnedCount > 0 && (
          <p className="text-[10px] text-destructive font-medium mt-1.5">⚠️ {unreturnedCount} rental(s) with unreturned boards (&gt;48h)</p>
        )}
      </CardContent>
    </Card>
  );
}
