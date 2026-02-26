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

// Temporary debug settings for V2 development
export const DEBUG_SETTINGS = {
  showDebugMarkers: false,
  logColorDetection: false,
};