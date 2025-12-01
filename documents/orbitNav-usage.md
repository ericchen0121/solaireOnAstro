# OrbitNav Component Documentation

## Overview

The `OrbitNav` component is a physics-based navigation indicator that appears in the top-right corner of all pages. It features a moving circle with subtle physics-based effects (inertia, tension, acceleration/deceleration) and dynamic text that changes based on the current page route.

## Features

- **Physics-based motion**: Circular/elliptical orbiting motion with natural easing
- **Dynamic text**: Automatically displays page-specific labels (accueil, nous, clients, etc.)
- **Color inversion**: Automatically adapts to page background (white on black or black on white)
- **GSAP integration**: Can be controlled via GSAP timelines for advanced animations
- **Vector-style design**: Clean, minimal black and white aesthetic

## Basic Usage

### In BaseLayout (Automatic)

The OrbitNav is automatically included in all pages via `BaseLayout.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Page Title">
  <!-- Your page content -->
</BaseLayout>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isDark` | `boolean` | `false` | Force dark mode (black circle on white background) |
| `colorMode` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Color mode configuration |

## Color Mode Configuration

### `colorMode: 'auto'` (Default)

Automatically detects the page background and inverts colors accordingly:

- **Dark background** → White circle + white text
- **Light background** → Black circle + black text

```astro
<BaseLayout orbitNavColorMode="auto">
  <!-- Auto-detects based on section background -->
</BaseLayout>
```

### `colorMode: 'light'`

Forces white-on-black styling (white circle, white text):

```astro
<BaseLayout orbitNavColorMode="light">
  <!-- Always shows white circle on black background -->
</BaseLayout>
```

### `colorMode: 'dark'`

Forces black-on-white styling (black circle, black text):

```astro
<BaseLayout orbitNavColorMode="dark">
  <!-- Always shows black circle on white background -->
</BaseLayout>
```

## Route Labels

The component automatically displays different text based on the current route:

| Route | Label Displayed |
|-------|----------------|
| `/` | `accueil` |
| `/why-solar/` | `solaire` |
| `/why-work-with-us/` | `nous` |
| `/clients/` | `clients` |
| `/projects/` | `projets` |
| `/contact/` | `contact` |

To add or modify route labels, edit `src/utils/navigation.ts`:

```typescript
export const routeLabels: Record<string, string> = {
  '/': 'accueil',
  '/your-new-page/': 'your-label',
  // ... more routes
};
```

## Physics-Based Animation

The circle animation includes:

1. **Orbiting Motion**: Circular/elliptical path using X and Y axis animations
2. **Acceleration/Deceleration**: Smooth easing with `power2.inOut` and `power1.inOut`
3. **Tension Effect**: Subtle scale pulsing (1.0 to 1.1) with `sine.inOut` easing
4. **Inertia**: Natural motion curves that simulate physics

### Animation Parameters

- **Orbit Radius**: 15px (subtle movement)
- **Duration**: 8 seconds per orbit cycle
- **Scale Pulse**: 3 seconds per cycle

## GSAP Timeline Integration

### Using OrbitNav Control Utilities

Import the control functions from `src/animations/orbitNavControl.ts`:

```typescript
import { 
  createOrbitNavAnimation, 
  addOrbitNavToTimeline,
  animateOrbitNavColor 
} from '../animations/orbitNavControl';
```

### Example 1: Standalone Animation

```typescript
// Get the circle element
const circleElement = document.querySelector('.orbit-nav-circle') as HTMLElement;

// Create a standalone animation timeline
const orbitTimeline = createOrbitNavAnimation(circleElement, {
  radius: 20,      // Larger orbit radius
  duration: 10,    // Slower motion
  ease: 'power2.inOut',
  paused: false   // Start immediately
});
```

### Example 2: Add to Existing Timeline

```typescript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { addOrbitNavToTimeline } from '../animations/orbitNavControl';

gsap.registerPlugin(ScrollTrigger);

const circleElement = document.querySelector('.orbit-nav-circle') as HTMLElement;

// Create your main page timeline
const pageTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: '.hero-section',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  },
});

// Add OrbitNav animation to your timeline
addOrbitNavToTimeline(pageTimeline, circleElement, 0, {
  radius: 15,
  duration: 8,
});
```

### Example 3: Animate Color Change on Scroll

