import jsPDF from 'jspdf';
import { toast } from 'sonner';

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Copied to clipboard');
  }).catch(() => {
    toast.error('Failed to copy');
  });
}

export function printToPdf(title: string, rows: string[][]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  
  let y = 36;
  const lineHeight = 6;
  const pageHeight = doc.internal.pageSize.height - 20;

  for (const row of rows) {
    if (y > pageHeight) {
      doc.addPage();
      y = 20;
    }
    const line = row.join('  |  ');
    doc.text(line, 14, y);
    y += lineHeight;
  }

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success('PDF saved');
}

export function formatTasksForCopy(tasks: Array<{ title: string; status: string; priority: string; assignee?: string; due?: string }>) {
  return tasks.map((t, i) => 
    `${i + 1}. ${t.title} [${t.status}] [${t.priority}]${t.assignee ? ` → ${t.assignee}` : ''}${t.due ? ` (Due: ${t.due})` : ''}`
  ).join('\n');
}

export function formatListForCopy(items: Array<{ name: string; qty: number; unit: string; done: boolean }>) {
  return items.map((item, i) =>
    `${item.done ? '✓' : '○'} ${i + 1}. ${item.name} — ${item.qty} ${item.unit}`
  ).join('\n');
}
