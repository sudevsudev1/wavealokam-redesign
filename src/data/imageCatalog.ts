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
  { path: '/gallery/exterior/exterior02.webp', title: 'Wavealokam night beauty mode', alt: 'Wavealokam property beautifully lit up at night', tags: ['exterior', 'night', 'beauty', 'lighting'] },
  { path: '/gallery/exterior/exterior05.webp', title: 'Wavealokam twilight beauty mode', alt: 'Wavealokam property during twilight with sky turning purple and amber', tags: ['exterior', 'twilight', 'beauty', 'golden-hour'] },
  { path: '/gallery/exterior/exterior03a.webp', title: 'Cozy garden for breakfast, work, and group chats', alt: 'Wavealokam cozy garden area perfect for breakfast, remote work, and group conversations', tags: ['exterior', 'garden', 'breakfast', 'workation', 'social'] },
  { path: '/gallery/exterior/exterior03b.webp', title: 'Guest\'s favourite workation spot — surprisingly comfy round back support', alt: 'Guest called dibs on her favourite workation spot — its round back support is surprisingly comfortable for long sitting hours plus it now has a power source socket', tags: ['exterior', 'garden', 'workation', 'comfort', 'power-socket'] },
  { path: '/gallery/exterior/exterior03c.webp', title: 'Workation spot doubles as gently rocking cradle for naps', alt: 'Favourite workation spot doubles up as a gently rocking cradle with bed for quick breaks and naps', tags: ['exterior', 'garden', 'workation', 'nap', 'cradle', 'relaxation'] },
  { path: '/gallery/exterior/exterior04.webp', title: 'Sunsets are a different colour every evening — orange, pink, violet', alt: 'Wavealokam sunsets are a different colour every evening with variations of orange, pink, and violet', tags: ['exterior', 'sunset', 'colours', 'orange', 'pink', 'violet'] },
  { path: '/gallery/exterior/exterior03.webp', title: 'Staff hard at work behind pretty doors', alt: 'Wavealokam staff working diligently behind the property\'s charming doors', tags: ['exterior', 'staff', 'doors', 'behind-the-scenes'] },
  { path: '/gallery/exterior/exterior06.webp', title: 'Wavealokam sunset colour 2', alt: 'Another stunning sunset colour variation at Wavealokam', tags: ['exterior', 'sunset', 'colours', 'sky'] },
  { path: '/gallery/exterior/exterior09.webp', title: 'Garden looks just as pretty from the rooftop', alt: 'Wavealokam garden viewed from the rooftop looking equally beautiful from above', tags: ['exterior', 'garden', 'rooftop-view', 'aerial'] },
  { path: '/gallery/exterior/exterior11.webp', title: 'Best sleep of life with resident feline boss Tyler', alt: 'Guest having the best sleep of their life with Wavealokam resident feline boss Tyler', tags: ['exterior', 'tyler', 'cat', 'sleep', 'cozy', 'pet'] },
];