```typescript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animateOrbitNavColor } from '../animations/orbitNavControl';

gsap.registerPlugin(ScrollTrigger);

const circleElement = document.querySelector('.orbit-nav-circle') as HTMLElement;
const textElement = document.querySelector('.orbit-nav-text') as HTMLElement;

// Change color when entering a white section
ScrollTrigger.create({
  trigger: '.white-section',
  start: 'top 80%',
  onEnter: () => {
    // Switch to dark (black circle on white background)
    animateOrbitNavColor(circleElement, textElement, true, 0.6);
  },
  onLeaveBack: () => {
    // Switch back to light (white circle on black background)
    animateOrbitNavColor(circleElement, textElement, false, 0.6);
  },
});
```

### Example 4: Control Animation in Page Script

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="My Page">
  <section class="hero min-h-screen bg-black">
    <!-- Content -->
  </section>
</BaseLayout>

<script>
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { createOrbitNavAnimation } from '../animations/orbitNavControl';
  
  gsap.registerPlugin(ScrollTrigger);
  
  if (typeof window !== 'undefined') {
    // Wait for OrbitNav to mount
    setTimeout(() => {
      const circle = document.querySelector('[class*="orbit-nav"] > div:first-child') as HTMLElement;
      
      if (circle) {
        // Create custom animation with different parameters
        const customOrbit = createOrbitNavAnimation(circle, {
          radius: 25,
          duration: 12,
          ease: 'elastic.out(1, 0.3)',
        });
        
        // Pause/play based on scroll
        ScrollTrigger.create({
          trigger: '.hero',
          start: 'top top',
          onEnter: () => customOrbit.play(),
          onLeaveBack: () => customOrbit.pause(),
        });
      }
    }, 500);
  }
</script>
```

## Advanced Configuration

### Custom Animation Parameters

You can customize the physics behavior by modifying the animation in `OrbitNav.tsx` or using the control utilities:

```typescript
// More aggressive motion
createOrbitNavAnimation(circle, {
  radius: 30,        // Larger orbit
  duration: 6,       // Faster motion
  ease: 'power3.inOut', // Stronger acceleration
});

// Subtle, slow motion
createOrbitNavAnimation(circle, {
  radius: 10,       // Smaller orbit
  duration: 15,     // Slower motion
  ease: 'power1.inOut', // Gentle easing
});
```

### Accessing OrbitNav Elements

The component uses these class names (via Tailwind):

- Circle: `.bg-white` or `.bg-black` (depending on color mode)
- Text: `.text-white` or `.text-black`
- Container: `fixed top-4 right-4`

To target elements for GSAP animations:

```typescript
// Get circle element
const circle = document.querySelector('.fixed.top-4.right-4 > div:first-child') as HTMLElement;

// Get text element
const text = document.querySelector('.fixed.top-4.right-4 > div:last-child') as HTMLElement;
```

## Component Structure

```
OrbitNav (React Component)
├── Container (fixed positioning)
├── Circle (physics-based animation)
│   ├── X-axis orbit animation
│   ├── Y-axis orbit animation
│   └── Scale pulsing animation
└── Text Label (route-based, fades on change)
```

## Best Practices

1. **Use `colorMode: 'auto'`** for most pages to automatically adapt
2. **Set explicit `colorMode`** only when you need to override auto-detection
3. **Integrate with GSAP timelines** for coordinated page animations
4. **Keep orbit radius small** (10-20px) for subtle, professional motion
5. **Use longer durations** (8-12s) for smoother, less distracting motion

## Troubleshooting

### Animation not working

- Ensure GSAP is properly imported and registered
- Check that the circle element exists before animating
- Verify `client:only="react"` is set on the component

### Colors not inverting

- Check `colorMode` prop value
- Verify page sections have proper background color classes
- Use browser DevTools to inspect computed background colors

### Text not updating

- Verify route matches exactly in `routeLabels` mapping
- Check that route paths include trailing slashes (`/page/` not `/page`)
- Ensure `window.location.pathname` is accessible

## Files Reference

- **Component**: `src/components/react/OrbitNav.tsx`
- **Control Utilities**: `src/animations/orbitNavControl.ts`
- **Route Labels**: `src/utils/navigation.ts`
- **Layout Integration**: `src/layouts/BaseLayout.astro`

