import { gsap } from 'gsap';

/**
 * Page transition system for tumbler effect between pages
 * This can be used with client-side navigation or as page load animations
 */

export function initPageTransition(
  containerSelector: string = 'body',
  duration: number = 0.6
) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Create overlay for transition
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: black;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
  `;
  document.body.appendChild(overlay);

  // Animate in
  gsap.to(overlay, {
    opacity: 1,
    duration: duration / 2,
    ease: 'power2.in',
    onComplete: () => {
      // Animate out
      gsap.to(overlay, {
        opacity: 0,
        duration: duration / 2,
        ease: 'power2.out',
        onComplete: () => {
          document.body.removeChild(overlay);
        },
      });
    },
  });
}

/**
 * Tumbler text reveal on page load
 */
export function initTumblerReveal(
  selector: string,
  delay: number = 0,
  stagger: number = 0.03
) {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return;

  elements.forEach((element) => {
    const text = element.textContent || '';
    const chars = text.split('');
    
    // Clear and prepare
    element.innerHTML = '';
    chars.forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'rotateX(90deg)';
      span.style.transformOrigin = 'center';
      span.style.transformStyle = 'preserve-3d';
      element.appendChild(span);
    });

    // Animate
    const charSpans = element.querySelectorAll('span');
    gsap.to(charSpans, {
      opacity: 1,
      rotationX: 0,
      duration: 0.6,
      ease: 'back.out(1.7)',
      stagger,
      delay,
    });
  });
}


