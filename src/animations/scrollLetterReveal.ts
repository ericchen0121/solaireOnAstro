import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Initialize scroll-triggered letter reveal animation
 * Characters fade in with GSAP autoAlpha + stagger when section enters viewport
 * @param selector - CSS selector for the container element
 * @param stagger - Time between each character reveal (default: 0.1)
 */
export function initScrollLetterReveal(
  selector: string,
  stagger: number = 0.1
): () => void {
  const container = document.querySelector(selector);
  if (!container) {
    console.warn(`ScrollLetterReveal: Element not found: ${selector}`);
    return () => {};
  }

  const split = new SplitText(container, {
    type: 'words,chars',
    tag: 'span',
    wordsClass: 'scroll-split-word',
    charsClass: 'scroll-split-char',
  });
  const chars = split.chars as HTMLElement[];

  /* autoAlpha (opacity + visibility) avoids WebKit painting semi-rasterized glyphs at opacity:0 during stagger — Safari “micro rewrite” glitch */
  gsap.set(chars, {
    autoAlpha: 0,
    force3D: true,
  });

  // Create ScrollTrigger to animate when section enters viewport
  const trigger = ScrollTrigger.create({
    trigger: container,
    start: 'top 80%', // Start animation when top of element is 80% down the viewport
    once: true, // Only trigger once
    onEnter: () => {
      gsap.to(chars, {
        autoAlpha: 1,
        duration: 0.6,
        ease: 'power2.out',
        stagger,
        force3D: true,
      });
    },
  });

  // Return cleanup function
  return () => {
    trigger.kill();
    // Revert SplitText if needed
    if (split.revert) {
      split.revert();
    }
  };
}

