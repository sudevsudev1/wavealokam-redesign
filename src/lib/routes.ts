/**
 * Central route map for all pillar pages and main navigation.
 * Use these constants instead of hardcoded strings to prevent routing regressions.
 */
export const ROUTES = {
  // Pillar pages
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
  
  // Homepage sections (only for same-page navigation on homepage)
  sections: {
    hero: '#hero',
    activities: '#activities',
    rooms: '#rooms',
    surfSchool: '#surf-school',
    itinerary: '#itinerary',
    gallery: '#gallery',
    originStory: '#origin-story',
    faq: '#faq',
  },
} as const;

/**
 * Helper to build homepage hash links for cross-page navigation.
 * Use native <a href="/#section"> for these, not React Router <Link>.
 */
export const getHomepageSection = (sectionId: string) => `/${sectionId}`;