export const surfingImages: CatalogImage[] = [
  { path: '/activities/surfing-new/1.webp', title: 'Sudev Nair the morning after a toddy session — if you\'ve been paying attention you\'ll know why', alt: 'Sudev Nair surfing the morning after a toddy session at Varkala', tags: ['surfing', 'sudev', 'toddy', 'humour'] },
  { path: '/activities/surfing-new/a09.webp', title: 'Nothing says brotherly love more than shared wipe outs', alt: 'Two surfers sharing a wipe out moment — brotherly love on the waves at Varkala', tags: ['surfing', 'brothers', 'wipeout', 'bonding'] },
  { path: '/activities/surfing-new/a05.webp', title: 'First time father and first time surfer', alt: 'A new father trying surfing for the first time at Wavealokam surf school', tags: ['surfing', 'beginner', 'father', 'first-time'] },
  { path: '/activities/surfing-new/a04.webp', title: 'Age is just a number', alt: 'Older surfer proving age is just a number on the waves at Varkala', tags: ['surfing', 'age', 'inspiration'] },
  { path: '/activities/surfing-new/a03.webp', title: 'Proud mommy and baby watching daddy try something new and exciting', alt: 'Mother and baby watching from the beach as daddy takes on surfing for the first time', tags: ['surfing', 'family', 'spectators', 'baby'] },
  { path: '/activities/surfing-new/a06.webp', title: 'Family photo after a life-changing spirit-opening surf session', alt: 'Family group photo on the beach after their first transformative surfing session at Wavealokam', tags: ['surfing', 'family', 'group', 'life-changing'] },
  { path: '/activities/surfing-new/a07.webp', title: 'Surfing gives you wings', alt: 'Surfer catching air on a wave at Varkala — surfing gives you wings', tags: ['surfing', 'action', 'air', 'wings'] },
  { path: '/activities/surfing-new/a08.webp', title: 'You have to learn to fall before you fly', alt: 'Surfer falling off the board — learning to fall before you fly at Varkala', tags: ['surfing', 'falling', 'learning', 'beginner'] },
  { path: '/activities/surfing-new/a02.webp', title: 'Theory lessons are mandatory — like the calm before the storm', alt: 'Surf instructor giving mandatory theory lessons on the beach before heading into the water', tags: ['surfing', 'theory', 'lessons', 'instructor', 'beach'] },
  { path: '/activities/surfing-new/a10.webp', title: 'To tell you the truth it\'s not surfing — it\'s flying', alt: 'Surfer gliding on a wave at Varkala — it\'s not surfing, it\'s flying', tags: ['surfing', 'flying', 'action', 'wave'] },
  { path: '/activities/surfing-new/a11.webp', title: 'C\'mon let\'s get into the water already', alt: 'Eager surfers ready to get into the water at Varkala beach', tags: ['surfing', 'excitement', 'beach', 'eager'] },
  { path: '/activities/surfing-new/a01.webp', title: 'Probably the only sport where failing is just as much fun as succeeding', alt: 'Surfer wiping out and laughing — the only sport where failing is just as fun as succeeding', tags: ['surfing', 'fun', 'wipeout', 'laughing'] },
  { path: '/activities/surfing-new/2.webp', title: 'Sudev Nair flexing out of habit', alt: 'Sudev Nair flexing on the beach out of habit at Varkala', tags: ['surfing', 'sudev', 'flexing', 'beach'] },
  { path: '/activities/surfing-new/3.webp', title: 'Sudev Nair during his initial surf days — needed his arm for direction, now he just thinks and the board follows', alt: 'Sudev Nair during early surf days using his arm for direction on the waves', tags: ['surfing', 'sudev', 'progress', 'early-days'] },
  { path: '/activities/surfing-new/4.webp', title: 'Sudev Nair only takes his shirt off when he has dieted for 4 weeks or more', alt: 'Sudev Nair shirtless surfing after a strict 4-week diet', tags: ['surfing', 'sudev', 'shirtless', 'humour', 'diet'] },
  { path: '/activities/surfing-new/5.webp', title: 'Sudev Nair with his ripped back from all that paddling', alt: 'Sudev Nair showing off his ripped back muscles earned from all that paddling', tags: ['surfing', 'sudev', 'fitness', 'paddling'] },
  { path: '/activities/surfing-new/6.webp', title: 'Sudev Nair instructing the photographer to take a picture from top angle', alt: 'Sudev Nair on the surfboard directing the photographer to shoot from above', tags: ['surfing', 'sudev', 'photography', 'humour'] },
  { path: '/activities/surfing-new/7.webp', title: 'Sudev Nair during his initial surf days when foam boards were his thing', alt: 'Sudev Nair riding a foam board during his early surfing days at Varkala', tags: ['surfing', 'sudev', 'foam-board', 'early-days'] },
  { path: '/activities/surfing-new/8.webp', title: 'Sudev and Amardeep playing with Nero and Ishtu after surfing', alt: 'Sudev and Amardeep Nair playing with dogs Nero and Ishtu on the beach after a surf session', tags: ['surfing', 'sudev', 'amardeep', 'dogs', 'nero', 'ishtu', 'beach'] },
  { path: '/activities/surfing-new/9.webp', title: 'Sudev Nair just a few days after switching to hard board', alt: 'Sudev Nair riding a hard board just days after making the switch from foam', tags: ['surfing', 'sudev', 'hard-board', 'progress'] },
  { path: '/activities/surfing-new/10.webp', title: 'Sudev Nair showing off balancing skills mid-ocean with sunglasses', alt: 'Sudev Nair balancing on surfboard in the middle of the ocean wearing sunglasses', tags: ['surfing', 'sudev', 'balance', 'sunglasses', 'ocean'] },
  { path: '/activities/surfing/1.jpg', title: 'Surf brothers strike again', alt: 'The surf brothers back on the waves together at Varkala', tags: ['surfing', 'brothers', 'duo', 'action'] },
  { path: '/activities/surfing/2.jpg', title: 'Defying all odds — standing up in the first session at 65 years of age', alt: '65-year-old guest standing up on surfboard in their very first session at Wavealokam', tags: ['surfing', 'age', 'inspiration', 'first-time', '65'] },
  { path: '/activities/surfing/3.jpg', title: 'Falling into a wave is better than falling into rocks', alt: 'Surfer falling into a wave at Varkala — better than falling into rocks', tags: ['surfing', 'falling', 'wave', 'humour'] },
  { path: '/activities/surfing/4.jpg', title: 'Kids love surfing the most — they balance easily and have a short height to fall from', alt: 'Children surfing at Varkala — they balance easily and have a very short height to fall from', tags: ['surfing', 'kids', 'children', 'balance', 'fun'] },
  { path: '/activities/surfing/5.jpg', title: 'That look when you thought you had it but actually the ocean had you', alt: 'Surfer\'s expression when they thought they had the wave but the ocean had other plans', tags: ['surfing', 'humour', 'wipeout', 'expression'] },
  { path: '/activities/surfing/6.jpg', title: 'Nothing like an exciting surf session for father and daughter bonding', alt: 'Father and daughter bonding over an exciting surf session at Varkala', tags: ['surfing', 'family', 'father', 'daughter', 'bonding'] },
];

