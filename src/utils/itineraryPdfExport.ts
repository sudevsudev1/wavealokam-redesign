import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { BookingState, PriceBreakdown, ACTIVITIES, ActivitySelection } from '@/types/booking';
import { GuestDetails } from '@/components/booking/GuestDetailsForm';

const formatSelection = (selection: ActivitySelection | null, guests: number): { name: string; subtext: string; details: string } | null => {
  if (!selection) return null;
  const activity = ACTIVITIES.find(a => a.id === selection.activityId);
  if (!activity) return null;
  
  let details = '';
  if (activity.perPerson && selection.participants > 0) {
    const total = activity.price * selection.participants;
    details = `${selection.participants} person${selection.participants > 1 ? 's' : ''} - Rs.${total.toLocaleString()}`;
  } else if (activity.price > 0) {
    details = `Rs.${activity.price.toLocaleString()}`;
  } else {
    details = 'Free';
  }
  
  if (selection.transport) {
    const transportCost = activity.transportOptions?.[selection.transport] || 0;
    if (transportCost > 0) {
      details += ` + ${selection.transport === 'auto' ? 'Auto' : 'Cab'} Rs.${transportCost}`;
    }
  }
  
  return {
    name: activity.name,
    subtext: activity.subtext || '',
    details
  };
};

export const generatePlainTextItinerary = (bookingState: BookingState, breakdown: PriceBreakdown, guestDetails?: GuestDetails): string => {
  const lines: string[] = [];
  
  // Guest details
  if (guestDetails) {
    lines.push('=== GUEST DETAILS ===');
    lines.push(`Name: ${guestDetails.name}`);
    lines.push(`Email: ${guestDetails.email}`);
    lines.push(`Phone: ${guestDetails.phone}`);
    lines.push('');
  }
  
  // Trip details
  lines.push('=== TRIP DETAILS ===');
  const checkInStr = bookingState.checkIn ? format(bookingState.checkIn, 'EEE, dd MMM yyyy') : 'Not selected';
  const checkOutStr = bookingState.checkOut ? format(bookingState.checkOut, 'EEE, dd MMM yyyy') : 'Not selected';
  const nights = bookingState.dayPlans.length > 0 ? bookingState.dayPlans.length - 1 : 0;
  
  lines.push(`Check-in: ${checkInStr}`);
  lines.push(`Check-out: ${checkOutStr}`);
  lines.push(`Guests: ${bookingState.guests}`);
  lines.push(`Nights: ${nights}`);
  
  const roomsText = [];
  if (bookingState.rooms.kingRooms > 0) roomsText.push(`${bookingState.rooms.kingRooms} King Room${bookingState.rooms.kingRooms > 1 ? 's' : ''}`);
  if (bookingState.rooms.doubleRooms > 0) roomsText.push(`${bookingState.rooms.doubleRooms} Double Room${bookingState.rooms.doubleRooms > 1 ? 's' : ''}`);
  if (bookingState.rooms.extraBeds > 0) roomsText.push(`${bookingState.rooms.extraBeds} Extra Bed${bookingState.rooms.extraBeds > 1 ? 's' : ''}`);
  lines.push(`Accommodation: ${roomsText.join(', ') || 'Not selected'}`);
  
  if (bookingState.scooterDays > 0) {
    lines.push(`Two Wheeler: ${bookingState.scooterDays} day${bookingState.scooterDays > 1 ? 's' : ''}`);
  }
  lines.push('');
  
  // Daily itinerary
  if (bookingState.dayPlans.length > 0) {
    lines.push('=== DAILY ITINERARY ===');
    
    bookingState.dayPlans.forEach((dayPlan, index) => {
      const isCheckInDay = index === 0;
      const isCheckOutDay = index === bookingState.dayPlans.length - 1;
      
      const dayLabel = `Day ${index + 1} - ${format(dayPlan.date, 'EEE, dd MMM')}`;
      const dayNote = isCheckInDay ? ' (Check-in 2 PM)' : isCheckOutDay ? ' (Check-out 11 AM)' : '';
      lines.push('');
      lines.push(dayLabel + dayNote);
      lines.push('-'.repeat(30));
      
      const slots: { label: string; selection: ActivitySelection | null }[] = [];
      
      if (!isCheckInDay) {
        slots.push({ label: 'Morning', selection: dayPlan.morning });
      }
      if (!isCheckOutDay) {
        slots.push({ label: 'Afternoon', selection: dayPlan.afternoon });
        slots.push({ label: 'Evening', selection: dayPlan.evening });
        slots.push({ label: 'Night', selection: dayPlan.night });
      }
      
      slots.forEach(({ label, selection }) => {
        const formatted = formatSelection(selection, bookingState.guests);
        if (formatted) {
          let activityText = formatted.name;
          if (formatted.subtext) activityText += ` ${formatted.subtext}`;
          lines.push(`  ${label}: ${activityText} - ${formatted.details}`);
        }
      });
    });
    lines.push('');
  }
  
  // Price summary
  lines.push('=== PRICE ESTIMATE ===');
  lines.push(`Rooms (${nights} nights): Rs.${breakdown.roomsTotal.toLocaleString()}`);
  if (breakdown.activitiesTotal > 0) lines.push(`Activities: Rs.${breakdown.activitiesTotal.toLocaleString()}`);
  if (breakdown.transportTotal > 0) lines.push(`Transport: Rs.${breakdown.transportTotal.toLocaleString()}`);
  if (breakdown.scooterTotal > 0) lines.push(`Two Wheeler: Rs.${breakdown.scooterTotal.toLocaleString()}`);
  if (breakdown.discount > 0) lines.push(`Discount (${breakdown.discountPercentage}%): -Rs.${breakdown.discount.toLocaleString()}`);
  lines.push(`TOTAL ESTIMATE: Rs.${breakdown.grandTotal.toLocaleString()}`);
  lines.push('');
  lines.push('Prices are estimates. Final rates may vary seasonally.');
  
  return lines.join('\n');
};

