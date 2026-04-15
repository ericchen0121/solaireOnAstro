import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { gsap } from "gsap";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Optional per-section overrides
const VIDEO_SECTION_CLASS = "video-section";
const VIDEO_SNAP_DURATION = 0.9; // slightly longer snap just for video slide

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

/** After snap ends, keep suppressing hover so :hover doesn’t fire as content settles under the cursor */
const SECTION_SNAP_HOVER_SUPPRESS_MS = 320;
let sectionSnapHoverSuppressTimer: ReturnType<typeof setTimeout> | null = null;

function setSectionSnapHoverSuppressed(on: boolean) {
  if (typeof document === "undefined") return;
  if (sectionSnapHoverSuppressTimer) {
    clearTimeout(sectionSnapHoverSuppressTimer);
    sectionSnapHoverSuppressTimer = null;
  }
  if (on) {
    document.body.classList.add("section-snap-scrolling");
    document.body.classList.remove("nav-or-text-hovered");
  } else {
    document.body.classList.remove("section-snap-scrolling");
  }
}

function scheduleEndSectionSnapHoverSuppress() {
  if (typeof document === "undefined") return;
  if (sectionSnapHoverSuppressTimer) {
    clearTimeout(sectionSnapHoverSuppressTimer);
  }
  sectionSnapHoverSuppressTimer = setTimeout(() => {
    document.body.classList.remove("section-snap-scrolling");
    sectionSnapHoverSuppressTimer = null;
  }, SECTION_SNAP_HOVER_SUPPRESS_MS);
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function initSectionSnap(options: SectionSnapOptions = {}): () => void {
  const {
    threshold = 0.15,
    snapDuration = 0.65,
    sections: selectors,
    ease = "expo.inOut",
  } = options;

  // Desktop-only: enable snapping only for wide viewports (≥1200px).
  if (typeof window !== "undefined" && window.innerWidth < 1200) {
    return () => {};
  }

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
      : (Array.from(document.querySelectorAll("section")) as HTMLElement[]);

    const videoSectionIndex = sections.findIndex((el) =>
      el.classList.contains(VIDEO_SECTION_CLASS)
    );

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
      setSectionSnapHoverSuppressed(true);

      // Compute effective duration (allow special-case for video slide)
      const isVideoTransition =
        videoSectionIndex !== -1 &&
        (index === videoSectionIndex || currentIndex === videoSectionIndex);
      const effectiveDuration = isVideoTransition
        ? VIDEO_SNAP_DURATION
        : snapDuration;

      currentIndex = index;

      // Kill any existing scroll animation
      if (scrollTimeline) {
        scrollTimeline.kill();
        scrollTimeline = null;
      }

      // Create a timeline for smooth, controlled scroll animation
      scrollTimeline = gsap.timeline({
        onComplete: () => {
          animating = false;
          scrollTimeline = null;
          // Start cooldown from when snap finishes so one gesture can't trigger two section moves
          lastWheelTime = Date.now();
          processingWheel = false;
          processingTouch = false;
          scheduleEndSectionSnapHoverSuppress();
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
        duration: effectiveDuration,
        ease,
      });
    };

    // --- LISTEN TO WHEEL EVENTS ---
    // This immediately hijacks scroll and animates with GSAP
    let lastWheelTime = 0;
    // Cooldown after snap *completes* (see onComplete) so one scroll gesture = one section move
    const wheelThrottle = 800;
    let lastProcessedIndex = -1;

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
      if (actualCurrentIndex === lastProcessedIndex && now - lastWheelTime < wheelThrottle) {
        return;
      }

      // Set processing lock immediately; cooldown (lastWheelTime) is set when snap completes
      processingWheel = true;
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
    // Mobile gets natural scroll; desktop gets wheel-based snapping
    const mobile = isMobile();
    
    if (!mobile) {
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
      
      // Add wheel listener only on desktop
      window.addEventListener("wheel", wheelListener, { passive: false });
      console.log("🖥️ SectionSnap: Desktop - wheel and touch snapping enabled");
    } else {
      console.log("📱 SectionSnap: Mobile detected - snapping disabled, using natural scroll");
    }


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
      setSectionSnapHoverSuppressed(false);
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
