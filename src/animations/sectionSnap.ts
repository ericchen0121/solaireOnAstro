import { getLenis } from "./gsapLenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface SectionSnapOptions {
  threshold?: number; // scroll % before advancing (0–1)
  snapDuration?: number;
  sections?: string[];
}

let sections: HTMLElement[] = [];
let positions: number[] = [];
let snapping = false;
let rafId: number | null = null;
let scrollListener: ((e: any) => void) | null = null;

export function initSectionSnap(options: SectionSnapOptions = {}): () => void {
  const {
    threshold = 0.15,
    snapDuration = 0.35,
    sections: selectors,
  } = options;

  let lenis: ReturnType<typeof getLenis> = null;
  let cleanupFn: (() => void) | null = null;
  let checkInterval: number | null = null;

  const init = () => {
    lenis = getLenis();
    if (!lenis) {
      console.warn("SectionSnap: Lenis not available");
      return;
    }

    // --- GET SECTIONS ---
    sections = selectors
      ? selectors
          .map((sel) => document.querySelector(sel) as HTMLElement)
          .filter((el) => el !== null)
      : Array.from(document.querySelectorAll("section")) as HTMLElement[];

    if (sections.length === 0) {
      console.warn("SectionSnap: No sections found");
      return;
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

    // --- CONTINUOUS SNAP MONITORING ---
    let lastScrollY = lenis.scroll || window.scrollY;
    let isScrolling = false;
    let scrollTimeout: number | null = null;

    const checkAndSnap = () => {
      if (snapping) {
        rafId = requestAnimationFrame(checkAndSnap);
        return;
      }

      // Don't snap while ScrollTrigger is active (hero animation)
      const heroTrigger = document.querySelector("#hero-trigger");
      if (heroTrigger) {
        const triggers = ScrollTrigger.getAll();
        for (const t of triggers) {
          if (t.isActive) {
            rafId = requestAnimationFrame(checkAndSnap);
            return;
          }
        }
      }

      const currentScroll = lenis?.scroll ?? window.scrollY;
      const viewport = window.innerHeight;

      // Find the current section based on scroll position
      let currentIndex = 0;
      let minDistance = Infinity;

      positions.forEach((pos, i) => {
        const distance = Math.abs(currentScroll - pos);
        if (distance < minDistance) {
          minDistance = distance;
          currentIndex = i;
        }
      });

      const currentSectionTop = positions[currentIndex];
      const progress = (currentScroll - currentSectionTop) / viewport;

      // Determine scroll direction
      const scrollDelta = currentScroll - lastScrollY;
      const scrollDirection = scrollDelta > 0 ? 'down' : 'up';
      lastScrollY = currentScroll;

      // Calculate target section
      let targetIndex = currentIndex;
      const distanceFromCurrent = Math.abs(currentScroll - currentSectionTop);

      // If we're not at a section boundary (within 10px), determine where to snap
      if (distanceFromCurrent > 10) {
        if (scrollDirection === 'down') {
          // Scrolling down: if past threshold, go to next section
          if (progress > threshold) {
            targetIndex = Math.min(currentIndex + 1, sections.length - 1);
          } else {
            // Not past threshold, snap to current section
            targetIndex = currentIndex;
          }
        } else {
          // Scrolling up: if we've scrolled less than (1 - threshold), go to previous
          if (progress < (1 - threshold) && progress >= 0) {
            targetIndex = Math.max(currentIndex - 1, 0);
          } else if (progress < 0) {
            // Above current section, go to previous
            targetIndex = Math.max(currentIndex - 1, 0);
          } else {
            // Not past threshold, snap to current section
            targetIndex = currentIndex;
          }
        }
      } else {
        // Already at a section boundary, no snap needed
        rafId = requestAnimationFrame(checkAndSnap);
        return;
      }

      // Snap to target section
      const targetPos = positions[targetIndex];
      const distance = Math.abs(currentScroll - targetPos);

      if (distance > 5 && targetPos !== undefined) {
        snapping = true;
        lenis.scrollTo(targetPos, {
          duration: snapDuration,
          easing: (t) => t * (2 - t), // easeOutQuad
          onComplete: () => {
            snapping = false;
          },
        });
      }

      rafId = requestAnimationFrame(checkAndSnap);
    };

    // Handle scroll events to track scrolling state
    scrollListener = (e: any) => {
      isScrolling = true;
      
      if (scrollTimeout) clearTimeout(scrollTimeout);
      
      scrollTimeout = window.setTimeout(() => {
        isScrolling = false;
      }, 150);
    };

    lenis.on("scroll", scrollListener);

    // Start continuous monitoring
    rafId = requestAnimationFrame(checkAndSnap);

    cleanupFn = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (scrollListener) {
        lenis?.off("scroll", scrollListener);
        scrollListener = null;
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
      }
      window.removeEventListener("resize", resizeHandler);
    };
  };

  // Try to initialize immediately, or wait for Lenis
  if (typeof window !== "undefined") {
    if ((window as any).lenis) {
      init();
    } else {
      // Wait for Lenis to be ready
      checkInterval = window.setInterval(() => {
        if ((window as any).lenis) {
          if (checkInterval) clearInterval(checkInterval);
          checkInterval = null;
          init();
        }
      }, 50);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        if (!lenis) {
          console.warn("SectionSnap: Lenis not available after timeout");
        }
      }, 5000);
    }
  }

  return () => {
    cleanupFn?.();
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    snapping = false;
  };
}

/**
 * Set animation active state (for compatibility with existing code)
 * Note: This is now handled automatically via ScrollTrigger detection
 */
export function setSectionSnapAnimationActive(_active: boolean): void {
  // No-op: handled automatically by ScrollTrigger.isActive check
}
