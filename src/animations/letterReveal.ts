import { gsap } from 'gsap';
// @ts-ignore - SplitText is a free bonus plugin
import SplitText from 'gsap/SplitText';

// Register SplitText plugin
gsap.registerPlugin(SplitText);

/**
 * Homepage hero only: default `false` — cursor hides when typing finishes.
 * Set to `true` for a blinking caret after the last character.
 */
export const HERO_END_CURSOR_BLINK = false;

export type LetterRevealOptions = {
  /**
   * When `true` (default), cursor keeps blinking after the last character.
   * When `false`, cursor is hidden once typing completes.
   */
  endCursorBlink?: boolean;
};

/**
 * Initialize letter reveal animation on elements with spans
 * @param selector - CSS selector for the container element
 * @param delay - Delay before animation starts (default: 0)
 * @param stagger - Time between each character reveal (default: 0.05)
 */
const noopCleanup = () => {};

/** Wall-clock duration for the typing reveal (delay + stagger × chars + buffer). */
export function letterRevealDurationMs(
  charCount: number,
  delay = 0.45,
  stagger = 0.05,
  bufferMs = 700,
): number {
  return Math.ceil((delay + charCount * stagger) * 1000) + bufferMs;
}

export function initLetterReveal(
  selector: string,
  delay: number = 0,
  stagger: number = 0.05,
  options: LetterRevealOptions = {},
): () => void {
  const endCursorBlink = options.endCursorBlink ?? true;
  const container = document.querySelector(selector);
  if (!container) {
    return noopCleanup;
  }

  const allSpans = container.querySelectorAll('span');
  const spans = Array.from(allSpans).filter((s) => {
    if (s.classList.contains('hero-cursor')) return false;
    // Only include spans that are actually visible (desktop vs mobile)
    const style = window.getComputedStyle(s);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });
  if (spans.length === 0) {
    return noopCleanup;
  }

  const allChars: HTMLElement[] = [];

  // Split every span into characters (skip hero-cursor)
  spans.forEach((span) => {
    try {
      const split = new SplitText(span as HTMLElement, {
        type: 'words,chars',
        tag: 'span',
        wordsClass: 'hero-word',
        charsClass: 'hero-char',
      });
      if (split.chars && split.chars.length > 0) {
        allChars.push(...(split.chars as HTMLElement[]));
      }
    } catch (error) {
      console.error('LetterReveal: Error splitting text', error, span);
    }
  });

  if (allChars.length === 0) {
    return noopCleanup;
  }

  // Initial state: fully hidden (no faint text underneath)
  gsap.set(allChars, {
    opacity: 0,
    y: 1,
  });

  // Blinking cursor: position in front of the reveal, advance with each character
  const cursor = container.querySelector('.hero-cursor') as HTMLElement | null;
  /** Last character the cursor was placed after — used to re-measure after rotate/resize */
  let lastCursorChar: HTMLElement | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const containerRect = () => (container as HTMLElement).getBoundingClientRect();
  const setCursorAfterChar = (charEl: HTMLElement) => {
    if (!cursor) return;
    const cr = containerRect();
    const charRect = charEl.getBoundingClientRect();
    if (charRect.width === 0 && charRect.height === 0) return; // skip hidden (e.g. mobile-only on desktop)
    lastCursorChar = charEl;
    const cursorHeight = cursor.getBoundingClientRect().height || charRect.height * 1.25;
    const top = charRect.top - cr.top + (charRect.height / 2) - (cursorHeight / 2);
    gsap.set(cursor, {
      left: `${charRect.right - cr.left}px`,
      top: `${top}px`,
    });
  };

  const repositionCursorAfterLayout = () => {
    if (!cursor || !lastCursorChar) return;
    // Double rAF: text reflow after orientation change often lands after first paint (esp. iOS)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cursor && lastCursorChar) setCursorAfterChar(lastCursorChar);
      });
    });
  };

  const onViewportChange = () => repositionCursorAfterLayout();
  const lastVisibleChar = () => {
    for (let i = allChars.length - 1; i >= 0; i--) {
      const r = allChars[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return allChars[i];
    }
    return allChars[allChars.length - 1];
  };

  let endBlinkTl: gsap.core.Timeline | null = null;
  let endPhaseDelay: gsap.core.Tween | null = null;

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

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => onViewportChange());
      resizeObserver.observe(container as HTMLElement);
    }
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
        
        // When last character completes: optional endless blink, or hide cursor
        if (i === lastCharIndex && cursor) {
          setCursorAfterChar(lastVisibleChar());
          endPhaseDelay = gsap.delayedCall(0.05, () => {
            endPhaseDelay = null;
            if (!cursor) return;
            if (endCursorBlink) {
              endBlinkTl = gsap.timeline({ repeat: -1 });
              endBlinkTl
                .to(cursor, { opacity: 1, duration: 0.05, ease: 'none' })
                .to(cursor, { opacity: 0, duration: 0.5, ease: 'none' })
                .to(cursor, { opacity: 1, duration: 0.5, ease: 'none' });
            } else {
              gsap.set(cursor, { opacity: 0 });
              cursor.style.display = 'none';
            }
          });
        }
      }
    });
  });

  return () => {
    endPhaseDelay?.kill();
    endPhaseDelay = null;
    endBlinkTl?.kill();
    endBlinkTl = null;
    if (!cursor) return;
    resizeObserver?.disconnect();
    resizeObserver = null;
    window.removeEventListener('resize', onViewportChange);
    window.removeEventListener('orientationchange', onViewportChange);
    window.visualViewport?.removeEventListener('resize', onViewportChange);
    window.visualViewport?.removeEventListener('scroll', onViewportChange);
  };
}


