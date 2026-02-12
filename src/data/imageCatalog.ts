/**
 * Central image catalog mapping every site image to descriptive metadata.
 * Used by gallery components for alt text and by Drifter for contextual image awareness.
 */

export interface CatalogImage {
  path: string;
  title: string;
  alt: string;
  tags: string[];
}

export interface CatalogFolder {
  id: string;
  folderTitle: string;
  description?: string;
  images: CatalogImage[];
}

// ─── ROOFTOP ────────────────────────────────────────────────
export const rooftopImages: CatalogImage[] = [
  {
    path: '/gallery/rooftop/rooftop01.webp',
    title: 'Main lounge area during sunset',
    alt: 'Wavealokam rooftop main lounge area bathed in golden sunset light',
    tags: ['rooftop', 'sunset', 'lounge', 'views'],
  },
  {
    path: '/gallery/rooftop/rooftop02.webp',
    title: 'Group of friends chilling over dinner and drinks in the main lounge',
    alt: 'Group of friends chatting and laughing over dinner and drinks at the rooftop group lounge area',
    tags: ['rooftop', 'group', 'dinner', 'friends', 'social'],
  },
  {
    path: '/gallery/rooftop/rooftop03.webp',
    title: 'Couples corner with fairy lights — special occasion dinner with complimentary cake',
    alt: 'Romantic couples corner decorated with fairy lights for a special occasion dinner with complimentary cake from Wavealokam',
    tags: ['rooftop', 'couples', 'romantic', 'fairy-lights', 'celebration', 'cake'],
  },
  {
    path: '/gallery/rooftop/rooftop04.webp',
    title: 'Couple enjoying date night from private ocean view side',
    alt: 'Couple on a romantic date night at the private ocean view side of the rooftop',
    tags: ['rooftop', 'couples', 'date-night', 'ocean-view', 'romantic'],
  },
  {
    path: '/gallery/rooftop/rooftop05.webp',
    title: 'Couple stargazing from private ocean view side',
    alt: 'Couple stargazing together from the private ocean view side of the rooftop, a life-changing experience',
    tags: ['rooftop', 'couples', 'stargazing', 'ocean-view', 'romantic', 'night'],
  },
  {
    path: '/gallery/rooftop/rooftop06.webp',
    title: 'The exact moment a couple knew they were falling in love — private ocean view side',
    alt: 'Intimate moment of a couple falling in love at the private ocean view side of the Wavealokam rooftop',
    tags: ['rooftop', 'couples', 'love', 'ocean-view', 'romantic', 'intimate'],
  },
  {
    path: '/gallery/rooftop/rooftop07.webp',
    title: 'Special occasion celebration — customized romantic display for guests on romantic getaway',
    alt: 'Beautifully customized romantic celebration display on the Wavealokam rooftop for guests on a romantic getaway',
    tags: ['rooftop', 'celebration', 'romantic', 'decoration', 'special-occasion'],
  },
];

