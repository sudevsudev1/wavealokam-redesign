

# Parallax Blur-Zoom Image Gallery for Activities Section

## Overview
Add a cinematic parallax image gallery to the Activities section where 3-4 images per activity animate with scroll. Images start small and blurred, zoom in and rotate in any one direction while sharpening to full focus, then continue growing with increasing blur and rotation in the same direction as they exit the viewport. Each image appears at a randomized screen position, creating a dynamic, layered visual experience without obscuring the text content. on scrolling up the exact reverse of this should happen.

## Animation Lifecycle (Per Image)

```text
+------------------+------------------+------------------+
|     ENTER        |      FOCUS       |       EXIT       |
+------------------+------------------+------------------+
| Scale: 0.3       | Scale: 1.0       | Scale: 1.5+      |
| Blur: 20px       | Blur: 0px        | Blur: 10px       |
| Opacity: 0.3     | Opacity: 0.8     | Opacity: 0        |
| Position: Random | Position: Stable | Position: Drift  |
+------------------+------------------+------------------+
       ^                   ^                  ^
       |                   |                  |
   Scroll 0%           Scroll 50%         Scroll 100%
```

## Image Positioning Strategy

To avoid covering text, images will be positioned in "safe zones":
- **Corners**: Top-left, top-right, bottom-left, bottom-right
- **Side edges**: Far left, far right
- **Behind content**: Lower z-index with reduced opacity

Each image will have a pre-defined position offset within these zones, with slight randomization for organic feel.

## Technical Architecture

### 1. New Component: `ActivityParallaxImages.tsx`

Manages all parallax images for the entire Activities section:
- Receives the current scroll progress and active activity index
- Renders image layers for the active activity (plus transitioning ones)
- Handles GSAP timeline for each image's blur/scale/position animation

### 2. Data Structure for Activity Images

```text
interface ActivityImage {
  id: string;
  src: string;              // Path like /activities/surfing/1.jpg
  position: {
    x: 'left' | 'right';    // Horizontal safe zone
    y: 'top' | 'bottom';    // Vertical safe zone
    offsetX: number;        // Percentage offset (-20 to 20)
    offsetY: number;        // Percentage offset (-20 to 20)
  };
  delay: number;            // Stagger timing (0, 0.25, 0.5, 0.75)
}

interface ActivityImagesConfig {
  activityId: number;
  images: ActivityImage[];
}
```

### 3. GSAP Animation Timeline

For each image within an activity's scroll segment:
- **0-20% progress**: Fade in from blur, scale 0.3 to 0.7
- **20-50% progress**: Continue scaling 0.7 to 1.0, blur reduces to 0
- **50-80% progress**: Scale 1.0 to 1.3, blur increases to 5px
- **80-100% progress**: Scale 1.3 to 1.6, blur to 15px, opacity to 0

Images are staggered within each activity segment so they don't all animate simultaneously.

### 4. Modifications to `ActivitiesSection.tsx`

- Import and integrate `ActivityParallaxImages` component
- Pass current scroll progress and activeIndex to the parallax component
- Images render behind the text content (lower z-index)
- Ensure images have pointer-events: none to prevent interaction interference

## File Structure for Images

```text
public/
  activities/
    surfing/
      1.jpg
      2.jpg
      3.jpg
      4.jpg (optional)
    rooftop-dinner/
      1.jpg
      2.jpg
      3.jpg
    sree-eight-beach/
      1.jpg
      2.jpg
      3.jpg
    chechis-breakfast/
      1.jpg
      2.jpg
      3.jpg
    mangrove-adventures/
      1.jpg
      2.jpg
      3.jpg
    toddy/
      1.jpg
      2.jpg
      3.jpg
    jatayu/
      1.jpg
      2.jpg
      3.jpg
    north-cliff-nightlife/
      1.jpg
      2.jpg
      3.jpg
```

## Visual Blending Techniques

1. **Reduced opacity**: Max opacity of 0.7 ensures text remains readable
2. **Soft edges**: CSS mask or radial gradient fade at image borders
3. **Color tint**: Subtle hue overlay matching the background gradient
4. **Lower z-index**: Images render behind text (z-index: 0 vs text at z-index: 10)
5. **Size constraints**: Images max out at 40% of viewport width to avoid dominating

## Responsive Considerations

| Device | Max Image Size | Visible Images |
|--------|----------------|----------------|
| Desktop | 40vw | 4 images |
| Tablet | 35vw | 3 images |
| Mobile | 50vw | 2 images |

On mobile, fewer images display simultaneously to prevent visual overload.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/ActivityParallaxImages.tsx` | Create | Core parallax image component with GSAP animations |
| `src/components/ActivitiesSection.tsx` | Modify | Integrate parallax images, pass scroll progress |
| `public/activities/surfing/` | User action | Add 3-4 surfing images |
| `public/activities/.../` | User action | Add images for remaining activities |

---

## Technical Details

### Scroll Progress Calculation

Each activity occupies `1/8` of the total scroll (12.5%). Within each segment:
- Local progress 0-1 calculated as: `(globalProgress - activityStart) / activityDuration`
- Images use this local progress for their individual timelines

### Safe Zone Positions

```text
+--------+----------------+--------+
|  TL    |                |   TR   |
|        |     TEXT       |        |
|  L     |    CONTENT     |    R   |
|        |    (SAFE)      |        |
|  BL    |                |   BR   |
+--------+----------------+--------+

Position mapping:
- TL: { x: 'left', y: 'top', offsetX: 5-15%, offsetY: 5-20% }
- TR: { x: 'right', y: 'top', offsetX: -5 to -15%, offsetY: 5-20% }
- BL: { x: 'left', y: 'bottom', offsetX: 5-15%, offsetY: -5 to -20% }
- BR: { x: 'right', y: 'bottom', offsetX: -5 to -15%, offsetY: -5 to -20% }
```

### CSS Filter Animation

GSAP will animate the `filter` property:
```text
filter: blur(20px) → blur(0px) → blur(15px)
```

Combined with `scale` and `opacity` transforms for the full effect.

---

## User Action Required

You will need to upload 3-4 images for each activity. Start with surfing images, and I'll integrate them into the parallax system. Recommended specs:

- **Format**: JPG or WebP (for smaller file sizes)
- **Resolution**: 800x1200 or similar (portrait orientation works best)
- **File size**: Under 200KB each for fast loading
- **Content**: Action shots, landscapes, or atmospheric photos that complement each activity

