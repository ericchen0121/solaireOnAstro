# Rochat Solaire - Marketing Site

A modern marketing website built with Astro, featuring smooth scroll animations powered by GSAP and Lenis.

## Tech Stack

- **Framework**: Astro
- **Animations**: GSAP + Lenis
- **Styling**: TailwindCSS
- **React**: Used only for interactive animation components (islands architecture)
- Uses Astro's built-in islands architecture for interactive components

## Project Structure

```
/
├── public/              # Static assets (favicon, images, etc.)
├── src/
│   ├── animations/     # GSAP animation files
│   │   ├── gsapLenis.ts         # GSAP + Lenis integration
│   │   ├── heroAnimation.ts     # Example animation (disabled by default)
│   │   ├── letterReveal.ts      # Letter-by-letter reveal animation
│   │   └── pageTransitions.ts  # Page transition utilities
│   ├── components/     # Components (Astro + React)
│   │   ├── LenisProvider.astro  # Lenis smooth scroll provider
│   │   ├── OrbitNav.tsx         # Orbiting navigation (React)
│   │   ├── TumblerText.tsx      # Tumbler typography animation (React)
│   │   ├── Odometer.tsx         # Odometer number animation (React)
│   │   ├── EmailMask.tsx        # Email masking component (React)
│   │   └── LetterReveal.astro  # Letter reveal component (Astro)
│   ├── layouts/        # Page layouts
│   │   └── BaseLayout.astro
│   ├── pages/          # Route pages
│   │   ├── index.astro
│   │   ├── why-solar/
│   │   ├── why-work-with-us/
│   │   ├── clients/
│   │   ├── projects/
│   │   └── contact/
│   └── styles/         # Global styles
│       └── global.css
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Animations

### Three Custom Micro-Animations

The site includes three custom animation types as specified:

1. **Orbiting Navigation** - Physics-based orbiting nav in upper right corner
2. **Tumbler Typography** - Character-by-character reveal with 3D rotation
3. **Odometer Numbers** - Scroll-triggered number counting animation

### GSAP + Lenis Integration

The smooth scroll and animation setup is handled in `src/animations/gsapLenis.ts`. 

To use it in any component:

```typescript
import { setupSmoothScroll } from '../animations/gsapLenis';

// This is automatically called by LenisProvider.astro
setupSmoothScroll();
```

### 1. OrbitNav Component

The orbiting navigation appears in the upper right corner of all pages. It automatically detects page background color and inverts its colors accordingly.

**Features:**
- Physics-based orbiting motion with inertia and tension
- Automatic color inversion based on page background
- Vector-style black and white design
- Smooth acceleration/deceleration

**Usage:**
Already included in `BaseLayout.astro`. To customize navigation items, edit `src/utils/navigation.ts`.

```astro
---
import OrbitNav from '../components/OrbitNav.tsx';
import { navigationItems } from '../utils/navigation';
---

<OrbitNav client:load items={navigationItems} isDark={false} />
```

### 2. TumblerText Component

Typography transition with 3D rotation effect (tumbler style).

**Usage:**
```astro
---
import TumblerText from '../components/TumblerText.tsx';
---

<TumblerText 
  client:load
  text="Your text here"
  className="text-4xl font-bold"
  delay={0}
  duration={0.8}
/>
```

Or use the utility function:
```typescript
import { initTumblerReveal } from '../animations/pageTransitions';

initTumblerReveal('.your-selector', 0, 0.03);
```

### 3. Odometer Component

Scroll-triggered number animation that counts up to the target value.

**Usage:**
```astro
---
import Odometer from '../components/Odometer.tsx';
---

<Odometer 
  client:load
  value={1482}
  duration={2}
  decimals={0}
  prefix=""
  suffix=""
  className="stat-number text-white"
