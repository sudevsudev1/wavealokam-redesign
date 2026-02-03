
# Automated SEO Blog System - Implementation Plan

## Overview
Build a weekly automated blog system that generates SEO-optimized content about surfing, Varkala, and travel in Kerala. Posts auto-publish to `/blog` with email notifications to the owner.

## Architecture

```text
+------------------+     +-----------------------+     +------------------+
|   Weekly Cron    | --> |  generate-blog-post   | --> |   blog_posts     |
|   (External)     |     |   Edge Function       |     |   (Supabase)     |
+------------------+     +-----------------------+     +------------------+
                                   |
                    +--------------+--------------+
                    |              |              |
              +-----v----+  +------v-----+  +-----v------+
              | Lovable  |  |  Unsplash  |  |   Resend   |
              |    AI    |  |    API     |  |   Email    |
              | (GPT-5)  |  | (Stock)    |  +------------+
              +----------+  +------------+
```

## Database Schema

### Table: `blog_posts`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | SEO-optimized title |
| slug | text | URL-friendly slug |
| content | text | Markdown blog content |
| excerpt | text | Meta description (155 chars) |
| featured_image | text | Hero image URL |
| images | jsonb | Array of inline images |
| keywords | text[] | Target SEO keywords |
| category | text | listicle, opinion, guide |
| status | text | draft, published |
| published_at | timestamp | Publication date |
| meta_title | text | SEO title tag |
| meta_description | text | SEO meta description |
| created_at | timestamp | Creation timestamp |

## Edge Functions

### 1. `generate-blog-post`
Main orchestration function that:
- Selects topic strategy (rotating between listicles, opinion pieces, guides)
- Generates SEO keywords using GPT-5's knowledge of surf/travel industry
- Creates full blog post with proper structure
- Fetches images from Unsplash + generates AI images via Gemini
- Saves to database
- Sends email notification via Resend

### 2. `blog-cron-trigger`
Simple endpoint for external cron services (cron-job.org or similar) to trigger weekly generation.

## Frontend Routes

### `/blog` - Blog Index
- Grid of published posts with featured images
- Category filters (Surfing, Travel, Varkala Life)
- SEO meta tags and structured data
- Pagination

### `/blog/:slug` - Individual Post
- Full article with responsive images
- Related posts sidebar
- Social sharing buttons
- Schema.org Article markup
- Open Graph tags for social previews

## SEO Strategy Built Into System

### Keyword Categories (Pre-configured)
1. **Surfing**: "learn surfing India", "surf lessons Kerala", "beginner surfing Varkala"
2. **Travel**: "Varkala travel guide", "Kerala beach destinations", "backpacking South India"
3. **Activities**: "things to do Varkala", "kayaking Kerala backwaters", "toddy shop experience"
4. **Accommodation**: "beach resort Varkala", "surf stay Kerala", "boutique hotel Trivandrum"

### Content Types (Rotating Weekly)
- Week 1: Listicle ("10 Best Surf Spots in Kerala")
- Week 2: Guide ("Complete Beginner's Guide to Surfing in Varkala")
- Week 3: Opinion/Story ("Why Varkala is India's Best-Kept Surf Secret")
- Week 4: Seasonal ("Monsoon Surfing: What You Need to Know")

## Image Strategy

### Stock Photos (Unsplash API - Free)
- Beach/ocean scenery
- Surfing action shots
- Kerala landscapes
- Food photography

### AI Generated (Gemini via Lovable AI)
- Custom graphics for listicles
- Infographics
- Branded header images

## Email Notification
Uses existing Resend integration to send weekly summary:
- Post title and link
- Target keywords
- Preview of content
- Quick stats (word count, images)

## Implementation Steps

### Phase 1: Database Setup
1. Create `blog_posts` table with RLS policies (public read, service role write)
2. Add indexes for slug and published_at

### Phase 2: Edge Functions
1. Create `generate-blog-post` function with:
   - Topic rotation logic
   - Lovable AI integration for content generation
   - Unsplash API for stock photos
   - Gemini image generation for custom graphics
   - Database insertion
   - Email notification via Resend

2. Create `blog-cron-trigger` with secret token validation

### Phase 3: Frontend
1. Create `/blog` route with post grid
2. Create `/blog/:slug` route for individual posts
3. Add SEO components (meta tags, structured data)
4. Style with existing Wavealokam design system

### Phase 4: Cron Setup
1. Use free cron service (cron-job.org) to hit trigger endpoint weekly
2. Configure for Sunday 6 AM IST

## Technical Details

### Content Generation Prompt Strategy
The AI will be given:
- Brand voice guidelines (matching Wavealokam's witty, honest tone)
- Target keyword cluster for the week
- Content type template (listicle structure, guide format, etc.)
- Word count targets (1200-1800 words for SEO)
- Internal linking instructions (link to booking, rooms, activities)

### Image Handling
- Unsplash: Free API, attribution in footer
- AI Images: Stored in Supabase Storage bucket
- Responsive srcset for performance

### Security
- Cron endpoint protected by secret token
- Blog posts table: public SELECT, service_role INSERT/UPDATE
- No user-generated content (no comments initially)

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/generate-blog-post/index.ts` | Main generation logic |
| `supabase/functions/blog-cron-trigger/index.ts` | Cron webhook handler |
| `src/pages/Blog.tsx` | Blog index page |
| `src/pages/BlogPost.tsx` | Individual post page |
| `src/components/blog/BlogCard.tsx` | Post preview card |
| `src/components/blog/BlogSEO.tsx` | SEO meta components |
| `src/components/blog/RelatedPosts.tsx` | Related posts sidebar |

## Required Secrets
- `UNSPLASH_ACCESS_KEY` - For stock photo API (free tier: 50 requests/hour)
- `BLOG_CRON_SECRET` - Token to validate cron requests

## Notes
- First post can be generated manually to test before enabling cron
- System learns from keyword performance over time (future enhancement)
- Posts can be edited manually in database if needed
- Gemini image generation uses `google/gemini-2.5-flash-image` model
