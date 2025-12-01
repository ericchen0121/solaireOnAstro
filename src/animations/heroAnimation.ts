import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

/**
 * Example hero animation that triggers on scroll
 * This is disabled by default - uncomment the function call to enable
 */
export function initHeroAnimation() {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top 80%',
      end: 'bottom 20%',
      scrub: true,
    },
  });

  tl.from('.hero-title', { opacity: 0, y: 80 });
}

// Uncomment the line below to enable this animation
// if (typeof window !== 'undefined') {
//   initHeroAnimation();
// }


