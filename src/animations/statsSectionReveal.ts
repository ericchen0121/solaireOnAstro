import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATS_SECTION = ".stats-section";
/** Numbers enter from bottom of screen (full viewport height), with stagger between each */
const NUMBER_FROM_BOTTOM = "60vh";
const NUMBERS_STAGGER = 0.08;
const NUMBER_DURATION = .8;
const PARAGRAPH_DURATION = 1.25;
/** Scroll stats up and out of frame when leaving toward the video section */
const EXIT_DURATION = 0.55;
const EXIT_OUT_Y = "-100vh";

/**
 * Initial state: numbers and paragraphs start from bottom of screen (100vh below).
 */
function setInitialState(numbers: HTMLElement[], paragraphs: HTMLElement[]) {
  gsap.set(numbers, { y: NUMBER_FROM_BOTTOM as gsap.TweenValue, opacity: 0 });
  gsap.set(paragraphs, { y: NUMBER_FROM_BOTTOM as gsap.TweenValue, opacity: 0 });
}

/**
 * Reset to initial state (for when user scrolls back up and we want enter to replay).
 */
function resetToInitial(numbers: HTMLElement[], paragraphs: HTMLElement[]) {
  gsap.set(numbers, { y: NUMBER_FROM_BOTTOM as gsap.TweenValue, opacity: 0 });
  gsap.set(paragraphs, { y: NUMBER_FROM_BOTTOM as gsap.TweenValue, opacity: 0 });
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

  setInitialState(numbers, paragraphs);

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
    { y: NUMBER_FROM_BOTTOM as gsap.TweenValue, opacity: 0 },
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
  // Mobile vs tablet/desktop behavior (width-based breakpoints)
  const isMobileLike =
    typeof window !== "undefined" && window.innerWidth < 768;

  if (isMobileLike) {
    // Mobile UX: animate in once when the stats section first comes into view,
    // then keep the stats visible while the user scrolls through and past.
    const mobileTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top 85%",
      end: "bottom 20%",
      once: true,
      onEnter: () => {
        enterTl.play();
      },
      // If user scrolls back up before the first animation completes, replay it cleanly.
      onEnterBack: () => {
        if (enterTl.progress() < 1) {
          enterTl.pause(0);
          resetToInitial(numbers, paragraphs);
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
    onEnter: () => enterTl.play(),
    onLeave: () => {
      if (enterTl.progress() < 1) enterTl.progress(1);
      exitTl.restart();
    },
    onEnterBack: () => {
      exitTl.pause();
      exitTl.progress(0);
      enterTl.pause();
      enterTl.progress(0);
      resetToInitial(numbers, paragraphs);
      enterTl.play();
    },
    onLeaveBack: () => {
      resetToInitial(numbers, paragraphs);
      enterTl.pause();
      enterTl.progress(0);
    },
  });

  return () => {
    enterExitTrigger.kill();
    enterTl.kill();
    exitTl.kill();
  };
}
