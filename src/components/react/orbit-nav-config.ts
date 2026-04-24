/**
 * OrbitNav Version Configuration
 * 
 * This file controls which version of OrbitNav is currently active.
 * Change ACTIVE_VERSION to switch between different implementations.
 * v1 is the original version with route-specific text labels, empty circle, dropdown hover states
 * v2 is the new version with no text labels, new circle animation (2/26/2026)
 */

export type OrbitNavVersion = 'v1' | 'v2';

// 🎛️ CHANGE THIS TO SWITCH VERSIONS
export const ACTIVE_VERSION: OrbitNavVersion = 'v2';

// Version descriptions for reference
export const VERSION_INFO = {
  v1: {
    description: 'Original OrbitNav with route-specific text labels',
    features: [
      'Physics-based orbital motion',
      'Route-specific text labels (accueil, solaire, nous, etc.)',
      'Auto color inversion',
      'GSAP ScrollTrigger integration',
      'Hover states with text changes'
    ],
    archived: true
  },
  v2: {
    description: 'New OrbitNav design - no text labels, new circle animation',
    features: [
      'Physics-based orbital motion (preserved)',
      'No text labels',
      'New circle animation (TBD)',
      'Auto color inversion (preserved)',
      'GSAP ScrollTrigger integration (preserved)'
    ],
    archived: false
  }
} as const;

// Export version info for debugging
export const getCurrentVersionInfo = () => {
  return {
    active: ACTIVE_VERSION,
    ...VERSION_INFO[ACTIVE_VERSION]
  };
};

// Console log current version (for debugging)
if (typeof window !== 'undefined') {
  console.log(`🎯 OrbitNav Version: ${ACTIVE_VERSION}`, getCurrentVersionInfo());
}

// Layout: dot/orbit position and size (V2)
// Container offsets: top/right from viewport in px = ratio × dot (or ratio × multiplier × dot for right).
// Dot scales by breakpoint: desktop ≥1024px, tablet 768–1023px, mobile <768px (+ compact-phone landscape).
export const ORBIT_NAV_LAYOUT = {
  /** Orbit dot diameter (px); ~+10% vs base 32/24/20. */
  DOT_SIZE_DESKTOP: 35,
  DOT_SIZE_TABLET: 26,
  DOT_SIZE_MOBILE: 22,
  /** Default: more breathing room from top edge */
  TOP_OFFSET_RATIO: 2,
  /** Mobile dot tier: sit closer to top edge */
  TOP_OFFSET_RATIO_MOBILE: 1,
  RIGHT_OFFSET_RATIO: 1,
  /**
   * Right inset = RIGHT_OFFSET_RATIO × multiplier × dot (dot = orbit circle / hit target size).
   * 3 on desktop = 3×32px; same 3 on mobile = 3×20px = 60px from the right (was 2×, too tight to the edge once the pill widened).
   */
  RIGHT_OFFSET_MULTIPLIER_DEFAULT: 3,
  RIGHT_OFFSET_MULTIPLIER_MOBILE: 3,
  /** Desktop/tablet pill: 2.5:1 (w:h). Mobile racetrack: 2:1 (e.g. 80×40). */
  ORBIT_WIDTH_DESKTOP: 200,
  ORBIT_HEIGHT_DESKTOP: 80,
  ORBIT_WIDTH_TABLET: 175,
  ORBIT_HEIGHT_TABLET: 70,
  ORBIT_WIDTH_MOBILE: 80,
  ORBIT_HEIGHT_MOBILE: 40,
  TABLET_BREAKPOINT_PX: 1024,
  MOBILE_BREAKPOINT_PX: 768,
  /** Max edge length (px) for classifying a viewport as phone-like (any orientation). */
  PHONE_MAX_EDGE_PX: 980,
} as const;

/**
 * Long edge of the inner pill/rectangle (inner racetrack radius), same as `OrbitNavDot` bar length in center position.
 * Kept in config so the back chevron and dot stay visually aligned.
 */
export const ORBIT_PILL_INNER_BOUNDARY_RATIO = 0.9 as const;

export function getOrbitPillLongLengthPx(dotSize: number): number {
  return (dotSize / 2) * ORBIT_PILL_INNER_BOUNDARY_RATIO;
}

/**
 * True for typical phones in landscape: short edge under 768px and long edge at most PHONE_MAX_EDGE_PX,
 * so orbit/dot use the same tier as portrait (matching right/top px from viewport edges).
 */
export function isCompactPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const min = Math.min(w, h);
  const max = Math.max(w, h);
  return (
    min < ORBIT_NAV_LAYOUT.MOBILE_BREAKPOINT_PX &&
    max <= ORBIT_NAV_LAYOUT.PHONE_MAX_EDGE_PX
  );
}

/** Pill path size: same rules as getDotSize (width breakpoints, with compact-phone override). */
export function getOrbitPathDimensions(): { w: number; h: number } {
  const L = ORBIT_NAV_LAYOUT;
  if (typeof window === 'undefined') {
    return { w: L.ORBIT_WIDTH_DESKTOP, h: L.ORBIT_HEIGHT_DESKTOP };
  }
  const viewportWidth = window.innerWidth;
  if (isCompactPhoneViewport()) {
    return { w: L.ORBIT_WIDTH_MOBILE, h: L.ORBIT_HEIGHT_MOBILE };
  }
  if (viewportWidth >= L.TABLET_BREAKPOINT_PX) {
    return { w: L.ORBIT_WIDTH_DESKTOP, h: L.ORBIT_HEIGHT_DESKTOP };
  }
  if (viewportWidth >= L.MOBILE_BREAKPOINT_PX) {
    return { w: L.ORBIT_WIDTH_TABLET, h: L.ORBIT_HEIGHT_TABLET };
  }
  return { w: L.ORBIT_WIDTH_MOBILE, h: L.ORBIT_HEIGHT_MOBILE };
}

/** Dot size by viewport: desktop ≥1024 → 32px, tablet 768–1023 → 24px, mobile under 768 → 20px; phones in landscape use mobile tier. */
export function getDotSize(): number {
  const L = ORBIT_NAV_LAYOUT;
  if (typeof window === 'undefined') return L.DOT_SIZE_DESKTOP;
  const w = window.innerWidth;
  if (isCompactPhoneViewport()) return L.DOT_SIZE_MOBILE;
  if (w >= L.TABLET_BREAKPOINT_PX) return L.DOT_SIZE_DESKTOP;
  if (w >= L.MOBILE_BREAKPOINT_PX) return L.DOT_SIZE_TABLET;
  return L.DOT_SIZE_MOBILE;
}

/** Top / right CSS offsets for the fixed orbit container (px). Tighter insets when using the mobile dot tier. */
export function getOrbitContainerOffsets(dotSize: number): { top: number; right: number } {
  const L = ORBIT_NAV_LAYOUT;
  const mobileTier = dotSize === L.DOT_SIZE_MOBILE;
  if (mobileTier) {
    return {
      top: L.TOP_OFFSET_RATIO_MOBILE * dotSize,
      right: L.RIGHT_OFFSET_RATIO * L.RIGHT_OFFSET_MULTIPLIER_MOBILE * dotSize,
    };
  }
  return {
    top: L.TOP_OFFSET_RATIO * dotSize,
    right: L.RIGHT_OFFSET_RATIO * L.RIGHT_OFFSET_MULTIPLIER_DEFAULT * dotSize,
  };
}

// Temporary debug settings for V2 development
export const DEBUG_SETTINGS = {
  showDebugMarkers: false,
  logColorDetection: false,
};