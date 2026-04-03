import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isScrollDiagnosticsEnabled, logScrollDiag } from "../utils/scrollDiagnostics";

gsap.registerPlugin(ScrollTrigger);

const VIDEO_SECTION_SELECTOR = ".video-section";

/**
 * Video slide behaviour:
 * - Entering from above (from stats): video starts at scale 1 (full-screen).
 * - Scrolling through this slide toward the next: video scales 1 → 0.8,
 *   revealing black background around it.
 * - Scrolling back up from the next slide: scale reverses 0.8 → 1.
 */
export function initVideoSectionScale(): () => void {
  const section = document.querySelector(VIDEO_SECTION_SELECTOR);
  if (!section || !(section instanceof HTMLElement)) return () => {};

  const video = section.querySelector("video");
  if (!video || !(video instanceof HTMLVideoElement)) return () => {};

  // Ensure transform origin and starting scale are centered/full-screen
  gsap.set(video, {
    transformOrigin: "50% 50%",
    scale: 1,
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      // Start scaling once the slide is fully \"engaged\" (around center),
      // so entering from above shows it at 1.0
      start: "center center",
      // Finish scaling as we approach the next slide
      end: "bottom top",
      // scrub: true uses ~1s catch-up smoothing and can feel like scroll "sticks" on slow drags;
      // 0 ties scale directly to scroll position (still smooth when flicking).
      scrub: 0,
      onEnter: () => {
        if (isScrollDiagnosticsEnabled()) {
          logScrollDiag("video-section", "ScrollTrigger onEnter", {
            scrollY: Math.round(window.scrollY),
          });
        }
      },
      onLeave: () => {
        if (isScrollDiagnosticsEnabled()) {
          logScrollDiag("video-section", "ScrollTrigger onLeave", {
            scrollY: Math.round(window.scrollY),
          });
        }
      },
      onEnterBack: () => {
        if (isScrollDiagnosticsEnabled()) {
          logScrollDiag("video-section", "ScrollTrigger onEnterBack", {
            scrollY: Math.round(window.scrollY),
          });
        }
      },
      onLeaveBack: () => {
        if (isScrollDiagnosticsEnabled()) {
          logScrollDiag("video-section", "ScrollTrigger onLeaveBack", {
            scrollY: Math.round(window.scrollY),
          });
        }
      },
    },
  });

  // Scale from 1 → 0.8 while in this window; scrub handles both directions
  tl.fromTo(
    video,
    { scale: 1 },
    {
      scale: 0.7,
      // Linear so the scale change clearly tracks scroll position
      ease: "none",
    }
  );

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

