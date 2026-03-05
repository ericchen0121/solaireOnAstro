# Rochat Solaire - Switzerland Solar Brand Site

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
│   │   ├── letterReveal.ts      # Letter-by-letter reveal
│   │   ├── heroScrollAnimation.ts
│   │   ├── scrollLetterReveal.ts
│   │   └── sectionSnap.ts
│   ├── components/     # Components (Astro + React)
│   │   ├── LenisProvider.astro  # Lenis smooth scroll provider
│   │   └── react/               # React islands
│   │       ├── OrbitNav.tsx     # Orbiting navigation
│   │       └── EmailMask.tsx    # Email masking, click-to-copy
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── LenisLayout.astro
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

### Custom Micro-Animations

1. **Orbiting Navigation** - Physics-based orbiting nav in upper right corner

### GSAP + Lenis Integration

Smooth scroll and ScrollTrigger sync are set up in `LenisProvider.astro`. Pages that need Lenis use `LenisLayout.astro`; others use `BaseLayout.astro`.

### 1. OrbitNav Component

The orbiting navigation appears in the upper right corner of all pages. It automatically detects page background color and inverts its colors accordingly.

**Features:**
- Physics-based orbiting motion with inertia and tension
- Automatic color inversion based on page background
- Vector-style black and white design
- Smooth acceleration/deceleration

**Usage:**
Already included in both layouts. To customize navigation items, edit `src/utils/navigation.ts`.

```astro
---
import OrbitNav from '../components/react/OrbitNav.tsx';
---

<OrbitNav client:only="react" isDark={false} />
```

### 2. Creating Animations

Animations are in `src/animations/` (e.g. `letterReveal.ts`, `heroScrollAnimation.ts`, `scrollLetterReveal.ts`, `sectionSnap.ts`).

1. Import GSAP and ScrollTrigger in your component
2. Register ScrollTrigger plugin
3. Create your timeline with ScrollTrigger configuration
4. Ensure animations trigger on scroll (not autoplay)

Example pattern:

```typescript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initMyAnimation() {
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

Most pages use `BaseLayout.astro`; `why-work-with-us` uses `LenisLayout.astro` (adds Lenis smooth scroll). Both include:
- TailwindCSS base styles, SEO meta tags, OrbitNav, Google Fonts (Poppins)

### Email Masking

The `EmailMask` component displays "contact" instead of the actual email address, with click-to-copy functionality.

**Usage:**
```astro
---
import EmailMask from '../components/react/EmailMask.tsx';
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

Character-by-character reveal using GSAP SplitText. Use the utility in a script (e.g. on the homepage):

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
