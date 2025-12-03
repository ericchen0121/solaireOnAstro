import { gsap } from 'gsap';
// @ts-ignore - SplitText is a free bonus plugin
import SplitText from 'gsap/SplitText';

// Register SplitText plugin
gsap.registerPlugin(SplitText);
console.log('✅ SplitText registered:', typeof SplitText);

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
  console.log(`🔤 LetterReveal: Initializing for selector "${selector}"`);
  
  const container = document.querySelector(selector);
  if (!container) {
    console.warn(`LetterReveal: Container not found for selector "${selector}"`);
    return;
  }
  console.log(`✅ LetterReveal: Container found`, container);

  const spans = container.querySelectorAll('span');
  if (spans.length === 0) {
    console.warn(`LetterReveal: No spans found in container "${selector}"`);
    return;
  }
  console.log(`✅ LetterReveal: Found ${spans.length} spans`, spans);

  const allChars: HTMLElement[] = [];

  // Split every span into characters
  spans.forEach((span, index) => {
    try {
      console.log(`🔤 LetterReveal: Splitting span ${index + 1}`, span);
      const split = new SplitText(span as HTMLElement, { type: 'chars' });
      if (split.chars && split.chars.length > 0) {
        console.log(`✅ LetterReveal: Split span ${index + 1} into ${split.chars.length} characters`);
        allChars.push(...(split.chars as HTMLElement[]));
      } else {
        console.warn(`⚠️ LetterReveal: Split span ${index + 1} produced no characters`);
      }
    } catch (error) {
      console.error('LetterReveal: Error splitting text', error, span);
    }
  });

  if (allChars.length === 0) {
    console.warn(`LetterReveal: No characters found after splitting`);
    return;
  }
  console.log(`✅ LetterReveal: Total characters to animate: ${allChars.length}`);

  // Initial state: invisible + slight downward offset
  gsap.set(allChars, {
    opacity: 0.05,
    y: 1,
  });

  // "Hard cut" typing — characters switch on instantly, one by one
  console.log(`🎬 LetterReveal: Starting animation with delay=${delay}, stagger=${stagger}`);
  gsap.to(allChars, {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    duration: 0, // instant pop
    ease: 'none',
    stagger,
    delay,
    onComplete: () => {
      console.log(`✅ LetterReveal: Animation complete!`);
    },
  });
}


