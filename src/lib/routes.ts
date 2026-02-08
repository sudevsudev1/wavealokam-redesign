/**
 * Central route map for all pillar pages and main navigation.
 * Use these constants instead of hardcoded strings to prevent routing regressions.
 */
export const ROUTES = {
  // Pillar pages (actual routes with their own page components)
  home: '/',
  stay: '/stay',
  surfStay: '/surf-stay',
  workation: '/workation',
  longStay: '/long-stay',
  guide: '/varkala-guide',
  bestTime: '/best-time-to-visit-varkala',
  reach: '/how-to-reach-varkala',
  contact: '/contact',
  
  // Blog
  blog: '/blog',
  blogPost: (slug: string) => `/blog/${slug}`,
} as const;

/**
 * Homepage section hashes.
 * IMPORTANT: These are NOT routes! They are section anchors on the homepage.
 * For same-page navigation, use the hash directly (e.g., #rooms).
 * For cross-page navigation, import HOME_SECTIONS from homeSections.ts which
 * provides the full path (e.g., /#rooms).
 * 
 * @deprecated Use HOME_SECTIONS from './homeSections' for cross-page navigation
 */
export const HOMEPAGE_SECTIONS = {
  hero: '#hero',
  activities: '#activities',
  rooms: '#rooms',
  surfSchool: '#surf-school',
  itinerary: '#itinerary',
  gallery: '#gallery',
  originStory: '#origin-story',
  faq: '#faq',
} as const;
