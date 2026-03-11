import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATS_SECTION = ".stats-section";
/** Numbers enter from bottom of screen (full viewport height), with stagger between each */
const NUMBER_FROM_BOTTOM = "60vh";
const NUMBERS_STAGGER = 0.08;
const NUMBER_DURATION = .8;
const PARAGRAPH_DURATION = 1.25;
const EXIT_DURATION = 0.3;

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
 * section, everything exits together at top of frame.
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
      y: -60,
      opacity: 0,
      duration: EXIT_DURATION,
      ease: "power2.in",
    },
    0
  );

  const enterTrigger = ScrollTrigger.create({
    trigger: section,
    start: "top 82%",
    end: "bottom 15%",
    onEnter: () => enterTl.play(),
    onEnterBack: () => {
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

  const exitTrigger = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    onEnter: () => exitTl.play(),
    onLeaveBack: () => {
      exitTl.pause();
      exitTl.progress(0);
      resetToInitial(numbers, paragraphs);
    },
  });

  return () => {
    enterTrigger.kill();
    exitTrigger.kill();
    enterTl.kill();
    exitTl.kill();
  };
}
