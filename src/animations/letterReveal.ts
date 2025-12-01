import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/**
 * Initialize letter reveal animation on elements with spans
 * @param selector - CSS selector for the container element
 * @param delay - Delay before animation starts (default: 0)
 * @param stagger - Time between each character reveal (default: 0.05)
 */
export function initLetterReveal(
  selector: string,
  delay: number = 0,
  stagger: number = 0.05
): void {
  const container = document.querySelector(selector);
  if (!container) return;

  const spans = container.querySelectorAll('span');
  if (spans.length === 0) return;

  const allChars: HTMLElement[] = [];

  // Split every span into characters
  spans.forEach((span) => {
    const split = new SplitText(span, { type: 'chars' });
    allChars.push(...split.chars);
  });

  // Initial state: invisible + slight downward offset
  gsap.set(allChars, {
    opacity: 0.05,
    y: 1,
  });

  // "Hard cut" typing — characters switch on instantly, one by one
  gsap.to(allChars, {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    duration: 0, // instant pop
    ease: 'none',
    stagger,
    delay,
  });
}


