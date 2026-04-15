/** Fired when desktop section snap starts (indices match homepage orbit / `initSectionSnap` `sections`). */
export const SECTION_SNAP_INTENT_EVENT = 'solaire:section-snap-intent';

export type SectionSnapIntentDetail = {
  sectionIndex: number;
  /** Seconds — orbit tween should use the same duration as the scroll snap. */
  duration?: number;
  /** GSAP ease string — should match `initSectionSnap` `ease`. */
  ease?: string;
};
