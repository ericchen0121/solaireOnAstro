import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isScrollDiagnosticsEnabled, logScrollDiag } from "../utils/scrollDiagnostics";

gsap.registerPlugin(ScrollTrigger);

const STATS_SECTION = ".stats-section";
/** Numbers enter from below; on short viewports use px so motion fits within the visible area */
function getNumberFromBottom(): string {
  if (typeof window === "undefined") return "60vh";
  const h = window.innerHeight;
  if (h < 560) return `${Math.round(h * 0.38)}px`;
  return "60vh";
}
const NUMBERS_STAGGER = 0.08;
const NUMBER_DURATION = .8;
const PARAGRAPH_DURATION = 1.25;
/** Scroll stats up and out of frame when leaving toward the video section */
const EXIT_DURATION = 0.55;
const EXIT_OUT_Y = "-100vh";

/**
 * Initial state: numbers and paragraphs start from below the visible area.
 */
function setInitialState(
  numbers: HTMLElement[],
  paragraphs: HTMLElement[],
  fromBottom: string
) {
  gsap.set(numbers, { y: fromBottom as gsap.TweenValue, opacity: 0 });
  gsap.set(paragraphs, { y: fromBottom as gsap.TweenValue, opacity: 0 });
}

/**
 * Reset to initial state (for when user scrolls back up and we want enter to replay).
 */
function resetToInitial(
  numbers: HTMLElement[],
  paragraphs: HTMLElement[],
  fromBottom: string
) {
  gsap.set(numbers, { y: fromBottom as gsap.TweenValue, opacity: 0 });
  gsap.set(paragraphs, { y: fromBottom as gsap.TweenValue, opacity: 0 });
}

/**
 * Stats section: numbers enter from bottom of screen (as if part of the section) with
 * a slight delay between each (1482 → 2007 → 15). When they lock into center, paragraphs
 * come up from the bottom of the screen (100vh) with an opacity animation. On scroll to next
 * section, everything scrolls up and out of frame (clipped by overflow-hidden on the section).
 */
