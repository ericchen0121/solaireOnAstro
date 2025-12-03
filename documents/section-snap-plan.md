# Section Snap Scrolling Implementation Plan

## Overview
Transform the index page into a slideshow-like experience where each section acts as a "slide" that snaps into view when scrolling past a threshold.

## Current Structure
- **7 sections total:**
  1. Hero section (`#hero-trigger`) - has complex scroll animations
  2. Company name section (`.company-name-section`) - has phase 3 animation
  3. Stats section (`.stats-section`) - has odometers
  4. Video section (`.video-section`)
  5. Why solar section (`.why-solar-section`) - has letter reveal
  6. Why us section (`.why-us-section`) - has letter reveal
  7. Clients section (`.clients-section`) - has letter reveal

## Technical Approach

### Option 1: Custom Lenis-based Snap System (RECOMMENDED)
**Pros:**
- Works seamlessly with existing Lenis setup
- Full control over snap behavior
- Can integrate with existing ScrollTrigger animations
- Can handle hero animation completion before snapping

**Implementation:**
1. Create `sectionSnap.ts` utility
2. Track all sections and calculate their positions (0vh, 100vh, 200vh, etc.)
3. Listen to Lenis scroll events
4. Detect scroll direction and threshold (e.g., 30% of viewport)
5. When threshold crossed, snap to nearest section using `Lenis.scrollTo()`
6. Prevent snapping during active animations (hero section)

### Option 2: GSAP ScrollTrigger Snap
**Pros:**
- Built-in snap functionality
- Works with ScrollTrigger

**Cons:**
- May conflict with existing ScrollTrigger setups
- Less control over threshold behavior
- Harder to coordinate with hero animations

### Option 3: CSS Scroll Snap
**Pros:**
- Native browser support
- Simple implementation

**Cons:**
- May conflict with Lenis smooth scrolling
- Less control over threshold
- Can't easily coordinate with animations

## Implementation Details

### Section Snap System Features:
1. **Threshold Detection:**
   - Scroll down: if scrolled past 30% of current section, snap to next
   - Scroll up: if scrolled past 30% of current section, snap to previous
   - Configurable threshold (default: 0.3 = 30%)

2. **Section Positioning:**
   - Each section should be exactly `100vh` tall
   - Sections positioned at: 0vh, 100vh, 200vh, 300vh, etc.
   - Calculate positions dynamically on load and resize

3. **Animation Coordination:**
   - Hero section: Don't snap until hero animation completes
   - Other sections: Can snap immediately
   - Use flags to track animation states

4. **Smooth Transitions:**
   - Use Lenis.scrollTo() with smooth easing
   - Duration: ~0.6-0.8s for snap animation
   - Prevent multiple snaps during transition

5. **Edge Cases:**
   - Initial page load: snap to first section
   - Window resize: recalculate positions
   - Fast scrolling: debounce snap detection
   - Animation in progress: delay snap

## Code Structure

```typescript
// sectionSnap.ts
interface SectionSnapOptions {
  threshold?: number; // 0-1, default 0.3 (30%)
  snapDuration?: number; // seconds, default 0.7
  sections?: string[]; // CSS selectors for sections
  disableDuringAnimations?: boolean; // default true
}

export function initSectionSnap(options: SectionSnapOptions): () => void
```

## Integration Points

1. **index.astro:**
   - Import and initialize `initSectionSnap()`
   - Pass section selectors
   - Coordinate with hero animation cleanup

2. **heroScrollAnimation.ts:**
   - Add callback when hero animation completes
   - Enable snapping after hero animation finishes

3. **Section HTML:**
   - Ensure all sections are exactly `100vh` (already mostly done)
   - Add data attributes if needed for identification

## Testing Checklist

- [ ] Snap works when scrolling down past threshold
- [ ] Snap works when scrolling up past threshold
- [ ] Hero animation completes before snapping
- [ ] Can't "park" in middle of section
- [ ] Smooth transitions between sections
- [ ] Works on window resize
- [ ] Works with existing ScrollTrigger animations
- [ ] Works with odometers and letter reveals
- [ ] Mobile touch scrolling works
- [ ] Fast scrolling doesn't break snap

