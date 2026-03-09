import jsPDF from 'jspdf';
import { GuestEntry } from '../hooks/useGuestLog';
import { format, parseISO } from 'date-fns';

export function exportCFormPDF(guests: GuestEntry[], propertyName = 'Wavealokam Edava') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(14);
  doc.text('Form C - Guest Register', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.text(propertyName, pageWidth / 2, 18, { align: 'center' });
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, pageWidth / 2, 23, { align: 'center' });

  const headers = ['#', 'Guest Name', 'Nationality', 'Passport/ID', 'Address', 'Arrived From', 'Room', 'Check-In', 'Check-Out', 'Adults', 'Children', 'Purpose'];
  const colWidths = [8, 35, 22, 25, 40, 25, 12, 22, 22, 12, 12, 20];
  let y = 30;

  // Header row
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let x = 5;
  headers.forEach((h, i) => {
    doc.rect(x, y, colWidths[i], 7);
    doc.text(h, x + 1, y + 5);
    x += colWidths[i];
  });
  y += 7;

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  
  guests.forEach((g, idx) => {
    if (y > 190) {
      doc.addPage();
      y = 15;
      // Repeat headers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      let hx = 5;
      headers.forEach((h, i) => {
        doc.rect(hx, y, colWidths[i], 7);
        doc.text(h, hx + 1, y + 5);
        hx += colWidths[i];
      });
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
    }

    const row = [
      String(idx + 1),
      g.guest_name,
      g.nationality || (g.guest_type === 'domestic' ? 'Indian' : '-'),
      g.passport_number || g.id_proof_type || '-',
      [g.address, g.city, g.state].filter(Boolean).join(', ') || '-',
      g.arriving_from || '-',
      g.room_id || '-',
      format(parseISO(g.check_in_at), 'dd/MM/yy HH:mm'),
      g.check_out_at ? format(parseISO(g.check_out_at), 'dd/MM/yy HH:mm') : '-',
      String(g.adults),
      String(g.children),
      g.purpose || '-',
    ];

    x = 5;
    row.forEach((cell, i) => {
      doc.rect(x, y, colWidths[i], 6);
      const trimmed = cell.length > Math.floor(colWidths[i] / 1.8) ? cell.slice(0, Math.floor(colWidths[i] / 1.8)) + '..' : cell;
      doc.text(trimmed, x + 1, y + 4.5);
      x += colWidths[i];
    });
    y += 6;
  });

  doc.save(`CForm_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
