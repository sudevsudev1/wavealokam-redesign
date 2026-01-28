

# Plan: Fix Surfing Parallax Animation Timing

## Problem Analysis

The surfing images currently start animating too late because:

1. **`scrollProgress` only exists inside the pinned section** - The `ActivitiesSection` passes `scrollProgress` (0-1) to `ActivityParallaxImages`, but this progress only starts at 0 when the section pins to the top
2. **No visibility into pre-pin scroll state** - When the "orange line after videos touches the bottom," the ActivitiesSection hasn't pinned yet, so `scrollProgress` is still 0
3. **The `earlyStart` approach cannot work** - Adjusting `earlyStart` multipliers only shifts timing within the 0-1 progress range; it cannot trigger animations before progress begins

## Solution

Create an **independent ScrollTrigger** specifically for surfing images that:
- Starts when the orange section (bottom of SurfboardScrollSection) enters the viewport from the bottom
- Ends when Activity 2 (Rooftop Dinner) begins
- Provides its own progress value separate from the main ActivitiesSection progress

## Technical Implementation

### Step 1: Add a separate scroll trigger for surfing images

Modify `ActivityParallaxImages.tsx` to create its own ScrollTrigger that tracks the SurfboardScrollSection's position:

```text
- Add a new state: surfingScrollProgress (0 to 1)
- Create a ScrollTrigger with:
  - trigger: "#surfboard-scroll-section"
  - start: "bottom bottom" (when bottom of videos section hits bottom of viewport)
  - end: ActivitiesSection at ~12.5% progress (end of Activity 1)
- Use this separate progress for surfing images only
```

### Step 2: Modify image animation logic

For surfing images (activityId === 1):
- Use the new `surfingScrollProgress` instead of `localProgress`
- Map the full 0-1 range of this independent trigger to the image animation lifecycle

### Step 3: Keep other activities unchanged

Activities 2-8 continue using the existing `scrollProgress` from props as before.

## Files to Modify

1. **`src/components/ActivityParallaxImages.tsx`**
   - Add `useRef` for section targeting
   - Create independent ScrollTrigger for surfing images
   - Add `surfingScrollProgress` state
   - Modify animation logic to use correct progress source per activity

## Expected Result

- Surfing images start animating the moment the orange section after the videos touches the bottom of the viewport
- Images complete their animation lifecycle by the time "Rooftop Dinner" appears
- All other activity images continue working as before