/>
```

**Props:**
- `value`: Target number to count to
- `duration`: Animation duration in seconds (default: 2)
- `decimals`: Number of decimal places (default: 0)
- `prefix`: Text before number (e.g., "$")
- `suffix`: Text after number (e.g., "%")
- `className`: CSS classes for styling

### Creating Animations

Animations are located in `src/animations/`. Example animations are provided but disabled by default.

To enable an animation:

1. Import GSAP and ScrollTrigger in your component
2. Register ScrollTrigger plugin
3. Create your timeline with ScrollTrigger configuration
4. Ensure animations trigger on scroll (not autoplay)

Example (from `src/animations/heroAnimation.ts`):

```typescript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHeroAnimation() {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top 80%',
      end: 'bottom 20%',
      scrub: true,
    },
  });

  tl.from('.hero-title', { opacity: 0, y: 80 });
}
```

### Animation Guidelines

- **No autoplay**: All animations should trigger on scroll
- **Use ScrollTrigger**: Bind animations to scroll position
- **Lenis integration**: The smooth scroll is already set up, animations will work automatically
- **Performance**: Use `scrub: true` for smooth scroll-linked animations

## Design System

### Colors

- `black`: #000000
- `charcoal`: #1a1a1a
- `white`: #ffffff
- `solar-yellow`: #ffd700

### Typography

- **Primary Font**: Poppins (loaded from Google Fonts)
- **Stats Numbers**: Use the `.stat-number` utility class for large numerical displays

### Utility Classes

- `.stat-number`: Large numerical stats (640 / 18 / 15 style)
- Color utilities: `.text-charcoal`, `.bg-charcoal`, `.text-solar-yellow`, `.bg-solar-yellow`

## Pages

- `/` - Homepage
- `/why-solar/` - Why choose solar energy
- `/why-work-with-us/` - Company benefits
- `/clients/` - Client showcase
- `/projects/` - Project portfolio
- `/contact/` - Contact form

All pages use the `BaseLayout.astro` which includes:
- TailwindCSS base styles
- SEO meta tags
- LenisProvider for smooth scroll
- Google Fonts (Poppins)

### Email Masking

The `EmailMask` component displays "contact" instead of the actual email address, with click-to-copy functionality.

**Usage:**
```astro
---
import EmailMask from '../components/EmailMask.tsx';
---

<EmailMask 
  client:load
  email="contact@rochatsolaire.com"
  displayText="contact"
  className="text-solar-yellow text-xl font-semibold"
/>
```

**Features:**
- Masks email address as "contact" text
- Click to copy email to clipboard
- Visual feedback on hover and copy
- Accessible with proper ARIA labels

### Letter Reveal Animation

Character-by-character reveal animation using GSAP SplitText (free plugin included with GSAP).

**Usage:**
```astro
---
import LetterReveal from '../components/LetterReveal.astro';
---

<LetterReveal className="hero-title" delay={0} stagger={0.05}>
  <span>First line</span>
  <span>Second line</span>
</LetterReveal>
```

Or use the utility function:
```typescript
import { initLetterReveal } from '../animations/letterReveal';

initLetterReveal('.hero-title', 0, 0.05);
```

## Development Notes

- **OrbitNav** is automatically included in all pages via `BaseLayout.astro`
- **Lenis smooth scroll** is automatically initialized via `LenisProvider.astro`
- **GSAP ScrollTrigger** is pre-configured to work with Lenis
- **React components** use `client:load` directive for hydration
- **Page background detection** automatically inverts OrbitNav colors
- **Mobile-friendly** vertical scroll with Lenis
- All animations trigger on scroll (no autoplay)
- Use full-screen sections matching Figma structure
- Clean utility classes from Tailwind are available

## Component Architecture

- **Astro components** (`.astro`) - Static content, layouts, pages
- **React components** (`.tsx`) - Interactive animations only
- **Animation utilities** (`.ts`) - Reusable GSAP functions
- **Islands architecture** - Only interactive components are hydrated

This approach minimizes JavaScript bundle size while maintaining rich animations.

## License

Private project - All rights reserved
