import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Initialize scroll-triggered letter reveal animation
 * Letters fade from 0 to 1 opacity with stagger when section enters viewport
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

  // Split text into characters
  const split = new SplitText(container, { type: 'chars' });
  const chars = split.chars as HTMLElement[];

  // Set initial state: invisible
  gsap.set(chars, {
    opacity: 0,
  });

  // Create ScrollTrigger to animate when section enters viewport
  const trigger = ScrollTrigger.create({
    trigger: container,
    start: 'top 80%', // Start animation when top of element is 80% down the viewport
    once: true, // Only trigger once
    onEnter: () => {
      // Animate letters from 0 to 1 opacity with stagger
      gsap.to(chars, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        stagger,
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

