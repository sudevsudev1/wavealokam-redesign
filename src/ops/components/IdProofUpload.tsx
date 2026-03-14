import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface IdProofSlot {
  label: string;
  required: boolean;
  file: File | null;
  existingUrl?: string;
}

export type IdProofType = 'Aadhaar' | 'Passport' | 'Driving License' | 'Voter ID';

export function getIdProofSlots(
  idType: IdProofType | string,
  guestType: 'domestic' | 'international',
  guestNumber: number = 1
): IdProofSlot[] {
  const prefix = guestNumber > 1 ? `Guest ${guestNumber} – ` : '';
  
  switch (idType) {
    case 'Aadhaar':
      return [
        { label: `${prefix}Aadhaar Front`, required: true, file: null },
        { label: `${prefix}Aadhaar Back`, required: true, file: null },
      ];
    case 'Passport':
      if (guestType === 'international') {
        return [
          { label: `${prefix}Passport Main Page`, required: true, file: null },
          { label: `${prefix}Visa Page`, required: true, file: null },
        ];
      }
      return [
        { label: `${prefix}Passport Main Page`, required: true, file: null },
        { label: `${prefix}Additional Page`, required: false, file: null },
      ];
    case 'Driving License':
      return [
        { label: `${prefix}Driving License`, required: true, file: null },
      ];
    case 'Voter ID':
      return [
        { label: `${prefix}Voter ID`, required: true, file: null },
      ];
    default:
      return [
        { label: `${prefix}ID Proof`, required: true, file: null },
      ];
  }
}

export function getMaxGuests(): number {
  return 3;
}

export function areRequiredSlotsFilled(slots: IdProofSlot[]): boolean {
  return slots.filter(s => s.required).every(s => s.file !== null || s.existingUrl);
}

interface IdProofUploadProps {
  slots: IdProofSlot[];
  onSlotsChange: (slots: IdProofSlot[]) => void;
  compact?: boolean;
}

export default function IdProofUpload({ slots, onSlotsChange, compact }: IdProofUploadProps) {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleFileChange = (index: number, file: File | null) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], file };
    onSlotsChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], file: null, existingUrl: undefined };
    onSlotsChange(updated);
  };

  const handleCamera = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0] || null;
      if (f) handleFileChange(index, f);
    };
    input.click();
  };

  if (slots.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">ID Proof Photos</p>
      {slots.map((slot, i) => {
        const isFilled = !!slot.file || !!slot.existingUrl;
        return (
          <div key={`${slot.label}-${i}`} className="border rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isFilled ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : slot.required ? (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                ) : null}
                <span className="text-xs font-medium">{slot.label}</span>
                {slot.required ? (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 text-destructive border-destructive/30">Required</Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">Optional</Badge>
                )}
              </div>
              {isFilled && (
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => handleRemove(i)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isFilled ? (
              <div className="flex items-center gap-2">
                {slot.file ? (
                  <img
                    src={URL.createObjectURL(slot.file)}
                    alt={slot.label}
                    className="h-12 w-16 object-cover rounded border"
                  />
                ) : slot.existingUrl ? (
                  <img src={slot.existingUrl} alt={slot.label} className="h-12 w-16 object-cover rounded border" />
                ) : null}
                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                  {slot.file?.name || 'Uploaded'}
                </span>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-[11px] flex-1" onClick={() => handleCamera(i)}>
                  <Camera className="h-3 w-3 mr-1" />Camera
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[11px] flex-1" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0] || null;
                    if (f) handleFileChange(i, f);
                  };
                  input.click();
                }}>
                  <Upload className="h-3 w-3 mr-1" />Upload
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