export const doubleRoomImages: CatalogImage[] = [
  { path: '/rooms/double-room/1.png', title: 'View from the window of the famed Room 103', alt: 'View from the window of Room 103 at Wavealokam', tags: ['room', 'double', 'view'] },
  { path: '/rooms/double-room/2.jpeg', title: 'This room instantly relaxes me', alt: 'Relaxing double room interior at Wavealokam', tags: ['room', 'double', 'interior'] },
  { path: '/rooms/double-room/3.png', title: 'Our staff when they see a super sweet guest', alt: 'Wavealokam staff welcoming guests', tags: ['room', 'double', 'staff'] },
  { path: '/rooms/double-room/4.png', title: 'Morning rays confusing whether to get up or lay in bed', alt: 'Morning sunlight in Wavealokam double room', tags: ['room', 'double', 'morning'] },
  { path: '/rooms/double-room/5.png', title: 'Coffee tastes better in your private balcony', alt: 'Private balcony coffee at Wavealokam double room', tags: ['room', 'double', 'balcony', 'coffee'] },
  { path: '/rooms/double-room/6.png', title: 'Our housekeeping staff when they see a sweet romantic couple', alt: 'Wavealokam housekeeping staff', tags: ['room', 'double', 'staff'] },
  { path: '/rooms/double-room/7.png', title: 'Night time heart to heart conversations are best enjoyed from the balcony', alt: 'Nighttime balcony view at Wavealokam double room', tags: ['room', 'double', 'balcony', 'night'] },
  { path: '/rooms/double-room/8.png', title: 'Ground floor double room night view', alt: 'Ground floor double room at night at Wavealokam', tags: ['room', 'double', 'night', 'exterior'] },
  { path: '/rooms/double-room/9.png', title: 'There is no right or wrong time to sleep here', alt: 'Cozy double room at Wavealokam', tags: ['room', 'double', 'comfort'] },
];

export const kingRoomImages: CatalogImage[] = [
  { path: '/rooms/king-room/1.png', title: 'Look at all that space!!!', alt: 'Spacious king room interior at Wavealokam', tags: ['room', 'king', 'spacious'] },
  { path: '/rooms/king-room/2.png', title: "Staff shows love — Don't worry there are more towels in the cupboard", alt: 'Towel arrangement by staff in Wavealokam king room', tags: ['room', 'king', 'staff', 'towels'] },
  { path: '/rooms/king-room/3.png', title: 'King room or double room the sun showers affection in equal measure', alt: 'Sunlight streaming into Wavealokam king room', tags: ['room', 'king', 'sunlight', 'morning'] },
  { path: '/rooms/king-room/4.png', title: 'Towel swans for the lovebirds who deserve it', alt: 'Towel swan art in Wavealokam king room for couples', tags: ['room', 'king', 'towel art', 'romantic'] },
  { path: '/rooms/king-room/5.png', title: "King room balconies are somehow even more private — don't ask how", alt: 'Private balcony of Wavealokam king room', tags: ['room', 'king', 'balcony', 'private'] },
  { path: '/rooms/king-room/6.png', title: 'NASA is studying this picture of our King room for its ability to promote instant relaxation', alt: 'Ultra relaxing king room at Wavealokam', tags: ['room', 'king', 'relaxation'] },
];

