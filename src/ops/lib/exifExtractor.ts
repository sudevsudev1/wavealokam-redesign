import exifr from 'exifr';

export interface PhotoMetadata {
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
  device: string | null;
  raw: Record<string, unknown>;
}

export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  const result: PhotoMetadata = {
    takenAt: null,
    lat: null,
    lng: null,
    device: null,
    raw: {},
  };

  try {
    const exif = await exifr.parse(file, {
      gps: true,
      pick: [
        'DateTimeOriginal', 'CreateDate', 'ModifyDate',
        'GPSLatitude', 'GPSLongitude',
        'Make', 'Model', 'Software',
        'ImageWidth', 'ImageHeight',
      ],
    });

    if (!exif) return result;

    // Timestamp
    const dateField = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
    if (dateField instanceof Date) {
      result.takenAt = dateField.toISOString();
    }

    // GPS
    if (typeof exif.latitude === 'number') result.lat = exif.latitude;
    if (typeof exif.longitude === 'number') result.lng = exif.longitude;

    // Device
    const parts = [exif.Make, exif.Model].filter(Boolean);
    if (parts.length) result.device = parts.join(' ');

    result.raw = exif;
  } catch {
    // EXIF extraction failed (e.g. PDF or unsupported format) — return defaults
  }

  return result;
}
