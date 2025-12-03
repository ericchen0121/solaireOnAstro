import { getLenis } from "./gsapLenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface SectionSnapOptions {
  threshold?: number;         // scroll % before advancing (0–1)
  snapDuration?: number;
  sections?: string[];
}

let sections: HTMLElement[] = [];
let positions: number[] = [];
let snapping = false;
let lastScrollY = 0;
let scrollDirection: 'up' | 'down' = 'down';

export function initSectionSnap(options: SectionSnapOptions = {}) {
  const {
    threshold = 0.15,
    snapDuration = 0.35,
    sections: selectors,
  } = options;

  const lenis = getLenis();
  if (!lenis) return () => {};

  // --- GET SECTIONS ---
  sections = selectors
    ? selectors
        .map((sel) => document.querySelector(sel) as HTMLElement)
        .filter((el) => el !== null)
    : Array.from(document.querySelectorAll("section")) as HTMLElement[];

  if (sections.length === 0) {
    console.warn("SectionSnap: No sections found");
    return () => {};
  }

  // --- CALCULATE REAL POSITIONS ---
  const updatePositions = () => {
    positions = sections.map((sec) => {
      const rect = sec.getBoundingClientRect();
      return window.scrollY + rect.top;
    });
  };
  updatePositions();
  
  const resizeHandler = () => {
    updatePositions();
    ScrollTrigger.refresh();
  };
  window.addEventListener("resize", resizeHandler);

  // --- SNAP LOGIC ---
  let scrollEndTimeout: number | null = null;

  const onScroll = ({ scroll }: { scroll: number }) => {
    if (snapping) return;

    // Don't snap while ScrollTrigger is active (hero animation)
    const heroTrigger = document.querySelector("#hero-trigger");
    if (heroTrigger && ScrollTrigger.isInViewport(heroTrigger)) {
      const triggers = ScrollTrigger.getAll();
      for (const t of triggers) {
        if (t.isActive) return; // block snapping during active ScrollTrigger
      }
    }

    // Track scroll direction
    const scrollDelta = scroll - lastScrollY;
    if (Math.abs(scrollDelta) > 1) {
      scrollDirection = scrollDelta > 0 ? 'down' : 'up';
    }
    lastScrollY = scroll;

    // debounce scroll end
    if (scrollEndTimeout) clearTimeout(scrollEndTimeout);

    scrollEndTimeout = window.setTimeout(() => {
      const viewport = window.innerHeight;

      // find closest section
      let closestIndex = 0;
      let closestDist = Infinity;

      positions.forEach((p, i) => {
        const dist = Math.abs(scroll - p);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      });

      // directional threshold logic
      const currentIndex = closestIndex;
      const currentSectionTop = positions[currentIndex];
      const progress = (scroll - currentSectionTop) / viewport;

      let targetIndex = currentIndex;

      // Scrolling down: if past threshold, go to next section
      if (scrollDirection === 'down' && progress > threshold) {
        targetIndex = Math.min(currentIndex + 1, sections.length - 1);
      }
      // Scrolling up: if we've scrolled less than (1 - threshold) of the section, go to previous
      // (e.g., if threshold is 0.15, and we're at 80% of section, go to previous)
      else if (scrollDirection === 'up' && progress < 1 - threshold && progress >= 0) {
        targetIndex = Math.max(currentIndex - 1, 0);
      }
      // If we're above the current section (negative progress), go to previous
      else if (progress < 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
      // Not past threshold - ensure we're aligned with current section
      else if (Math.abs(progress) > 0.01) {
        // Small misalignment - snap to current section
        targetIndex = currentIndex;
      } else {
        // Already aligned - no snap needed
        return;
      }

      // Only snap if target is different or we need to realign
      const targetPos = positions[targetIndex];
      const distance = Math.abs(scroll - targetPos);
      
      if (distance > 5) {
        snapping = true;
        lenis.scrollTo(targetPos, {
          duration: snapDuration,
          easing: (t) => t * (2 - t),
          onComplete: () => (snapping = false),
        });
      }
    }, 120); // scroll-end threshold
  };

  lenis.on("scroll", onScroll);

  return () => {
    lenis.off("scroll", onScroll);
    if (scrollEndTimeout) clearTimeout(scrollEndTimeout);
    window.removeEventListener("resize", resizeHandler);
  };
}

/**
 * Set animation active state (for compatibility with existing code)
 * Note: This is now handled automatically via ScrollTrigger detection
 */
export function setSectionSnapAnimationActive(_active: boolean): void {
  // No-op: handled automatically by ScrollTrigger.isActive check
}
