import { gsap } from 'gsap';

/**
 * Orbit nav pill: home (vertical) → subpage (horizontal) departure.
 * One place to tune center + 90° CW rotation timing and ease.
 */
export const ORBIT_PILL_SUBPAGE = {
  centrDuration: 0.16,
  rotateDuration: 0.65,
  ease: 'elastic.out(0.95, 0.3)',
} as const;

export type OrbitPillSubpageMetrics = {
  center: number;
  rectFullWidth: number;
  rectFullHeight: number;
};

/**
 * Center the pill in the Y-axis (full vertical bar), then rotate 90° CW with elastic overshoot.
 * Does not kill other tweens — caller should kill `timelineRef` / loop timelines first.
 */
export function buildOrbitPillSubpageDepartureTimeline(
  rect: SVGRectElement,
  metrics: OrbitPillSubpageMetrics,
  onComplete: () => void,
): gsap.core.Timeline {
  const { center, rectFullWidth, rectFullHeight } = metrics;
  const y0 = center - rectFullHeight / 2;
  const rectX = center - rectFullWidth / 2;

  const tl = gsap.timeline({ onComplete });
  tl.to(rect, {
    attr: {
      y: y0,
      height: rectFullHeight,
      x: rectX,
      width: rectFullWidth,
    },
    duration: ORBIT_PILL_SUBPAGE.centrDuration,
    ease: 'power2.inOut',
  });
  tl.to(rect, {
    rotation: 90,
    duration: ORBIT_PILL_SUBPAGE.rotateDuration,
    ease: ORBIT_PILL_SUBPAGE.ease,
    svgOrigin: `${center} ${center}`,
  });
  return tl;
}

/**
 * Subpage (horizontal) → home (vertical), inverse of {@link buildOrbitPillSubpageDepartureTimeline}:
 * center the horizontal bar, then rotate 90° CCW with the same ease as the departure.
 */
export function buildOrbitPillSubpageReturnToHomeTimeline(
  rect: SVGRectElement,
  metrics: OrbitPillSubpageMetrics,
  onComplete: () => void,
): gsap.core.Timeline {
  const { center, rectFullWidth, rectFullHeight } = metrics;
  const yRect = center - rectFullWidth / 2;
  const x0 = center - rectFullHeight / 2;

  const centerStateX = {
    x: x0,
    y: yRect,
    width: rectFullHeight,
    height: rectFullWidth,
  };

  const tl = gsap.timeline({ onComplete });
  tl.to(rect, {
    attr: centerStateX,
    duration: ORBIT_PILL_SUBPAGE.centrDuration,
    ease: 'power2.inOut',
  });
  tl.to(rect, {
    rotation: -90,
    duration: ORBIT_PILL_SUBPAGE.rotateDuration,
    ease: ORBIT_PILL_SUBPAGE.ease,
    svgOrigin: `${center} ${center}`,
  });
  return tl;
}

// --- Cross-context trigger (e.g. homepage `index.astro` slide-bar + React Orbit) ---

/** Fired on `window` so non-React code can request the same pill animation. */
export const ORBIT_PILL_SUBPAGE_REQUEST = 'orbit:pill-subpage-request' as const;

type PillSubpageRequestDetail = { done: () => void };

const NO_HANDLER_SAFETY_MS = 2500;

/**
 * Resolves when the Orbit has finished the pill sequence (or immediately for no-ops: not on `/`, etc.).
 * Fails open with a long timeout if nothing handles the event (e.g. dev without Orbit).
 */
export function requestOrbitPillSubpageFromPage(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let finished = false;
    const once = () => {
      if (finished) return;
      finished = true;
      if (safetyId != null) {
        clearTimeout(safetyId);
        safetyId = null;
      }
      resolve();
    };

    let safetyId: ReturnType<typeof setTimeout> | null = setTimeout(once, NO_HANDLER_SAFETY_MS);

    window.dispatchEvent(
      new CustomEvent(ORBIT_PILL_SUBPAGE_REQUEST, {
        detail: { done: once } satisfies PillSubpageRequestDetail,
        bubbles: true,
      }),
    );
  });
}