export const exportItineraryPdf = (bookingState: BookingState, breakdown: PriceBreakdown, guestDetails?: GuestDetails): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Helper to add new page if needed
  const checkNewPage = (height: number) => {
    if (y + height > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setFillColor(255, 130, 53); // wave-orange
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('WAVEALOKAM', margin, 28);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Your Varkala Itinerary', margin, 38);
  
  y = 55;

  // Disclaimer Section
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  
  const disclaimer = 'Disclaimer: this document is still aspirational fiction, NOT confirmation - a gorgeous mirage, a potential timeline, organized daydreaming. Your ideal Varkala days exist only in the theoretical realm until you perform the ancient ritual of "booking" - via phone, WhatsApp, or OTA. We provide the vision. You provide the commitment. Teamwork.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 4 + 10;

  // Guest Details Section (if provided)
  if (guestDetails) {
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GUEST DETAILS', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'FD');
    
    y += 10;
    doc.text(`Name: ${guestDetails.name}`, margin + 5, y);
    y += 8;
    doc.text(`Email: ${guestDetails.email}`, margin + 5, y);
    doc.text(`Phone: ${guestDetails.phone}`, pageWidth / 2, y);
    y += 17;
  }

  // Trip Details Section
  doc.setTextColor(51, 51, 51);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TRIP DETAILS', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const checkInStr = bookingState.checkIn ? format(bookingState.checkIn, 'EEE, dd MMM yyyy') : 'Not selected';
  const checkOutStr = bookingState.checkOut ? format(bookingState.checkOut, 'EEE, dd MMM yyyy') : 'Not selected';
  const nights = bookingState.dayPlans.length > 0 ? bookingState.dayPlans.length - 1 : 0;
  
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'FD');
  
  y += 10;
  doc.text(`Check-in: ${checkInStr}`, margin + 5, y);
  doc.text(`Check-out: ${checkOutStr}`, pageWidth / 2, y);
  y += 8;
  doc.text(`Guests: ${bookingState.guests}`, margin + 5, y);
  doc.text(`Nights: ${nights}`, pageWidth / 2, y);
  y += 8;
  
  let roomsText = [];
  if (bookingState.rooms.kingRooms > 0) roomsText.push(`${bookingState.rooms.kingRooms} King Room${bookingState.rooms.kingRooms > 1 ? 's' : ''}`);
  if (bookingState.rooms.doubleRooms > 0) roomsText.push(`${bookingState.rooms.doubleRooms} Double Room${bookingState.rooms.doubleRooms > 1 ? 's' : ''}`);
  if (bookingState.rooms.extraBeds > 0) roomsText.push(`${bookingState.rooms.extraBeds} Extra Bed${bookingState.rooms.extraBeds > 1 ? 's' : ''}`);
  doc.text(`Accommodation: ${roomsText.join(', ') || 'Not selected'}`, margin + 5, y);
  
  if (bookingState.scooterDays > 0) {
    doc.text(`Two Wheeler: ${bookingState.scooterDays} day${bookingState.scooterDays > 1 ? 's' : ''}`, pageWidth / 2, y);
  }
  
  y += 20;

  // Daily Itinerary Section
  if (bookingState.dayPlans.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DAILY ITINERARY', margin, y);
    y += 10;

    bookingState.dayPlans.forEach((dayPlan, index) => {
      checkNewPage(50);
      
      const isCheckInDay = index === 0;
      const isCheckOutDay = index === bookingState.dayPlans.length - 1;
      
      // Day header
      doc.setFillColor(255, 130, 53);
      doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const dayLabel = `Day ${index + 1} - ${format(dayPlan.date, 'EEE, dd MMM')}`;
      const dayNote = isCheckInDay ? ' (Check-in 2 PM)' : isCheckOutDay ? ' (Check-out 11 AM)' : '';
      doc.text(dayLabel + dayNote, margin + 3, y + 5.5);
      y += 12;
      
      doc.setTextColor(51, 51, 51);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      const slots: { label: string; selection: ActivitySelection | null }[] = [];
      
      if (!isCheckInDay) {
        slots.push({ label: 'Morning', selection: dayPlan.morning });
      }
      if (!isCheckOutDay) {
        slots.push({ label: 'Afternoon', selection: dayPlan.afternoon });
        slots.push({ label: 'Evening', selection: dayPlan.evening });
        slots.push({ label: 'Night', selection: dayPlan.night });
      }
      
      slots.forEach(({ label, selection }) => {
        const formatted = formatSelection(selection, bookingState.guests);
        if (formatted) {
          checkNewPage(16);
          
          // Activity name column (limited width to prevent overlap)
          const labelWidth = 22;
          const activityWidth = 85;
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${label}:`, margin + 3, y);
          
          doc.setFont('helvetica', 'normal');
          
          // Truncate activity text if too long
          let activityText = formatted.name;
          if (formatted.subtext) {
            activityText += ` ${formatted.subtext}`;
          }
          
          // Split into multiple lines if needed
          const activityLines = doc.splitTextToSize(activityText, activityWidth);
          doc.text(activityLines[0], margin + labelWidth + 3, y);
          
          // Price on the right
          doc.setTextColor(100, 100, 100);
          const priceText = formatted.details;
          doc.text(priceText, pageWidth - margin - 3, y, { align: 'right' });
          doc.setTextColor(51, 51, 51);
          
          // If activity text wrapped, show second line
          if (activityLines.length > 1) {
            y += 5;
            doc.text(activityLines[1], margin + labelWidth + 3, y);
          }
          
          y += 7;
        }
      });
      
      y += 6;
    });
  }

  // Price Summary Section
  const priceLineCount = 1 + 
    (breakdown.activitiesTotal > 0 ? 1 : 0) + 
    (breakdown.transportTotal > 0 ? 1 : 0) + 
    (breakdown.scooterTotal > 0 ? 1 : 0) +
    (breakdown.discount > 0 ? 1 : 0) + 2;
  
  const priceBoxHeight = 20 + priceLineCount * 8;
  
  checkNewPage(priceBoxHeight + 20);
  y += 5;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text('PRICE ESTIMATE', margin, y);
  y += 10;
  
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, y, contentWidth, priceBoxHeight, 3, 3, 'FD');
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const addPriceLine = (label: string, amount: number, isTotal = false) => {
    if (isTotal) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
    }
    doc.text(label, margin + 5, y);
    doc.text(`Rs. ${amount.toLocaleString()}`, pageWidth - margin - 5, y, { align: 'right' });
    if (isTotal) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }
    y += 7;
  };
  
  addPriceLine(`Rooms (${nights} nights)`, breakdown.roomsTotal);
  if (breakdown.activitiesTotal > 0) addPriceLine('Activities', breakdown.activitiesTotal);
  if (breakdown.transportTotal > 0) addPriceLine('Transport', breakdown.transportTotal);
  if (breakdown.scooterTotal > 0) addPriceLine('Two Wheeler', breakdown.scooterTotal);
  
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 5, y, pageWidth - margin - 5, y);
  y += 7;
  
  if (breakdown.discount > 0) {
    doc.setTextColor(34, 139, 34);
    doc.text(`Discount (${breakdown.discountPercentage}%)`, margin + 5, y);
    doc.text(`-Rs. ${breakdown.discount.toLocaleString()}`, pageWidth - margin - 5, y, { align: 'right' });
    doc.setTextColor(51, 51, 51);
    y += 7;
  }
  
  doc.setTextColor(255, 130, 53);
  addPriceLine('Total Estimate', breakdown.grandTotal, true);
  doc.setTextColor(51, 51, 51);

  // Footer
  y = 275;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Prices are estimates. Final rates may vary seasonally.', margin, y);
  doc.text('WhatsApp: +91 8606164606 | wavealokam.com', pageWidth - margin, y, { align: 'right' });

  // Generate filename
  const dateStr = bookingState.checkIn ? format(bookingState.checkIn, 'ddMMMyyyy') : 'draft';
  const filename = `Wavealokam-Itinerary-${dateStr}.pdf`;
  
  // Return base64 for email attachment
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  
  // Also save locally
  doc.save(filename);
  
  return pdfBase64;
};

export const getPdfFileName = (bookingState: BookingState): string => {
  const dateStr = bookingState.checkIn ? format(bookingState.checkIn, 'ddMMMyyyy') : 'draft';
  return `Wavealokam-Itinerary-${dateStr}.pdf`;
};
