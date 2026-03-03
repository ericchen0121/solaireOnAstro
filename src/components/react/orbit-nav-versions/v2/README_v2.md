 # OrbitNav V2 - Simplified Design

## Overview

OrbitNav V2 is a streamlined version that removes text labels and prepares for new circle animations. This version maintains the core orbital motion while simplifying the component architecture.

## Changes from V1

### ✅ **Preserved Features**
- Physics-based orbital motion (15px radius, 8s duration)
- Auto color inversion (black/white based on page background)
- GSAP ScrollTrigger integration
- Hover states with scale effects
- Debug markers (when enabled)

### ❌ **Removed Features**  
- Route-specific text labels (accueil, solaire, nous, etc.)
- Text measurement and positioning logic
- Dropdown hover states
- Complex text animation system
- Route label configuration

### 🔄 **Simplified Architecture**
- Removed text-related refs and state
- Simplified hover interactions
- Cleaner component structure
- Prepared for new circle animation

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isDark` | `boolean` | `false` | Force dark mode styling |
| `colorMode` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Color mode configuration |
| `ease` | `string` | `'power3.inOut'` | GSAP easing function |
| `debugMarkers` | `boolean` | `false` | Show debug position markers |

## Usage

Same as V1 - automatically included in layouts:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Page Title">
  <!-- OrbitNav V2 automatically included -->
</BaseLayout>
```

## Current Features

### Orbital Motion
- **Path**: Circular (15px radius)
- **Duration**: 8 seconds per orbit
- **Easing**: Linear motion along path with power3.inOut acceleration
- **Scale Pulse**: Subtle 1.0 to 1.1 scale with sine.inOut (3s cycle)

### Color Inversion
- **Auto-detection**: Analyzes page background colors
- **Light backgrounds**: Black circle
- **Dark backgrounds**: White circle
- **Manual override**: Via `colorMode` prop

### Hover Effects
- **Scale**: 1.0 → 1.2 on hover
- **Duration**: 0.3s with power2.out easing
- **Visual**: Optional shadow on hover

### Section Tracking
- Still tracks page sections via ScrollTrigger
- Updates `currentSectionIndex` state
- Ready for future use (animations, etc.)

## Development Notes

### Ready for New Animation
The component is structured to easily add new circle animations:

```typescript
// Example: Add new animation in useEffect
useEffect(() => {
  if (!circleRef.current) return;
  
  // Add your new circle animation here
  const newAnimation = gsap.to(circleRef.current, {
    // Your animation properties
  });
  
  return () => newAnimation.kill();
}, []);
```

### Debug Mode
Enable debug markers to visualize the orbital path:

```typescript
// In orbit-nav-config.ts or component props
debugMarkers: true
```

Shows:
- Circular path outline
- Position markers at 8 points around the circle
- Console logging of positions

## Performance

V2 is lighter than V1:
- **Removed**: Text measurement Canvas API calls
- **Removed**: Complex text positioning calculations  
- **Removed**: Route label string processing
- **Simplified**: Event handlers and state management
- **Maintained**: Core GSAP animations and ScrollTrigger performance

## Next Steps

V2 is ready for your new circle animation implementation:

1. **Current state**: Clean orbital motion without text
2. **Next**: Add your custom circle animation
3. **Future**: Additional visual effects as needed

The component maintains the same external API, so switching between versions requires no changes to layout files.