import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getLenis } from "./gsapLenis";

export function syncScrollTriggerWithLenis() {
  const lenis = getLenis();
  if (!lenis) return;

  // Update ScrollTrigger on Lenis scroll
  lenis.on("scroll", ScrollTrigger.update);

  // Proxy body scroll through Lenis
  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length && typeof value === 'number') {
        lenis.scrollTo(value, { immediate: true });
      }
      return lenis.scroll ?? 0;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
    pinType: document.body.style.transform ? "transform" : "fixed",
  });

  ScrollTrigger.defaults({ scroller: document.body });
}
