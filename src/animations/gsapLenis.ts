import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/**
 * Initialize Lenis smooth scroll and bind it to GSAP ScrollTrigger
 * This should be called once on page load
 */
export function setupSmoothScroll(): Lenis {
  // Initialize Lenis
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // Bind Lenis to GSAP ticker
  function raf(time: number) {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Connect ScrollTrigger to Lenis
  lenis.on('scroll', ScrollTrigger.update);

  // Proxy ScrollTrigger's scroll method
  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length) {
        lenis?.scrollTo(value, { immediate: true });
      }
      return lenis?.scroll || 0;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
    pinType: document.body.style.transform ? 'transform' : 'fixed',
  });

  // Refresh ScrollTrigger after setup and on window resize
  ScrollTrigger.refresh();
  
  window.addEventListener('resize', () => {
    ScrollTrigger.refresh();
  });

  return lenis;
}

/**
 * Get the current Lenis instance
 */
export function getLenis(): Lenis | null {
  return lenis;
}

/**
 * Cleanup function to destroy Lenis instance
 */
export function destroySmoothScroll(): void {
  if (lenis) {
    lenis.destroy();
    lenis = null;
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }
}

