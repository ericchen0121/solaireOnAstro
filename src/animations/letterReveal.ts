import { gsap } from 'gsap';
// @ts-ignore - SplitText is a free bonus plugin
import SplitText from 'gsap/SplitText';

// Register SplitText plugin
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
  if (!container) {
    return;
  }

  const allSpans = container.querySelectorAll('span');
  const spans = Array.from(allSpans).filter((s) => {
    if (s.classList.contains('hero-cursor')) return false;
    // Only include spans that are actually visible (desktop vs mobile)
    const style = window.getComputedStyle(s);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });
  if (spans.length === 0) {
    return;
  }

  const allChars: HTMLElement[] = [];

  // Split every span into characters (skip hero-cursor)
  spans.forEach((span) => {
    try {
      const split = new SplitText(span as HTMLElement, { type: 'chars' });
      if (split.chars && split.chars.length > 0) {
        allChars.push(...(split.chars as HTMLElement[]));
      }
    } catch (error) {
      console.error('LetterReveal: Error splitting text', error, span);
    }
  });

  if (allChars.length === 0) {
    return;
  }

  // Initial state: fully hidden (no faint text underneath)
  gsap.set(allChars, {
    opacity: 0,
    y: 1,
  });

  // Blinking cursor: position in front of the reveal, advance with each character
  const cursor = container.querySelector('.hero-cursor') as HTMLElement | null;
  const containerRect = () => (container as HTMLElement).getBoundingClientRect();
  const setCursorAfterChar = (charEl: HTMLElement) => {
    if (!cursor) return;
    const cr = containerRect();
    const charRect = charEl.getBoundingClientRect();
    if (charRect.width === 0 && charRect.height === 0) return; // skip hidden (e.g. mobile-only on desktop)
    const cursorHeight = cursor.getBoundingClientRect().height || charRect.height * 1.25;
    const top = charRect.top - cr.top + (charRect.height / 2) - (cursorHeight / 2);
    gsap.set(cursor, {
      left: `${charRect.right - cr.left}px`,
      top: `${top}px`,
    });
  };
  const lastVisibleChar = () => {
    for (let i = allChars.length - 1; i >= 0; i--) {
      const r = allChars[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return allChars[i];
    }
    return allChars[allChars.length - 1];
  };

  if (cursor) {
    cursor.style.display = 'inline-block';
    gsap.set(cursor, { left: '0px', top: '0px', opacity: 1 });
    
    // Disable CSS animation, we'll control blink with GSAP for precise timing
    cursor.style.animation = 'none';
    
    // Initial blink before typing starts (0.5s on, 0.5s off)
    const initialBlinkTl = gsap.timeline({ repeat: -1 });
    initialBlinkTl.to(cursor, { opacity: 1, duration: 0.5, ease: 'none' })
                  .to(cursor, { opacity: 0, duration: 0.5, ease: 'none' });
    
    // Stop initial blink and make solid when typing starts
    gsap.delayedCall(delay, () => {
      initialBlinkTl.kill();
      gsap.set(cursor, { opacity: 1 });
    });
  }

  // "Hard cut" typing — characters switch on instantly, one by one
  const lastCharIndex = allChars.length - 1;
  
  allChars.forEach((char, i) => {
    gsap.to(char, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0,
      ease: 'none',
      delay: delay + i * stagger,
      onComplete: () => {
        // Move cursor after each character appears
        if (cursor) setCursorAfterChar(char);
        
        // When last character completes, start blink 50ms later
        if (i === lastCharIndex && cursor) {
          gsap.delayedCall(0.05, () => {
            const endBlinkTl = gsap.timeline({ repeat: -1 });
            // Cursor is already on, so: stay on briefly, off for 0.5s, on for 0.5s
            endBlinkTl.to(cursor, { opacity: 1, duration: 0.05, ease: 'none' })
                      .to(cursor, { opacity: 0, duration: 0.5, ease: 'none' })
                      .to(cursor, { opacity: 1, duration: 0.5, ease: 'none' });
          });
          setCursorAfterChar(lastVisibleChar());
        }
      }
    });
  });
}