export const legendsImages: CatalogImage[] = [
  { path: '/gallery/legends/legends01.webp', title: 'Family from Pune leaving happily', alt: 'Happy family from Pune checking out of Wavealokam with big smiles', tags: ['legends', 'guests', 'family', 'pune'] },
  { path: '/gallery/legends/legends02.webp', title: 'Road-tripping couple from Paris taking a well-deserved break', alt: 'Couple on a road trip from Paris relaxing at Wavealokam where they didn\'t have to lift a finger', tags: ['legends', 'guests', 'couple', 'paris', 'roadtrip'] },
  { path: '/gallery/legends/legends03.webp', title: 'Paris couple enjoying Lekha Chechi\'s homely breakfast', alt: 'Road-tripping couple from Paris savouring Lekha Chechi\'s nourishing homely breakfast at Wavealokam', tags: ['legends', 'guests', 'couple', 'paris', 'breakfast', 'food'] },
  { path: '/gallery/legends/legends04.webp', title: 'Guest with Anandhu — selfie debate still unsettled', alt: 'Guest posing with Anandhu — some say Anandhu asked for the selfie, others say the guest insisted because of his exceptional promptness', tags: ['legends', 'guests', 'anandhu', 'staff', 'selfie'] },
  { path: '/gallery/legends/legends05.webp', title: 'Guest loved the food so much they wanted to learn to cook it', alt: 'Wavealokam guest so impressed by the food they asked to learn how to cook it', tags: ['legends', 'guests', 'food', 'cooking'] },
  { path: '/gallery/legends/legends06.webp', title: 'Shy guests break loose after two minutes with Amardeep — AKS magic', alt: 'Guests who were initially too shy to smile break loose two minutes into interacting with Amardeep — the AKS magic effect', tags: ['legends', 'guests', 'amardeep', 'staff', 'aks-magic'] },
  { path: '/gallery/legends/legends07.webp', title: 'Guests revisiting only for the breakfast — rooms too, but breakfast is unique', alt: 'Returning guests who came back specifically for Wavealokam\'s truly unique breakfast experience', tags: ['legends', 'guests', 'returning', 'breakfast', 'food'] },
  { path: '/gallery/legends/legends08.webp', title: 'Guest reading in the balcony', alt: 'Wavealokam guest enjoying a peaceful read on the balcony', tags: ['legends', 'guests', 'balcony', 'reading', 'relaxation'] },
  { path: '/gallery/legends/legends09.webp', title: 'Dhanashree and Kabir brought their relatives on their second visit', alt: 'Returning guests Dhanashree and Kabir brought their relatives along for their second visit to Wavealokam', tags: ['legends', 'guests', 'returning', 'dhanashree', 'kabir', 'family'] },
  { path: '/gallery/legends/legends10.webp', title: 'Dhanashree and Kabir\'s relatives enjoyed even more on their first visit', alt: 'Dhanashree and Kabir\'s relatives enjoyed more than them even though it was their first time while Dhanashree and Kabir were returning local experts', tags: ['legends', 'guests', 'dhanashree', 'kabir', 'family'] },
  { path: '/gallery/legends/legends11.webp', title: 'Dhanashree and Kabir finally balanced on the surfboard', alt: 'Dhanashree and Kabir finally balanced on the surfboard for more than two times in a row on their second visit', tags: ['legends', 'guests', 'returning', 'dhanashree', 'kabir', 'surfing'] },
  { path: '/gallery/legends/legends12.webp', title: 'Family from Pune now swear by the swing', alt: 'Family from Pune who initially doubted the swing\'s strength and capacity now swear by it', tags: ['legends', 'guests', 'family', 'pune', 'swing'] },
  { path: '/gallery/legends/legends13.webp', title: 'Most memorable family bonding trip ever', alt: 'Family said their Wavealokam stay was the most memorable family bonding trip they\'ve ever had', tags: ['legends', 'guests', 'family', 'bonding'] },
  { path: '/gallery/legends/legends14.webp', title: 'Sweet family who lucked out with Wavealokam after Varkala worries', alt: 'A sweet family outing — they said they lucked out with Wavealokam after much trepidation about Varkala stay reviews and staff behaviour', tags: ['legends', 'guests', 'family', 'varkala'] },
  { path: '/gallery/legends/legends15.webp', title: 'A collage of happy guests', alt: 'Collage of happy Wavealokam guests', tags: ['legends', 'guests', 'collage', 'happy'] },
  { path: '/gallery/legends/legends16.webp', title: 'We know your birthday, anniversary, or special event — and how to surprise you', alt: 'You might not tell Wavealokam but we know when it\'s your birthday or anniversary and how to make it special and surprise you', tags: ['legends', 'guests', 'celebration', 'surprise', 'birthday', 'anniversary'] },
  { path: '/gallery/legends/legends17.webp', title: 'Guests who promised to return — we\'re eagerly waiting', alt: 'Guests who promised to return and we are eagerly waiting — is this you?', tags: ['legends', 'guests', 'returning', 'waiting'] },
  { path: '/gallery/legends/legends18.webp', title: 'Still waiting for you to come back :(', alt: 'Guests who promised to return and we are eagerly waiting — is this you? We ask everyone just in case', tags: ['legends', 'guests', 'returning', 'waiting', 'miss-you'] },
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
