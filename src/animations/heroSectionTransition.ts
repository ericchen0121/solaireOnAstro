import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupSmoothScroll } from './gsapLenis';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

interface HeroSectionTransitionOptions {
  triggerSelector: string;
  contentSelector: string;
  distance?: number;
  brandSelector?: string; // Selector for brand section to fade in/out
  onBrandFadeIn?: () => void;
  onBrandFadeOut?: () => void;
  markers?: boolean;
}

/**
 * Initialize hero section scroll transition animation
 * Replicates the Next.js HeroSectionTransition component functionality
 * 
 * @param options Configuration options for the animation
 */
export function initHeroSectionTransition(options: HeroSectionTransitionOptions): () => void {
  const {
    triggerSelector,
    contentSelector,
    distance,
    brandSelector,
    onBrandFadeIn,
    onBrandFadeOut,
    markers = false,
  } = options;

  let timeline: gsap.core.Timeline | null = null;
  let rafId: number | null = null;
  let isInitialized = false;
  let lastDistance = distance ?? 600;
  let mounted = true;

  // Helper function to fade in brand
  const fadeInBrand = () => {
    if (!mounted) return;

    if (brandSelector) {
      const brandElement = document.querySelector(brandSelector) as HTMLElement;
      if (brandElement) {
        gsap.to(brandElement, {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
        });
      }
    }

    if (onBrandFadeIn) {
      onBrandFadeIn();
    }
  };

  // Helper function to fade out brand
  const fadeOutBrand = () => {
    if (!mounted) return;

    if (brandSelector) {
      const brandElement = document.querySelector(brandSelector) as HTMLElement;
      if (brandElement) {
        gsap.to(brandElement, {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        });
      }
    }

    if (onBrandFadeOut) {
      onBrandFadeOut();
    }
  };

  // Initialize ScrollTrigger animation
  const initScrollTrigger = (finalDistance: number) => {
    const triggerElement = document.querySelector(triggerSelector) as HTMLElement;
    const contentElement = document.querySelector(contentSelector) as HTMLElement;

    if (!triggerElement || !contentElement || !mounted) return;

    // Kill existing timeline if any
    if (timeline) {
      timeline.scrollTrigger?.kill();
      timeline.kill();
      timeline = null;
    }

    // Find the last line to calculate catch point
    const lastLine = contentElement.querySelector(
      '.hero-quote span:last-child, .hero-title span:last-child'
    ) as HTMLElement | null;

    // Calculate catch point so the last line lingers inside the viewport
    const heroHeight = finalDistance;
    let catchPoint = finalDistance * 0.55; // fallback
    let lineHeight = 120;

    if (lastLine) {
      catchPoint = lastLine.offsetTop - lastLine.offsetHeight;
      lineHeight = lastLine.offsetHeight;
    }

    // Calculate end point: when trigger bottom reaches viewport top
    // This ensures ScrollTrigger completes when hero section has fully scrolled out
    const viewportHeight = window.innerHeight;

    timeline = gsap.timeline({
      paused: true,
      onComplete: fadeInBrand,
      onReverseComplete: fadeOutBrand,
      onReverseStart: () => {
        // Fade out immediately when timeline starts reversing
        fadeOutBrand();
      },
      scrollTrigger: {
        trigger: triggerElement,
        start: 'top+=30 top',
        // end: When trigger's bottom reaches viewport top
        // Since trigger is 100vh, this is when we've scrolled 100vh
        end: `top+=${catchPoint + lineHeight} top`,
        scrub: false, // false = animation plays at own pace, true/1 = tied to scroll position
        toggleActions: 'play reverse play reverse',
        markers: markers,
      },
    });

    // Phase 1: Fast movement to catch point (slideshow acceleration)
    // Shorter duration = faster initial movement
    timeline.to(contentElement, {
      y: -catchPoint - lineHeight / 2,
      duration: 0.3, // Fast initial phase
      ease: 'power4.out', // Fast start, slows down
    });

    // Phase 2: Slow deceleration to final distance (slideshow deceleration)
    // Longer duration = slower final movement
    timeline.to(contentElement, {
      y: -catchPoint - lineHeight,
      duration: 0.5, // Slower final phase
      ease: 'none', // Slower, smoother end
    });

    // Refresh after next frame
    rafId = requestAnimationFrame(() => {
      if (mounted) {
        ScrollTrigger.refresh();
      }
      rafId = null;
    });

    isInitialized = true;
  };

  // Measure height and initialize
  const measureAndInit = (attempts = 0) => {
    const triggerElement = document.querySelector(triggerSelector) as HTMLElement;
    const contentElement = document.querySelector(contentSelector) as HTMLElement;

    if (!contentElement || !triggerElement || isInitialized || !mounted) {
      return;
    }

    // Use offsetHeight instead of getBoundingClientRect for better performance
    const measuredHeight = distance ?? contentElement.offsetHeight ?? 0;

    if (measuredHeight > 0) {
      lastDistance = measuredHeight;
      initScrollTrigger(measuredHeight);
    } else if (attempts < 10) {
      // Reduced retries - offsetHeight should be available quickly
      rafId = requestAnimationFrame(() => {
        if (mounted) {
          rafId = null;
          measureAndInit(attempts + 1);
        }
      });
    } else {
      // Fallback: use last known distance
      initScrollTrigger(lastDistance);
    }
  };

  // Wait for Lenis to be ready, then initialize
  const waitForLenis = () => {
    // Check if Lenis is initialized (via setupSmoothScroll)
    // We'll wait a bit for ScrollTrigger to be ready
    if (typeof window !== 'undefined') {
      // Small delay to ensure ScrollTrigger is ready
      setTimeout(() => {
        if (mounted) {
          measureAndInit();
        }
      }, 200);
    }
  };

  // Initialize when DOM is ready
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', waitForLenis);
    } else {
      waitForLenis();
    }
  }

  // Cleanup function
  return () => {
    mounted = false;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (timeline) {
      timeline.scrollTrigger?.kill();
      timeline.kill();
      timeline = null;
    }

    isInitialized = false;
  };
}