// ─── PLACEHOLDER FOLDERS (to be filled with descriptions) ───
export const exteriorImages: CatalogImage[] = [
  { path: '/gallery/exterior/exterior02.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior05.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior03a.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior03b.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior03c.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior04.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior03.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior06.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior09.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
  { path: '/gallery/exterior/exterior11.webp', title: 'Exterior view', alt: 'Wavealokam exterior', tags: ['exterior'] },
];

export const surfingImages: CatalogImage[] = [
  { path: '/activities/surfing-new/1.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a09.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a05.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a04.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a03.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a06.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a07.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a08.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a02.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a10.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a11.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/a01.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/2.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/3.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/4.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/5.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/6.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/7.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/8.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/9.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing-new/10.webp', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing/1.jpg', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing/2.jpg', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing/3.jpg', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing/4.jpg', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing/5.jpg', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
  { path: '/activities/surfing/6.jpg', title: 'Surfing', alt: 'Surfing at Varkala', tags: ['surfing'] },
];

export const doubleRoomImages: CatalogImage[] = [
  { path: '/rooms/double-room/1.png', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
  { path: '/rooms/double-room/2.jpeg', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
  { path: '/rooms/double-room/3.png', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
  { path: '/rooms/double-room/4.png', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
  { path: '/rooms/double-room/5.png', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
  { path: '/rooms/double-room/6.png', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
  { path: '/rooms/double-room/7.png', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
  { path: '/rooms/double-room/8.png', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
  { path: '/rooms/double-room/9.png', title: 'Double room', alt: 'Wavealokam double room', tags: ['room', 'double'] },
];

export const kingRoomImages: CatalogImage[] = [
  { path: '/rooms/king-room/1.png', title: 'King room', alt: 'Wavealokam king room', tags: ['room', 'king'] },
  { path: '/rooms/king-room/2.png', title: 'King room', alt: 'Wavealokam king room', tags: ['room', 'king'] },
  { path: '/rooms/king-room/3.png', title: 'King room', alt: 'Wavealokam king room', tags: ['room', 'king'] },
  { path: '/rooms/king-room/4.png', title: 'King room', alt: 'Wavealokam king room', tags: ['room', 'king'] },
  { path: '/rooms/king-room/5.png', title: 'King room', alt: 'Wavealokam king room', tags: ['room', 'king'] },
  { path: '/rooms/king-room/6.png', title: 'King room', alt: 'Wavealokam king room', tags: ['room', 'king'] },
];

export const legendsImages: CatalogImage[] = [
  { path: '/gallery/legends/legends01.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends02.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends03.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends04.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends05.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends06.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends07.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends08.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends09.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends10.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends11.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends12.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends13.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends14.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends15.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends16.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends17.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
  { path: '/gallery/legends/legends18.webp', title: 'Legend guest', alt: 'Wavealokam returning guest', tags: ['legends', 'guests'] },
];

// ─── FULL CATALOG ───────────────────────────────────────────
export const galleryCatalog: CatalogFolder[] = [
  {
    id: 'rooftop',
    folderTitle: 'Rooftop: Beach Views Without Beach Prices',
    description: "We're not ON the beach, we're strategically NEAR it. The rooftop vibes make up for the 180-meter walk.",
    images: rooftopImages,
  },
  {
    id: 'exterior',
    folderTitle: 'Exterior',
    description: 'First impressions that justify the flight. Click responsibly',
    images: exteriorImages,
  },
  {
    id: 'surfing',
    folderTitle: 'Surfing',
    description: "Therapy But Wetter - 10-12 sessions till you're decent. One session till you're hooked.",
    images: surfingImages,
  },
  {
    id: 'double-room',
    folderTitle: 'Double Room',
    description: "Compact Luxury - Everything you need, nothing you don't. The beautiful rooftop is our living room anyway.",
    images: doubleRoomImages,
  },
  {
    id: 'king-room',
    folderTitle: 'King Room',
    description: "Maximum space, maximum comfort, minimum chance you'll want to check out.",
    images: kingRoomImages,
  },
  {
    id: 'legends',
    folderTitle: 'The Legends',
    description: "Loyalty Report Card - A+ to returnees. Incomplete to you, who wrote \"definitely returning soon\" in your review two years ago... Your homework's overdue. Can't you though?",
    images: legendsImages,
  },
];

/**
 * Lookup helper — find a catalog image by its path.
 */
export function getCatalogImage(path: string): CatalogImage | undefined {
  for (const folder of galleryCatalog) {
    const found = folder.images.find((img) => img.path === path);
    if (found) return found;
  }
  return undefined;
}

/**
 * Build a Drifter-friendly text block describing every catalogued image
 * so the chatbot knows which photo to show for contextual queries.
 */
export function buildDrifterImageContext(): string {
  const lines: string[] = [
    'ROOFTOP GALLERY PHOTOS (when discussing rooftop views, lounge, couples corner, stargazing, romantic setups, special occasions on the rooftop):',
    'Drifter: you know what each photo shows — pick the RIGHT one based on context.',
  ];
  for (const img of rooftopImages) {
    lines.push(`- ![${img.title}](${img.path}) — ${img.alt}. Tags: ${img.tags.join(', ')}`);
  }
  return lines.join('\n');
}
