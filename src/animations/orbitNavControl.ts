import { gsap } from 'gsap';

/**
 * Control OrbitNav circle animation via GSAP timeline
 * This allows you to integrate OrbitNav animations into your page timelines
 */

export interface OrbitNavAnimationOptions {
  radius?: number;
  duration?: number;
  ease?: string;
  paused?: boolean;
}

/**
 * Create a GSAP timeline for OrbitNav circle animation
 * Can be added to existing timelines or used standalone
 */
export function createOrbitNavAnimation(
  circleElement: HTMLElement,
  options: OrbitNavAnimationOptions = {}
): gsap.core.Timeline {
  const {
    radius = 15,
    duration = 8,
    ease = 'power2.inOut',
    paused = false,
  } = options;

  const tl = gsap.timeline({ paused });

  // X-axis orbit with physics-based easing
  tl.to(
    circleElement,
    {
      x: radius,
      duration: duration / 2,
      ease: ease,
      yoyo: true,
      repeat: -1,
    },
    0
  );

  // Y-axis orbit with offset for circular motion
  tl.to(
    circleElement,
    {
      y: -radius,
      duration: duration / 2,
      ease: 'power1.inOut', // Different easing for Y creates more organic motion
      yoyo: true,
      repeat: -1,
    },
    duration / 4 // Offset creates circular/elliptical path
  );

  // Subtle scale pulsing (tension effect)
  tl.to(
    circleElement,
    {
      scale: 1.1,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    },
    0
  );

  return tl;
}

/**
 * Add OrbitNav animation to an existing GSAP timeline
 */
export function addOrbitNavToTimeline(
  timeline: gsap.core.Timeline,
  circleElement: HTMLElement,
  position: number | string = 0,
  options: OrbitNavAnimationOptions = {}
): void {
  const orbitTl = createOrbitNavAnimation(circleElement, options);
  timeline.add(orbitTl, position);
}

/**
 * Control OrbitNav color inversion via GSAP
 * Useful for triggering color changes during scroll animations
 */
export function animateOrbitNavColor(
  circleElement: HTMLElement,
  textElement: HTMLElement,
  toDark: boolean,
  duration: number = 0.6
): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Animate circle background color
  tl.to(circleElement, {
    backgroundColor: toDark ? '#000000' : '#ffffff',
    duration,
    ease: 'power2.inOut',
  }, 0);

  // Animate text color
  tl.to(textElement, {
    color: toDark ? '#000000' : '#ffffff',
    duration,
    ease: 'power2.inOut',
  }, 0);

  return tl;
}

