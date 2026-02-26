/**
 * OrbitNav Version Router
 * 
 * This file automatically loads the active version of OrbitNav based on orbit-nav-config.ts
 * To switch versions, change ACTIVE_VERSION in orbit-nav-config.ts
 */

import { ACTIVE_VERSION } from './orbit-nav-config';

// Dynamic imports based on version
import OrbitNav_v1 from './orbit-nav-versions/v1/OrbitNav_v1';
import OrbitNav_v2 from './orbit-nav-versions/v2/OrbitNav_v2';

// Version map
const VERSION_COMPONENTS = {
  v1: OrbitNav_v1,
  v2: OrbitNav_v2,
} as const;

// Export the active version
const OrbitNav = VERSION_COMPONENTS[ACTIVE_VERSION];

export default OrbitNav;

// Export version info for debugging
export { ACTIVE_VERSION, getCurrentVersionInfo } from './orbit-nav-config';