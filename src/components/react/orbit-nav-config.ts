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
// Spec: 2.5X = viewport top to center of circle; 1.5X = viewport right to center of circle (1X = dot diameter).
// Container offsets from viewport: top = 2× dot, right = 1× dot (right edge of orbit).
export const ORBIT_NAV_LAYOUT = {
  DOT_SIZE: 32,
  TOP_OFFSET_RATIO: 2,    // container top from viewport (2× dot)
  RIGHT_OFFSET_RATIO: 1,  // container right from viewport, to right edge of orbit (1× dot)
  ORBIT_WIDTH: 160,
  ORBIT_HEIGHT: 80,
  ORBIT_WIDTH_MOBILE: 120,
  ORBIT_HEIGHT_MOBILE: 60,
  MOBILE_BREAKPOINT_PX: 768,
} as const;

// Temporary debug settings for V2 development
export const DEBUG_SETTINGS = {
  showDebugMarkers: false,
  logColorDetection: false,
};