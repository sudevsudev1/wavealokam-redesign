/**
 * Canonical homepage section IDs and their href mappings.
 * Use these for ANY link that should navigate to a homepage section,
 * whether from within the homepage or from other pages (blog, pillar pages, etc.)
 * 
 * IMPORTANT: Use native <a href="..."> for cross-page hash navigation,
 * NOT React Router <Link>. This ensures the browser properly handles
 * the hash navigation after loading the homepage.
 */
export const HOME_SECTIONS = {
  hero: '/#hero',
  activities: '/#activities',
  rooms: '/#rooms',
  surfSchool: '/#surf-school',
  itinerary: '/#itinerary',
  gallery: '/#gallery',
  originStory: '/#origin-story',
  faq: '/#faq',
} as const;

/**
 * Section ID map (without the hash prefix) for getElementById lookups
 */
export const SECTION_IDS = {
  hero: 'hero',
  activities: 'activities',
  rooms: 'rooms',
  surfSchool: 'surf-school',
  itinerary: 'itinerary',
  gallery: 'gallery',
  originStory: 'origin-story',
  faq: 'faq',
} as const;

/**
 * Link text variations mapped to their section hrefs.
 * Used by blog content rendering to map common link text to correct sections.
 */
export const LINK_TEXT_TO_SECTION: Record<string, string> = {
  // Rooms/Stay variations
  'stay': HOME_SECTIONS.rooms,
  'rooms': HOME_SECTIONS.rooms,
  'room': HOME_SECTIONS.rooms,
  'accommodation': HOME_SECTIONS.rooms,
  'book a room': HOME_SECTIONS.rooms,
  'wavealokam rooms': HOME_SECTIONS.rooms,
  
  // Surf school variations
  'surf school': HOME_SECTIONS.surfSchool,
  'surf lessons': HOME_SECTIONS.surfSchool,
  'learn surfing': HOME_SECTIONS.surfSchool,
  'learn to surf': HOME_SECTIONS.surfSchool,
  'surfing lessons': HOME_SECTIONS.surfSchool,
  'wavealokam surf': HOME_SECTIONS.surfSchool,
  
  // Activities variations
  'activities': HOME_SECTIONS.activities,
  'things to do': HOME_SECTIONS.activities,
  'things to do in varkala': HOME_SECTIONS.activities,
  'what to do': HOME_SECTIONS.activities,
  
  // Itinerary variations
  'build itinerary': HOME_SECTIONS.itinerary,
  'itinerary builder': HOME_SECTIONS.itinerary,
  'plan your stay': HOME_SECTIONS.itinerary,
  'book now': HOME_SECTIONS.itinerary,
  'booking': HOME_SECTIONS.itinerary,
  
  // Gallery
  'gallery': HOME_SECTIONS.gallery,
  'photos': HOME_SECTIONS.gallery,
  
  // Origin story
  'origin story': HOME_SECTIONS.originStory,
  'our story': HOME_SECTIONS.originStory,
  'about us': HOME_SECTIONS.originStory,
  
  // FAQ
  'faq': HOME_SECTIONS.faq,
  'faqs': HOME_SECTIONS.faq,
  'questions': HOME_SECTIONS.faq,
};
