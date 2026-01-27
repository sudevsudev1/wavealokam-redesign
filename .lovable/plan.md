

# Wavealokam Website Redesign
## TakeBoost-Inspired Beachside Surf Retreat

### Vision
Transform Wavealokam.com into a bold, high-impact single-page experience with smooth GSAP-powered scroll animations. The orange surfboard becomes the hero product, scrolling through the center of the page just like TakeBoost's bottle, while activities are revealed in stunning 3D space.

---

## Design System (Matching TakeBoost)

### Color Palette
- **Primary Orange:** Vibrant sunset orange (#FF8C00 → #FFA500)
- **Transition Purple/Blue:** Deep ocean purple (#4B0082) transitioning to vibrant blue (#0000FF)
- **Background:** Clean whites and rich darks for contrast
- **Text:** High-contrast white and black with bold typography

### Typography
- **Headings:** Heavy sans-serif (Helvetica Neue Bold / Montserrat 800), negative letter-spacing for that chunky impact
- **Body:** Clean, readable sans-serif
- **Style:** Large, confident text that commands attention

---

## Page Structure & Animations

### 1. **Hero Section**
- Full-screen orange background. Sticky hamburger Menu at the top right that will open the section headers upon clicking from where the user can navigate to the desired section directly at any point.
- Bold punchy tagline "IT'S WAVECATION TIME!"
- OTA icons blended to match the colour palette, hyperlinked to booking links for Wavealokam on the respective OTAs. Stars under them varying between 4.5/5 to 5/5.
- Orange surfboard enters from bottom, animates to center. It has a pulsating Book Now button anchored to it exactly like the Buy button on the boost bottle.
- Surfboard pins to center and stays visible as user scrolls
- Wavealokam logo in minimalist white
- Whatsapp logo anchored to bottom left blended to match colour palette. powered by join.chat, which will open whatsapp chat window with wavealokam as is currently configured on www.wavealokam.com

### 2. **Surfboard Scroll Section**
- As user scrolls, the surfboard remains pinned in the center
- Background text and content scrolls past the surfboard
- Key messages appear: "Surf. Feast. Explore."
- Ocean imagery subtly fades in and out behind

### 3. **Activities Section (The Showstopper)**
*Replicating TakeBoost's 3D ingredient reveal exactly*

Background transitions from vibrant orange → deep purple → ocean blue as each activity appears

**Activities in 3D carousel rotation:**

1. **Surfing** - "Catch legendary Varkala waves with expert instructors"
2. **Rooftop Dinner** - "Private cliff-top dining under the stars"  
3. **Jatayu Earth's Centre** - "World's largest bird sculpture adventure"
4. **Mangrove Adventures** - "Kayak through mystical backwaters or get adrenaline rush with speed boat/quad bike/banana bboat ride and much more."
5. **Sree Eight Beach** - "Quiet, tourist free paradise right across"
6. **Varkala North Cliff Nightlife** - "Where travelers come alive after dark"
7. **Toddy, the traditional, delicious and deceptively intoxicating palm wine** - "How can something so delicious be so sneaky!?"

Each activity rotates into focus from 3D space while descriptive text fades in/out

### 4. **Rooms Section**
- Grid layout showcasing:
  - King Room with Balcony (45 m²)
  - Double Room with Balcony (28 m²)
- Hover animations revealing amenities
- Clean cards with pricing and booking CTA

### 5. **Dining Section**
- Full-width imagery of rooftop dining
- Scroll-reveal text about seafood and local partnerships
- Dedicated spaces for romantic quiet dinners or group chill sessions.
- Partnership mentions: God's Own Country Kitchen, Blue Water

### 6. **Surf School Section**
- Features Sudev Nair as brand ambassador
- Lessons for all levels
- Dynamic surfing action shots

### 7. **Itinerary Builder**
- Interactive "Build Your Stay" calculator
- Add rooms, extra beds, two-wheelers
- Animated price updates

### 8. **Footer**
- Social links (Instagram, Facebook)
- Contact details
- Quick booking CTA
- Newsletter signup

---

## Technical Implementation

### Animations (GSAP + ScrollTrigger)
- Surfboard pinned scroll with `scrub: true`
- 3D transform carousel for activities using `rotateX/Y` and `translate3d`
- Background color interpolation during activity section
- Smooth momentum-based scrolling
- Text reveal animations with stagger effects

### Assets
- Orange surfboard (will source/placeholder)
- Existing Wavealokam imagery for rooms, dining, activities
- Video backgrounds where available
- Wavealokam logo (transparent PNG)

---

## All Pages Covered

While the main experience is a single scrolling page (TakeBoost style), navigation will allow jumping to sections:
- **Home** → Hero + Surfboard scroll
- **Activities** → 3D carousel section
- **Rooms** → Accommodation showcase
- **Dining** → Culinary experience
- **Surf School** → Lessons & retreats
- **Book Now** → Itinerary builder

---

## Deliverable
A stunning, scroll-animated website that captures TakeBoost's energy while celebrating Wavealokam's beachside paradise. The orange surfboard becomes the visual anchor, activities reveal like magic in 3D space, and every scroll feels intentional and premium. The code for the intinerary builder needs to be maintained intact without tampering. it should maintain the same design and structure in the new aesthetic.