export function initStatsSectionReveal(): () => void {
  const section = document.querySelector(STATS_SECTION);
  if (!section || !(section instanceof HTMLElement)) return () => {};

  const numbers = Array.from(
    section.querySelectorAll<HTMLElement>(".stat-number")
  );
  const paragraphs = Array.from(
    section.querySelectorAll<HTMLElement>(".stat-copy")
  );

  if (numbers.length === 0 || paragraphs.length === 0) return () => {};

  let numberFromBottom = getNumberFromBottom();
  setInitialState(numbers, paragraphs, numberFromBottom);

  const enterTl = gsap.timeline({ paused: true });
  enterTl.to(numbers, {
    y: 0,
    opacity: 1,
    duration: NUMBER_DURATION,
    ease: "power4.inOut",
    stagger: NUMBERS_STAGGER,
  });
  // fromTo so paragraphs always animate UP from bottom of slide with opacity 0→1 (fixes re-enter)
  enterTl.fromTo(
    paragraphs,
    { y: numberFromBottom as gsap.TweenValue, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: PARAGRAPH_DURATION,
      ease: "power4.inOut",
    },
    `-=${NUMBER_DURATION - NUMBERS_STAGGER * 2}`
  );

  const exitTl = gsap.timeline({ paused: true });
  exitTl.to(
    [...numbers, ...paragraphs],
    {
      y: EXIT_OUT_Y as gsap.TweenValue,
      opacity: 1,
      duration: EXIT_DURATION,
      ease: "power2.in",
    },
    0
  );
  // Phone / narrow tablet in any orientation: width alone misses landscape phones (wide but short).
  const isMobileLike =
    typeof window !== "undefined" &&
    Math.min(window.innerWidth, window.innerHeight) < 768;

  // iOS Safari fires `resize` very often while scrolling (dynamic toolbar changes innerHeight).
  // Calling ScrollTrigger.refresh() on every event thrashes layout and causes scroll jitter.
  const RESIZE_REFRESH_DEBOUNCE_MS = 200;
  let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  const flushViewportRefresh = (reason: "resize-debounced" | "orientation") => {
    numberFromBottom = getNumberFromBottom();
    if (isScrollDiagnosticsEnabled()) {
      logScrollDiag("stats-section", `ScrollTrigger.refresh (${reason})`, {
        numberFromBottom,
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
      });
    }
    ScrollTrigger.refresh();
  };

  /** Keep numberFromBottom in sync on every resize; debounce only the expensive ST.refresh (iOS toolbar). */
  const onWindowResize = () => {
    numberFromBottom = getNumberFromBottom();
    if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = window.setTimeout(() => {
      resizeDebounceTimer = null;
      flushViewportRefresh("resize-debounced");
    }, RESIZE_REFRESH_DEBOUNCE_MS);
  };

  const onOrientationChange = () => {
    if (resizeDebounceTimer !== null) {
      clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = null;
    }
    flushViewportRefresh("orientation");
  };

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("orientationchange", onOrientationChange);

  if (isMobileLike) {
    // Mobile UX: animate in once when the stats section first comes into view,
    // then keep the stats visible while the user scrolls through and past.
    const mobileTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top 85%",
      end: "bottom 20%",
      once: true,
      onEnter: () => {
        if (isScrollDiagnosticsEnabled()) {
          logScrollDiag("stats-section", "mobile trigger onEnter (once)", {
            scrollY: Math.round(window.scrollY),
          });
        }
        enterTl.play();
      },
      // If user scrolls back up before the first animation completes, replay it cleanly.
      onEnterBack: () => {
        if (isScrollDiagnosticsEnabled()) {
          logScrollDiag("stats-section", "mobile trigger onEnterBack", {
            scrollY: Math.round(window.scrollY),
            enterProgress: enterTl.progress(),
          });
        }
        if (enterTl.progress() < 1) {
          enterTl.pause(0);
          resetToInitial(numbers, paragraphs, numberFromBottom);
          enterTl.play();
        } else {
          // Ensure everything is fully visible if they re-enter after it has played.
          gsap.to([...numbers, ...paragraphs], {
            y: 0,
            opacity: 1,
            duration: 0.25,
            overwrite: true,
          });
        }
      },
    });

    return () => {
      if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      mobileTrigger.kill();
      enterTl.kill();
      exitTl.kill();
    };
  }

  // Tablet/desktop: enter in view, exit upward when scrolling down past the section toward video;
  // re-enter from below replays enter (same trigger zone).
  const enterExitTrigger = ScrollTrigger.create({
    trigger: section,
    start: "top 82%",
    end: "bottom 15%",
    onEnter: () => {
      if (isScrollDiagnosticsEnabled()) {
        logScrollDiag("stats-section", "desktop enterExit onEnter", {
          scrollY: Math.round(window.scrollY),
        });
      }
      enterTl.play();
    },
    onLeave: () => {
      if (isScrollDiagnosticsEnabled()) {
        logScrollDiag("stats-section", "desktop enterExit onLeave → exitTl", {
          scrollY: Math.round(window.scrollY),
          enterProgress: enterTl.progress(),
        });
      }
      if (enterTl.progress() < 1) enterTl.progress(1);
      exitTl.restart();
    },
    onEnterBack: () => {
      if (isScrollDiagnosticsEnabled()) {
        logScrollDiag("stats-section", "desktop enterExit onEnterBack", {
          scrollY: Math.round(window.scrollY),
        });
      }
      exitTl.pause();
      exitTl.progress(0);
      enterTl.pause();
      enterTl.progress(0);
      resetToInitial(numbers, paragraphs, numberFromBottom);
      enterTl.play();
    },
    onLeaveBack: () => {
      if (isScrollDiagnosticsEnabled()) {
        logScrollDiag("stats-section", "desktop enterExit onLeaveBack", {
          scrollY: Math.round(window.scrollY),
        });
      }
      resetToInitial(numbers, paragraphs, numberFromBottom);
      enterTl.pause();
      enterTl.progress(0);
    },
  });

  return () => {
    if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer);
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("orientationchange", onOrientationChange);
    enterExitTrigger.kill();
    enterTl.kill();
    exitTl.kill();
  };
}
