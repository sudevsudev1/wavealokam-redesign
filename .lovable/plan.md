
# Hover-Play Video Previews for Activities Section

## Overview
Add responsive hover-activated video previews between the "EXPLORE." text and the Activities section. Videos will be paused initially, play on hover, pause on mouse leave (remembering playback position), and resume on subsequent hovers.

## Layout Requirements

| Device | Videos Shown | Arrangement |
|--------|-------------|-------------|
| Desktop (1024px+) | 3 videos | Side by side |
| Tablet (768px - 1023px) | 2 videos | Left + Middle videos |
| Mobile (< 768px) | 1 video | Left video only |

## Technical Approach

### 1. New Component: `ActivityVideoPreview.tsx`

Create a reusable video preview component with:
- **Hover state management**: Track when mouse enters/leaves
- **Playback control**: Play on hover, pause on leave (no reset to start)
- **Preloading**: Videos loaded with `preload="auto"` and buffered after hero sequence completes
- **Visual polish**: Rounded corners, subtle drop shadow, gradient overlay at edges

### 2. New Component: `ActivityVideosRow.tsx`

Container component that:
- Holds the 3 video sources (configurable)
- Manages responsive display using Tailwind breakpoints
- Handles staggered preload initiation after `ScrollVideo` completes
- Applies consistent spacing and alignment

### 3. Integration in `SurfboardScrollSection.tsx`

Insert the video row after the "EXPLORE." message:
- Position below the third scroll message
- Use GSAP fade-in animation as user scrolls into view
- Blend seamlessly with the orange-to-purple background gradient

### 4. Performance Optimizations

To ensure instant playback without lag:
- Use `preload="auto"` on video elements
- Trigger video buffer loading after hero frame sequence is marked as loaded
- Consider adding a global video preload context to coordinate loading
- Use `video.play()` with promise handling for smooth start
- Apply `playsinline` and `muted` attributes for autoplay compatibility

### 5. Visual Styling

- **Container**: Glass-morphism effect with `bg-white/10 backdrop-blur-sm`
- **Video frames**: `rounded-2xl overflow-hidden` with `shadow-2xl`
- **Hover effect**: Subtle scale transform `scale-105` on hover
- **Gradient blending**: Top/bottom gradients matching section background

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/ActivityVideoPreview.tsx` | Create | Single video component with hover play/pause logic |
| `src/components/ActivityVideosRow.tsx` | Create | Responsive container for 3 videos with preload coordination |
| `src/components/SurfboardScrollSection.tsx` | Modify | Add video row after "EXPLORE." with GSAP animation |
| `src/index.css` | Modify | Add any custom utility classes for video hover effects |
| `public/videos/` | User action | User needs to add 3 vertical video files (left, middle, right) |

---

## Technical Details

### Video Component Props
```text
interface ActivityVideoPreviewProps {
  src: string;           // Video file path
  poster?: string;       // Optional poster image for initial state
  className?: string;    // Additional styling
}
```

### Responsive Visibility Logic
```text
- Left video: Always visible (block)
- Middle video: Hidden on mobile (hidden md:block)
- Right video: Hidden on mobile and tablet (hidden lg:block)
```

### Hover Event Handling
```text
onMouseEnter -> video.play()
onMouseLeave -> video.pause() (preserves currentTime)
```

### Preload Coordination
The videos will begin loading after the hero sequence completes. This can be achieved by:
1. Exposing a callback from `ScrollVideo` when loading completes
2. Using a shared state/context
3. Using a simple delay after page load (fallback approach)

---

## User Action Required

You will need to provide 3 vertical video files to place in `public/videos/`:
- `activity-left.mp4` (shown on all devices)
- `activity-middle.mp4` (shown on tablet and desktop)
- `activity-right.mp4` (shown on desktop only)

Recommended video specs:
- Aspect ratio: 9:16 (vertical/portrait)
- Resolution: 720x1280 or 1080x1920
- Duration: 5-15 seconds (looped)
- Format: MP4 with H.264 codec
- File size: Under 5MB each for fast loading
