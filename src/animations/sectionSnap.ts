import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { gsap } from "gsap";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

interface SectionSnapOptions {
  threshold?: number; // scroll % before advancing (0–1)
  snapDuration?: number;
  sections?: string[];
  ease?: string;
}

let currentIndex = -1;
let animating = false;
let sections: HTMLElement[] = [];
let scrollTimeline: gsap.core.Timeline | null = null;
let pinTrigger: ScrollTrigger | null = null;
let processingWheel = false; // Lock to prevent multiple wheel events
let processingTouch = false; // Lock to prevent multiple touch events

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function initSectionSnap(options: SectionSnapOptions = {}): () => void {
  const {
    threshold = 0.15,
    snapDuration = 0.35,
    sections: selectors,
    ease = "power4.in",
  } = options;

  let cleanupFn: (() => void) | null = null;
  let wheelListener: ((e: WheelEvent) => void) | null = null;
  let touchStartY = 0;
  let touchListener: ((e: TouchEvent) => void) | null = null;

  const init = () => {
    console.log("🔧 SectionSnap: Initializing...");

    // --- GET SECTIONS ---
    sections = selectors
      ? selectors
          .map((sel) => document.querySelector(sel) as HTMLElement)
          .filter((el) => el !== null)
      : Array.from(document.querySelectorAll("section")) as HTMLElement[];

    console.log(`📋 SectionSnap: Found ${sections.length} sections`, sections);

    if (sections.length === 0) {
      console.warn("❌ SectionSnap: No sections found");
      return;
    }

    // Initialize current index to first section
    currentIndex = 0;
    console.log(`📍 SectionSnap: Starting at index ${currentIndex}`);

    // --- GO TO SECTION FUNCTION ---
    const gotoSection = (index: number, isScrollingDown: boolean) => {
      if (animating) {
        return;
      }

      // Clamp index to valid range
      if (index < 0) {
        index = 0;
      } else if (index >= sections.length) {
        index = sections.length - 1;
      }

      // ENFORCE: Only allow snapping to adjacent sections (never skip)
      const indexDiff = index - currentIndex;
      
      if (indexDiff > 1) {
        index = currentIndex + 1;
        console.log(`⚠️ SectionSnap: Prevented skip forward, clamping to next section ${index}`);
      } else if (indexDiff < -1) {
        index = currentIndex - 1;
        console.log(`⚠️ SectionSnap: Prevented skip backward, clamping to previous section ${index}`);
      }

      // If already at target and aligned, don't animate
      if (index === currentIndex) {
        const currentSection = sections[index];
        if (currentSection) {
          const currentScroll = window.scrollY;
          const targetPos = currentSection.offsetTop;
          const distanceFromTarget = Math.abs(currentScroll - targetPos);
          
          if (distanceFromTarget <= 5) {
            return; // Already aligned
          }
        } else {
          return;
        }
      }

      const targetSection = sections[index];
      if (!targetSection) {
        return;
      }

      const targetPos = targetSection.offsetTop;
      const currentPos = window.scrollY;
      console.log(`📍 SectionSnap: Snapping from ${currentPos.toFixed(0)}px to section ${index} at ${targetPos}px`);

      animating = true;
      currentIndex = index;

      // Kill any existing scroll animation
      if (scrollTimeline) {
        scrollTimeline.kill();
        scrollTimeline = null;
      }

      // Create a timeline for smooth, controlled scroll animation
      scrollTimeline = gsap.timeline({
        onComplete: () => {
          console.log(`✅ SectionSnap: Snap complete, now at index ${index}`);
          animating = false;
          scrollTimeline = null;
          // Release processing locks
          processingWheel = false;
          processingTouch = false;
        },
      });

      // Immediately stop any current scroll momentum
      scrollTimeline.set(window, {
        scrollTo: { y: currentPos, autoKill: false },
        immediateRender: true,
      });

      // Then animate to target with smooth easing
      scrollTimeline.to(window, {
        scrollTo: {
          y: targetPos,
          autoKill: false,
        },
        duration: snapDuration,
        ease,
      });
    };

    // --- LISTEN TO WHEEL EVENTS ---
    // This immediately hijacks scroll and animates with GSAP
    let lastWheelTime = 0;
    const wheelThrottle = 1200; // Increased throttle to prevent rapid firing
    let lastProcessedIndex = -1; // Track the last section we processed to prevent double-processing

    wheelListener = (e: WheelEvent) => {
      // Always prevent default to stop natural scrolling (desktop behavior)
      e.preventDefault();
      e.stopPropagation();

      // Don't process if animating or already processing
      if (animating || processingWheel) {
        return;
      }

      const now = Date.now();
      if (now - lastWheelTime < wheelThrottle) {
        return;
      }

      // CRITICAL: Use the actual scroll position to determine current section, not currentIndex
      // This prevents race conditions with ScrollTrigger callbacks
      const currentScrollY = window.scrollY;
      let actualCurrentIndex = 0;
      let minDistance = Infinity;
      
      // Find which section we're actually closest to
      for (let i = 0; i < sections.length; i++) {
        const sectionTop = sections[i].offsetTop;
        const distance = Math.abs(currentScrollY - sectionTop);
        if (distance < minDistance) {
          minDistance = distance;
          actualCurrentIndex = i;
        }
      }

      // If we just processed this index, ignore (prevent double-processing)
      if (actualCurrentIndex === lastProcessedIndex && now - lastWheelTime < wheelThrottle * 2) {
        return;
      }

      // Set processing lock immediately
      processingWheel = true;
      lastWheelTime = now;
      lastProcessedIndex = actualCurrentIndex;

      // Determine scroll direction
      const deltaY = e.deltaY;
      const isScrollingDown = deltaY > 0;

      // Don't process if at boundaries
      if (isScrollingDown && actualCurrentIndex >= sections.length - 1) {
        processingWheel = false;
        return;
      }
      if (!isScrollingDown && actualCurrentIndex <= 0) {
        processingWheel = false;
        return;
      }

      // CRITICAL: Always go to exactly adjacent section, never skip
      const targetIndex = isScrollingDown ? actualCurrentIndex + 1 : actualCurrentIndex - 1;
      
      // Double-check we're only going one section away
      if (Math.abs(targetIndex - actualCurrentIndex) !== 1) {
        console.warn(`⚠️ SectionSnap: Invalid target index ${targetIndex} from ${actualCurrentIndex}, aborting`);
        processingWheel = false;
        return;
      }

      // Immediately snap to adjacent section only
      if (isScrollingDown) {
        console.log(`⬇️ SectionSnap: Wheel down detected, snapping from section ${actualCurrentIndex} to ${targetIndex}`);
      } else {
        console.log(`⬆️ SectionSnap: Wheel up detected, snapping from section ${actualCurrentIndex} to ${targetIndex}`);
      }
      
      gotoSection(targetIndex, isScrollingDown);
    };

    // --- TOUCH EVENTS: Disable snapping entirely on mobile ---
    // Mobile gets natural scroll with Lenis; desktop gets wheel-based snapping
    if (!isMobile()) {
      let lastTouchTime = 0;
      const touchThrottle = 800;

      touchListener = (e: TouchEvent) => {
        if (animating || processingTouch) {
          return;
        }

        if (e.type === "touchstart") {
          touchStartY = e.touches[0].clientY;
          return;
        }

        if (e.type === "touchmove") {
          const now = Date.now();
          if (now - lastTouchTime < touchThrottle) {
            return;
          }

          const touchY = e.touches[0].clientY;
          const deltaY = touchStartY - touchY;
          const minSwipePx = 30;
          if (Math.abs(deltaY) < minSwipePx) {
            return;
          }

          const isScrollingDown = deltaY < 0;
          e.preventDefault();

          // Use closest section logic (desktop behavior)
          const currentScrollY = window.scrollY;
          let actualCurrentIndex = 0;
          let minDistance = Infinity;
          for (let i = 0; i < sections.length; i++) {
            const sectionTop = sections[i].offsetTop;
            const distance = Math.abs(currentScrollY - sectionTop);
            if (distance < minDistance) {
              minDistance = distance;
              actualCurrentIndex = i;
            }
          }

          // Don't process if at boundaries
          if (isScrollingDown && actualCurrentIndex >= sections.length - 1) {
            return;
          }
          if (!isScrollingDown && actualCurrentIndex <= 0) {
            return;
          }

          processingTouch = true;
          lastTouchTime = now;

          const targetIndex = isScrollingDown ? actualCurrentIndex + 1 : actualCurrentIndex - 1;
          
          if (Math.abs(targetIndex - actualCurrentIndex) !== 1) {
            console.warn(`⚠️ SectionSnap: Invalid touch target index ${targetIndex} from ${actualCurrentIndex}, aborting`);
            processingTouch = false;
            return;
          }

          console.log(`📱 SectionSnap: Touch snap from section ${actualCurrentIndex} to ${targetIndex} (desktop/trackpad)`);
          gotoSection(targetIndex, isScrollingDown);
          touchStartY = touchY;
        }
      };

      // Add touch listeners only on non-mobile (desktop trackpad/touchscreen)
      window.addEventListener("touchstart", touchListener, { passive: false });
      window.addEventListener("touchmove", touchListener, { passive: false });
    } else {
      console.log("📱 SectionSnap: Mobile detected - touch snapping disabled, using natural scroll");
    }

    // Add wheel listener (desktop only behavior, but works on all devices that have wheel)
    window.addEventListener("wheel", wheelListener, { passive: false });

    console.log("✅ SectionSnap: Wheel and touch listeners added");

    // --- CREATE SCROLL TRIGGER TO TRACK CURRENT SECTION ---
    const firstSection = sections[0];
    
    pinTrigger = ScrollTrigger.create({
      trigger: firstSection,
      start: "top top",
      end: `bottom+=${(sections.length - 1) * window.innerHeight} top`,
      pin: false,
      onEnter: () => {
        console.log("🚪 SectionSnap: Entered snap zone");
        // Desktop only: snap back to first section when re-entering zone (e.g. scroll up).
        // On mobile this causes unwanted pull-back to RochatSolaire when user intended to scroll down.
        if (!isMobile() && currentIndex !== 0 && !animating) {
          gotoSection(0, true);
        }
      },
      onLeave: () => {
        console.log("🚪 SectionSnap: Left snap zone");
      },
      onEnterBack: () => {
        console.log("🚪 SectionSnap: Entered back to snap zone");
      },
      onLeaveBack: () => {
        console.log("🚪 SectionSnap: Left snap zone (back)");
      },
    });

    console.log("✅ SectionSnap: Pin trigger created");

    // Track current section with ScrollTriggers
    sections.forEach((section, index) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom top",
        onEnter: () => {
          // Only update if not animating AND not processing wheel/touch events
          // This prevents race conditions where ScrollTrigger updates during wheel processing
          if (!animating && !processingWheel && !processingTouch) {
            currentIndex = index;
            console.log(`📍 SectionSnap: Current index updated to ${index}`);
          }
        },
        onEnterBack: () => {
          // Only update if not animating AND not processing wheel/touch events
          if (!animating && !processingWheel && !processingTouch) {
            currentIndex = index;
            console.log(`📍 SectionSnap: Current index updated to ${index} (back)`);
          }
        },
      });
    });

    cleanupFn = () => {
      if (wheelListener) {
        window.removeEventListener("wheel", wheelListener);
        wheelListener = null;
      }
      if (touchListener && !isMobile()) {
        window.removeEventListener("touchstart", touchListener);
        window.removeEventListener("touchmove", touchListener);
        touchListener = null;
      }
      if (scrollTimeline) {
        scrollTimeline.kill();
        scrollTimeline = null;
      }
      if (pinTrigger) {
        pinTrigger.kill();
        pinTrigger = null;
      }
      ScrollTrigger.getAll().forEach((st) => {
        if (st.vars?.trigger && sections.includes(st.vars.trigger as HTMLElement)) {
          st.kill();
        }
      });
      animating = false;
    };
  };

  // Initialize when DOM is ready
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  return () => {
    cleanupFn?.();
  };
}

export function setSectionSnapAnimationActive(_active: boolean): void {
  // No-op: handled automatically by ScrollTrigger detection
}
