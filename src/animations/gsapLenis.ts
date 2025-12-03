import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function initLenis() {
  if (lenis) return lenis; // prevent duplicate instances

  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 1.1,
  });

  // The unified RAF loop — this updates ALL scroll-linked things
  function raf(time: number) {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Note: ScrollTrigger sync is handled by syncScrollTriggerWithLenis()
  // Don't duplicate the setup here to avoid conflicts

  return lenis;
}

export function getLenis(): Lenis | null {
  return lenis;
}
