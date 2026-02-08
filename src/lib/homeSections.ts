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
 * Link text variations mapped to their destination hrefs.
 * Used by blog content rendering to map common link text to correct pages.
 * 
 * ROUTING STRATEGY:
 * - Stay/Rooms/Booking → /stay (Stay pillar page)
 * - Surf/Surfing → /surf-stay (Surf+Stay pillar page)
 * - Other sections → Homepage hash links
 */
export const LINK_TEXT_TO_SECTION: Record<string, string> = {
  // Rooms/Stay/Booking variations → Stay pillar page
  'stay': '/stay',
  'rooms': '/stay',
  'room': '/stay',
  'accommodation': '/stay',
  'book a room': '/stay',
  'wavealokam rooms': '/stay',
  'book now': '/stay',
  'booking': '/stay',
  'book': '/stay',
  
  // Surf school variations → Surf+Stay pillar page
  'surf school': '/surf-stay',
  'surf lessons': '/surf-stay',
  'learn surfing': '/surf-stay',
  'learn to surf': '/surf-stay',
  'surfing lessons': '/surf-stay',
  'wavealokam surf': '/surf-stay',
  'surfing': '/surf-stay',
  'surf': '/surf-stay',
  
  // Activities variations → Homepage section
  'activities': HOME_SECTIONS.activities,
  'things to do': HOME_SECTIONS.activities,
  'things to do in varkala': HOME_SECTIONS.activities,
  'what to do': HOME_SECTIONS.activities,
  
  // Itinerary variations → Stay pillar page
  'build itinerary': '/stay',
  'itinerary builder': '/stay',
  'plan your stay': '/stay',
  
  // Gallery → Homepage section
  'gallery': HOME_SECTIONS.gallery,
  'photos': HOME_SECTIONS.gallery,
  
  // Origin story → Homepage section
  'origin story': HOME_SECTIONS.originStory,
  'our story': HOME_SECTIONS.originStory,
  'about us': HOME_SECTIONS.originStory,
  
  // FAQ → Homepage section
  'faq': HOME_SECTIONS.faq,
  'faqs': HOME_SECTIONS.faq,
  'questions': HOME_SECTIONS.faq,
};
