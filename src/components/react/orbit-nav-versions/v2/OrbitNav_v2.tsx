import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import {
  DEBUG_SETTINGS,
  getDotSize,
  getOrbitContainerOffsets,
  getOrbitPathDimensions,
} from '../../orbit-nav-config';
import {
  SECTION_SNAP_INTENT_EVENT,
  type SectionSnapIntentDetail,
} from '../../../../utils/sectionSnapIntent';
import { isScrollDiagnosticsEnabled, logScrollDiag } from '../../../../utils/scrollDiagnostics';
import OrbitNavDot from './OrbitNavDot';

gsap.registerPlugin(MotionPathPlugin);

interface OrbitNavProps {
  isDark?: boolean;
  colorMode?: 'auto' | 'light' | 'dark';
  /** When true, show "back" on non-home even when nav is not inverted (e.g. light dot on dark page). */
  showBack?: boolean;
  ease?: string;
  debugMarkers?: boolean;
}

/**
 * OrbitNav V2 - Simplified version without text labels
 * 
 * Features:
 * - Physics-based orbital motion (preserved from v1)
 * - Auto color inversion (preserved from v1) 
 * - No route-specific text labels (removed from v1)
 * - Prepared for new circle animation
 * - Homepage section index from scroll (viewport center; no per-section ScrollTrigger)
 *
 * Orbit slot positions (same order as `HOMEPAGE_SECTION_SELECTORS`): indices 0–3 share the
 * top-left of the track (where the top horizontal edge starts). Indices 4–`n-1` are evenly
 * spaced by arc length along the clockwise run from that point to the left semicircle midpoint
 * (so section 4 is not stacked near the hero slot); the last index sits on “middle left”.
 */
function getBackTargetFromPath(normalisedPath: string): string | null {
  switch (normalisedPath) {
    case '/why-solar': return '/#why-solar-section';
    case '/why-work-with-us': return '/#why-us-section';
    case '/clients': return '/#clients-section';
    case '/projets': return '/#projets-section';
    case '/contact': return '/#contact-section';
    default: return '/';
  }
}

/**
 * Same section index as homepage `sectionSelectors` / `sectionPositionsRef` for that route’s hash target.
 * Keeps the orbit dot on subpages at the same track position as if the user were on that section on `/`.
 */
function getSectionIndexForSubpagePath(normalisedPath: string): number | null {
  switch (normalisedPath) {
    case '/why-solar':
      return 4;
    case '/why-work-with-us':
      return 5;
    case '/clients':
      return 6;
    case '/projets':
      return 7;
    case '/contact':
      return 8;
    default:
      return null;
  }
}

/** Same list as the homepage scroll listener — used to resolve scroll position to section index. */
const HOMEPAGE_SECTION_SELECTORS = [
  '#hero-trigger',
  '.company-name-section',
  '.stats-section',
  '.video-section',
  '.why-solar-section',
  '.why-us-section',
  '.clients-section',
  '.projets-section',
  '.contact-section',
] as const;

const SECTION_INDEX_HYSTERESIS_PX = 32;

function queryHomepageSectionElements(): HTMLElement[] {
  return HOMEPAGE_SECTION_SELECTORS.map((sel) => document.querySelector(sel) as HTMLElement | null).filter(
    (el): el is HTMLElement => el !== null,
  );
}

function homepageRawIndexForCenter(elements: HTMLElement[], centerY: number): number {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    const isLast = i === elements.length - 1;
    if (isLast) {
      if (centerY >= top && centerY <= bottom) return i;
    } else if (centerY >= top && centerY < bottom) {
      return i;
    }
  }
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const mid = el.offsetTop + el.offsetHeight / 2;
    const d = Math.abs(centerY - mid);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function homepageIndexWithHysteresis(
  elements: HTMLElement[],
  centerY: number,
  lastCommitted: number,
): number {
  const raw = homepageRawIndexForCenter(elements, centerY);
  const last = lastCommitted;
  if (raw === last) return last;
  if (Math.abs(raw - last) > 1) return raw;

  const margin = SECTION_INDEX_HYSTERESIS_PX;
  if (raw > last) {
    const topNext = elements[raw].offsetTop;
    return centerY >= topNext + margin ? raw : last;
  }
  const topLeave = elements[last].offsetTop;
  return centerY <= topLeave - margin ? raw : last;
}

/**
 * Section index for `/#...` targets (back links from subpages). Layout runs before scroll
 * restoration to the hash, so viewport-center math can point at the hero while the URL
 * already says e.g. `#clients-section` — use hash first to avoid a sweep after scroll catches up.
 */
function homepageSectionIndexFromHash(hash: string): number | null {
  const h = hash.trim().toLowerCase();
  if (!h || h === '#') return null;
  switch (h) {
    case '#hero-trigger':
      return 0;
    case '#why-solar-section':
      return 4;
    case '#why-us-section':
      return 5;
    case '#clients-section':
      return 6;
    case '#projets-section':
      return 7;
    case '#contact-section':
      return 8;
    default:
      return null;
  }
}

/**
 * Scroll-driven section index. While `/#...` is in the URL we may pin to that section **only
 * until** the viewport center reaches it (fragment scroll finished). After that, `hashOverrideConsumed`
 * stays true so scrolling back above the section (hash still in URL) follows real scroll position —
 * otherwise the orbit would stay locked to e.g. clients when the user is at the hero.
 */
function homepageScrollDerivedIndexOrHash(
  elements: HTMLElement[],
  centerY: number,
  lastCommitted: number,
  hashOverrideConsumedRef: { current: boolean },
): number {
  const hashIdx =
    typeof window !== 'undefined' ? homepageSectionIndexFromHash(window.location.hash) : null;
  if (hashIdx !== null && elements[hashIdx] && !hashOverrideConsumedRef.current) {
    const top = elements[hashIdx].offsetTop;
    if (centerY < top - 1) {
      return hashIdx;
    }
    hashOverrideConsumedRef.current = true;
  }
  return homepageIndexWithHysteresis(elements, centerY, lastCommitted);
}

/** Fallback orbit nav config by path when dataset is missing (e.g. before-swap not yet run). */
function getOrbitNavConfigFromPath(path: string): { colorMode: 'auto' | 'light' | 'dark'; showBack: boolean; isDark: boolean } {
  switch (path) {
    case '/why-solar':
      return { colorMode: 'dark', showBack: false, isDark: false };
    case '/why-work-with-us':
      return { colorMode: 'dark', showBack: false, isDark: false };
    case '/clients':
      return { colorMode: 'dark', showBack: false, isDark: false };
    case '/projets':
      return { colorMode: 'light', showBack: true, isDark: true };
    case '/contact':
      return { colorMode: 'light', showBack: true, isDark: true };
    default:
      return { colorMode: 'auto', showBack: false, isDark: false };
  }
}

export default function OrbitNav({ 
  isDark = false, 
  colorMode = 'auto',
  showBack: showBackOverride = false,
  ease = 'power3.inOut',
  debugMarkers = DEBUG_SETTINGS.showDebugMarkers // Use debug setting
}: OrbitNavProps) {
  const circleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  /** Pill `d` string for MotionPath when the `<path>` node is missing or detached (e.g. Astro view transitions). */
  const orbitPathDRef = useRef('');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isInverted, setIsInverted] = useState(false);
  /** Mirrors `body.nav-or-text-hovered` (slide-bar sections + nav hover) for SVG fills — V2 ignores global.css orbit rules. */
  const [navOrTextHovered, setNavOrTextHovered] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);
  const sectionsRef = useRef<string[]>([]);
  const currentPathProgress = useRef<number>(0);
  const previousSectionIndexRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  /** Last committed section for boundary hysteresis (reduces index flip-flop / scroll jitter). */
  const sectionIndexHysteresisRef = useRef<number>(0);
  const hasInitializedPosition = useRef<boolean>(false);
  const [debugPositions, setDebugPositions] = useState<Array<{x: number, y: number, label: string}>>([]);
  const [pathDimensions, setPathDimensions] = useState(() => getOrbitPathDimensions());
  const [dotSize, setDotSize] = useState(() => getDotSize());
  const [offsets, setOffsets] = useState(() => {
    const initialDot = getDotSize();
    return getOrbitContainerOffsets(initialDot);
  });
  /** Latest orbit layout; used to skip no-op resizes (iOS URL bar → innerHeight-only churn). */
  const layoutSnapshotRef = useRef({ dot: 0, dim: { w: 0, h: 0 }, off: { top: 0, right: 0 } });
  const lastStableInnerWidthRef = useRef<number | null>(null);
  const [isHomePage, setIsHomePage] = useState(() =>
    typeof window !== 'undefined' ? (window.location.pathname.replace(/\/+$/, '') || '/') === '/' : true,
  );
  const [pathKey, setPathKey] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/',
  );
  /** Kept in sync with `window.location.hash` so layout can re-run when Astro applies # after pathname. */
  const [routeHash, setRouteHash] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash : '',
  );
  const [backTarget, setBackTarget] = useState<string | null>(null);
  const [colorModeState, setColorModeState] = useState(colorMode);
  const [showBackState, setShowBackState] = useState(showBackOverride);
  const [isDarkState, setIsDarkState] = useState(isDark);
  /**
   * Dot center on the pill path in **orbit-container local px** (same space as `path.getPointAtLength`).
   * Used to place the “back” label inside the fixed container so it does not depend on
   * `getBoundingClientRect()` (avoids jitter when the visual viewport / subpixel layout shifts on scroll).
   */
  const [backAnchorLocal, setBackAnchorLocal] = useState<{ x: number; y: number } | null>(null);
  /** Bumped after pill path + sectionPositionsRef are computed (useLayoutEffect snaps subpage dot after this). */
  const [orbitPathVersion, setOrbitPathVersion] = useState(0);
  const syncDotCenterRef = useRef<() => void>(() => {});
  /** Detect subpage ↔ homepage transitions for instant orbit snap (null = not yet mounted). */
  const prevIsHomeForSnapRef = useRef<boolean | null>(null);
  /** After subpage→home layout snap, skip one move-effect tween (scroll index already applied). */
  const skipNextHomeMoveTweenRef = useRef(false);
  /** Next orbit path tween should match desktop section snap (duration + ease from intent). */
  const orbitSnapTweenSyncRef = useRef<{ duration: number; ease: string } | null>(null);
  /** Last `routeHash` we applied in home snap (SPA can set pathname before hash — need a second snap). */
  const lastHomeSnapHashRef = useRef<string>('');
  /**
   * After back nav to `/#section`, pin orbit to hash until viewport reaches that section once; then
   * ignore hash for scroll math so the dot tracks real scroll while `location.hash` stays set.
   */
  const homeHashOverrideConsumedRef = useRef(true);

  /** Epsilon avoids setState + “back” flicker when iOS/Chrome re-measures the same path point. */
  const BACK_ANCHOR_EPS_PX = 0.35;

  const syncBackAnchor = () => {
    if (!pathRef.current || !containerRef.current) return;
    const path = pathRef.current;
    if (!path.isConnected || !path.getAttribute('d')?.trim()) return;
    const progress = currentPathProgress.current;
    const totalLength = path.getTotalLength();
    const pt = path.getPointAtLength(progress * totalLength);
    setBackAnchorLocal((prev) => {
      if (
        prev &&
        Math.abs(prev.x - pt.x) < BACK_ANCHOR_EPS_PX &&
        Math.abs(prev.y - pt.y) < BACK_ANCHOR_EPS_PX
      ) {
        return prev;
      }
      return { x: pt.x, y: pt.y };
    });
  };

  useEffect(() => {
    syncDotCenterRef.current = syncBackAnchor;
  });

  // Responsive orbit and dot size (debounced: iOS/Chrome fire rapid resize + visualViewport.resize when browser chrome shows/hides)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const applyLayout = () => {
      if (typeof window === 'undefined') return;
      const innerW = window.innerWidth;
      const nextDim = getOrbitPathDimensions();
      const nextDot = getDotSize();
      const nextOff = getOrbitContainerOffsets(nextDot);
      const snap = layoutSnapshotRef.current;

      const layoutUnchanged =
        snap.dot === nextDot &&
        snap.dim.w === nextDim.w &&
        snap.dim.h === nextDim.h &&
        snap.off.top === nextOff.top &&
        snap.off.right === nextOff.right;
      const widthUnchanged =
        lastStableInnerWidthRef.current !== null && innerW === lastStableInnerWidthRef.current;

      if (layoutUnchanged && widthUnchanged) {
        return;
      }

      lastStableInnerWidthRef.current = innerW;

      setPathDimensions((prev) =>
        prev.w === nextDim.w && prev.h === nextDim.h ? prev : nextDim,
      );
      setDotSize((prev) => (prev === nextDot ? prev : nextDot));
      setOffsets((prev) =>
        prev.top === nextOff.top && prev.right === nextOff.right ? prev : nextOff,
      );
      requestAnimationFrame(() => syncDotCenterRef.current());
    };

    const scheduleApply = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        applyLayout();
      }, 160);
    };

    const onOrientation = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = null;
      applyLayout();
    };

    applyLayout();
    window.addEventListener('resize', scheduleApply, { passive: true });
    window.addEventListener('orientationchange', onOrientation);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', scheduleApply);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('resize', scheduleApply);
      window.removeEventListener('orientationchange', onOrientation);
      vv?.removeEventListener('resize', scheduleApply);
    };
  }, []);

  const syncFromDocument = () => {
    if (typeof window === 'undefined') return;
    const rawPath = window.location.pathname;
    const normalisedPath = rawPath.replace(/\/+$/, '') || '/';
    const newIsHome = normalisedPath === '/';
    const newBackTarget = getBackTargetFromPath(normalisedPath);
    
    const d = document.documentElement.dataset;
    const fallback = getOrbitNavConfigFromPath(normalisedPath);
    const newColorMode = (d.orbitNavColorMode as 'auto' | 'light' | 'dark') || fallback.colorMode;
    const newShowBack = d.orbitShowBack !== undefined ? d.orbitShowBack === 'true' : fallback.showBack;
    const newIsDark = d.orbitIsDark !== undefined ? d.orbitIsDark === 'true' : fallback.isDark;

    setIsHomePage(newIsHome);
    setPathKey(normalisedPath);
    setRouteHash(window.location.hash);
    setBackTarget(newBackTarget);
    setColorModeState(newColorMode);
    setShowBackState(newShowBack);
    setIsDarkState(newIsDark);

    /* Slide-bar hover only exists on `/`; stale class after client nav flips dot (black→white→black). */
    if (!newIsHome) {
      document.body.classList.remove('nav-or-text-hovered');
    }
  };

  useEffect(() => {
    syncFromDocument();

    // Copy incoming page's orbit-nav data attributes onto current document (body swap doesn't replace html, so scripts in new body may not run)
    const onBeforeSwap = (ev: Event) => {
      const e = ev as CustomEvent<{ newDocument: Document }>;
      const newDoc = e.detail?.newDocument;
      if (!newDoc) return;
      const newRoot = newDoc.documentElement;
      const cur = document.documentElement;
      const mode = newRoot.getAttribute('data-orbit-nav-color-mode');
      const showBackAttr = newRoot.getAttribute('data-orbit-show-back');
      const isDarkAttr = newRoot.getAttribute('data-orbit-is-dark');
      if (mode != null) cur.dataset.orbitNavColorMode = mode;
      if (showBackAttr != null) cur.dataset.orbitShowBack = showBackAttr;
      if (isDarkAttr != null) cur.dataset.orbitIsDark = isDarkAttr;
    };

    const onAfterNavigate = () => {
      // Sync immediately so isHomePage/pathKey update before paint; rAF deferred sync caused
      // subpage→home to paint one frame with stale route + move-effect tween from subpage progress.
      syncFromDocument();
      // Hash often lands after pathname on client navigations to /#section — refresh until stable.
      requestAnimationFrame(() => {
        if (typeof window === 'undefined') return;
        setRouteHash(window.location.hash);
        requestAnimationFrame(() => setRouteHash(window.location.hash));
      });
    };

    const onHashOrPop = () => setRouteHash(window.location.hash);

    document.addEventListener('astro:before-swap', onBeforeSwap);
    document.addEventListener('astro:page-load', onAfterNavigate);
    document.addEventListener('astro:after-swap', onAfterNavigate);
    window.addEventListener('hashchange', onHashOrPop);
    window.addEventListener('popstate', onHashOrPop);
    return () => {
      document.removeEventListener('astro:before-swap', onBeforeSwap);
      document.removeEventListener('astro:page-load', onAfterNavigate);
      document.removeEventListener('astro:after-swap', onAfterNavigate);
      window.removeEventListener('hashchange', onHashOrPop);
      window.removeEventListener('popstate', onHashOrPop);
    };
  }, []);

  layoutSnapshotRef.current = { dot: dotSize, dim: pathDimensions, off: offsets };

  const PATH_WIDTH = pathDimensions.w;
  const PATH_HEIGHT = pathDimensions.h;

  const createPillPath = (width: number, height: number) => {
    const radius = height / 2;
    return `M ${radius},0 H ${width - radius} A ${radius},${radius} 0 0 1 ${width - radius},${height} H ${radius} A ${radius},${radius} 0 0 1 ${radius},0 Z`;
  };

  const orbitPathD = createPillPath(PATH_WIDTH, PATH_HEIGHT);
  orbitPathDRef.current = orbitPathD;

  /** MotionPathPlugin throws if `path` is null/invalid or `<path>` has no `d`. */
  const applyCircleMotionProgress = (
    circle: HTMLElement | null,
    progress: number,
  ): boolean => {
    if (!circle) return false;
    const el = pathRef.current;
    let pathTarget: SVGPathElement | string | undefined;
    if (el?.isConnected && el.getAttribute('d')?.trim()) {
      pathTarget = el;
    } else {
      const d = orbitPathDRef.current.trim();
      if (!d) return false;
      pathTarget = d;
    }
    gsap.set(circle, {
      motionPath: {
        path: pathTarget,
        autoRotate: false,
        start: progress,
        end: progress,
      },
    });
    return true;
  };

  const calculatePathPosition = (
    pathElement: SVGPathElement,
    pathWidth: number,
    pathHeight: number,
    positionType: 'left-center' | 'right-center' | 'top-at-x' | 'bottom-at-x',
    xPercent?: number
  ): number => {
    if (!pathElement) return 0;
    const totalLength = pathElement.getTotalLength();
    const radius = pathHeight / 2;
    const straightLength = pathWidth - pathHeight;
    const topStraightEnd = straightLength;
    const rightSemicircleEnd = topStraightEnd + Math.PI * radius;
    const bottomStraightEnd = rightSemicircleEnd + straightLength;
    const leftSemicircleLength = Math.PI * radius;
    const leftSemicircleStart = bottomStraightEnd;
    let position = 0;
    switch (positionType) {
      case 'left-center':
        position = leftSemicircleStart + leftSemicircleLength / 2;
        break;
      case 'right-center':
        position = topStraightEnd + (Math.PI * radius) / 2;
        break;
      case 'top-at-x':
        position = straightLength * (xPercent ?? 0);
        break;
      case 'bottom-at-x':
        position = rightSemicircleEnd + straightLength * (1 - (xPercent ?? 0));
        break;
    }
    return position / totalLength;
  };

  // Auto color detection based on page background
  const detectPageBackground = (): 'light' | 'dark' => {
    if (colorModeState === 'light') return 'light';
    if (colorModeState === 'dark') return 'dark';

    // Auto-detect from page sections
    const sections = document.querySelectorAll('section, main, body');
    for (const section of sections) {
      const computedStyle = window.getComputedStyle(section as Element);
      const bgColor = computedStyle.backgroundColor;
      
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        // Simple luminance check
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const luminance = (0.299 * parseInt(rgb[0]) + 
                           0.587 * parseInt(rgb[1]) + 
                           0.114 * parseInt(rgb[2])) / 255;
          return luminance > 0.5 ? 'light' : 'dark';
        }
      }
    }
    
    return 'dark'; // Default
  };

  // Normalized progress [0,1) along pill path per homepage section (see file header).
  const sectionPositionsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!pathRef.current) return;
    const path = pathRef.current;

    const pathWidth = PATH_WIDTH;
    const pathHeight = PATH_HEIGHT;
    /** Path starts at M: left end of top straight (horizontal segment begins). */
    const topLeft = calculatePathPosition(path, pathWidth, pathHeight, 'top-at-x', 0);
    /** Midpoint of left semicircle — last slot (section index n-1). */
    const leftMid = calculatePathPosition(path, pathWidth, pathHeight, 'left-center');

    const upperCount = 4;
    const lowerCount = HOMEPAGE_SECTION_SELECTORS.length - upperCount;
    /** Fifths of full loop put section 4 almost on top of `topLeft`; use arc [0 → leftMid] instead. */
    const lowerSlots: number[] = [];
    for (let k = 1; k <= lowerCount; k++) {
      lowerSlots.push((leftMid * k) / lowerCount);
    }

    sectionPositionsRef.current = [
      ...Array.from({ length: upperCount }, () => topLeft),
      ...lowerSlots,
    ];
    
    // Only initialize position on first mount, preserve it across navigation/resize
    if (!hasInitializedPosition.current) {
      const pathForInit =
        typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/';
      const onHome = pathForInit === '/';
      const mapped = getSectionIndexForSubpagePath(pathForInit);
      const initialIndex = onHome ? 0 : mapped ?? 0;
      const initialProgress = sectionPositionsRef.current[initialIndex] ?? topLeft;
      currentPathProgress.current = initialProgress;
      previousSectionIndexRef.current = initialIndex;
      hasInitializedPosition.current = true;
    } else if (circleRef.current) {
      // Path dimensions changed (e.g. resize), reposition circle at current progress
      const circle = circleRef.current;
      const progress = currentPathProgress.current;
      applyCircleMotionProgress(circle, progress);
    }

    if (debugMarkers && pathRef.current) {
      const pts: Array<{ x: number; y: number; label: string }> = [];
      sectionPositionsRef.current.forEach((progress, i) => {
        const pt = pathRef.current!.getPointAtLength(progress * pathRef.current!.getTotalLength());
        pts.push({ x: pt.x, y: pt.y, label: `${i}` });
      });
      setDebugPositions(pts);
    }
    setOrbitPathVersion((v) => v + 1);
    requestAnimationFrame(() => syncDotCenterRef.current());
  }, [debugMarkers, PATH_WIDTH, PATH_HEIGHT]);

  // Instant orbit snap (no tween): subpage ↔ homepage. Depends on orbitPathVersion so subpage runs
  // after sectionPositionsRef is filled by the path useEffect (layout runs before paint — no rAF sweep).
  useLayoutEffect(() => {
    const wasHome = prevIsHomeForSnapRef.current;
    prevIsHomeForSnapRef.current = isHomePage;

    if (!circleRef.current || !pathRef.current || sectionPositionsRef.current.length === 0) return;

    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }
    isAnimatingRef.current = false;

    if (isHomePage) {
      const hashKey = routeHash;
      const hashIdx = homepageSectionIndexFromHash(hashKey);

      const applyHomeSnapFromIndex = (next: number, recordHash: string) => {
        const positions = sectionPositionsRef.current;
        const targetProgress = positions[next] ?? 0;
        currentPathProgress.current = targetProgress;
        previousSectionIndexRef.current = next;
        sectionIndexHysteresisRef.current = next;
        applyCircleMotionProgress(circleRef.current, targetProgress);
        syncDotCenterRef.current();
        skipNextHomeMoveTweenRef.current = true;
        setCurrentSectionIndex(next);
        lastHomeSnapHashRef.current = recordHash;
      };

      // Subpage → homepage: align to scroll/hash before paint.
      if (wasHome === false) {
        const elements = queryHomepageSectionElements();
        if (elements.length === 0) {
          requestAnimationFrame(() => {
            const pathNow = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/';
            if (pathNow !== '/') return;
            const els = queryHomepageSectionElements();
            if (!circleRef.current || !pathRef.current || els.length === 0) return;
            const hk = typeof window !== 'undefined' ? window.location.hash : '';
            const hi = homepageSectionIndexFromHash(hk);
            let next2: number;
            if (hi !== null) {
              next2 = hi;
              sectionIndexHysteresisRef.current = hi;
            } else {
              const centerY2 = window.scrollY + window.innerHeight * 0.5;
              sectionIndexHysteresisRef.current = homepageRawIndexForCenter(els, centerY2);
              next2 = homepageIndexWithHysteresis(els, centerY2, sectionIndexHysteresisRef.current);
            }
            const positions2 = sectionPositionsRef.current;
            const targetProgress2 = positions2[next2] ?? 0;
            currentPathProgress.current = targetProgress2;
            previousSectionIndexRef.current = next2;
            sectionIndexHysteresisRef.current = next2;
            applyCircleMotionProgress(circleRef.current, targetProgress2);
            syncDotCenterRef.current();
            skipNextHomeMoveTweenRef.current = true;
            setCurrentSectionIndex(next2);
            lastHomeSnapHashRef.current = hk;
          });
          return;
        }

        let next: number;
        if (hashIdx !== null) {
          next = hashIdx;
          sectionIndexHysteresisRef.current = hashIdx;
        } else {
          const centerY = window.scrollY + window.innerHeight * 0.5;
          sectionIndexHysteresisRef.current = homepageRawIndexForCenter(elements, centerY);
          next = homepageIndexWithHysteresis(elements, centerY, sectionIndexHysteresisRef.current);
        }
        applyHomeSnapFromIndex(next, hashKey);
        return;
      }

      // Already on home: pathname can update before hash (SPA) — second snap when # arrives.
      if (hashIdx !== null && hashKey !== lastHomeSnapHashRef.current) {
        const elements = queryHomepageSectionElements();
        if (elements.length === 0) return;
        sectionIndexHysteresisRef.current = hashIdx;
        applyHomeSnapFromIndex(hashIdx, hashKey);
        return;
      }

      return;
    }

    lastHomeSnapHashRef.current = '';

    // Homepage → subpage (or direct load on subpage): snap to matching section track — no sweep from hero.
    const mapped = getSectionIndexForSubpagePath(pathKey);
    const idx = mapped ?? 0;
    const positions = sectionPositionsRef.current;
    const targetProgress = positions[idx] ?? positions[0];
    currentPathProgress.current = targetProgress;
    previousSectionIndexRef.current = idx;
    applyCircleMotionProgress(circleRef.current, targetProgress);
    syncDotCenterRef.current();
    setCurrentSectionIndex(idx);
  }, [isHomePage, pathKey, PATH_WIDTH, PATH_HEIGHT, orbitPathVersion, routeHash]);

  // Move circle to section position on section change (only active on homepage)
  useEffect(() => {
    // Only move dot based on section changes when on homepage
    if (!isHomePage) return;
    if (!circleRef.current || !pathRef.current || sectionPositionsRef.current.length === 0) return;

    const circle = circleRef.current;
    const positions = sectionPositionsRef.current;
    const targetProgress = positions[currentSectionIndex] ?? 0;
    const startProgress = currentPathProgress.current;

    if (skipNextHomeMoveTweenRef.current) {
      skipNextHomeMoveTweenRef.current = false;
      orbitSnapTweenSyncRef.current = null;
      currentPathProgress.current = targetProgress;
      previousSectionIndexRef.current = currentSectionIndex;
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
      isAnimatingRef.current = false;
      let p = targetProgress;
      if (p >= 1.0) p -= 1.0;
      if (p < 0.0) p += 1.0;
      applyCircleMotionProgress(circle, p);
      requestAnimationFrame(() => syncDotCenterRef.current());
      return;
    }

    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }

    // Forward = section index increased = always clockwise. Backward = section index decreased = always counterclockwise.
    const isForward = currentSectionIndex > previousSectionIndexRef.current;
    const needsWrap = isForward ? startProgress > targetProgress : startProgress < targetProgress;

    const setCircleProgress = (progress: number) => {
      let p = progress;
      if (p >= 1.0) p -= 1.0;
      if (p < 0.0) p += 1.0;
      currentPathProgress.current = p;
      applyCircleMotionProgress(circle, p);
      requestAnimationFrame(() => syncDotCenterRef.current());
    };

    const animateToTarget = () => {
      isAnimatingRef.current = true;
      const progressRef = { value: 0 };
      const wrappedDistance = needsWrap
        ? isForward
          ? (1.0 - startProgress) + targetProgress
          : startProgress + (1.0 - targetProgress)
        : Math.abs(targetProgress - startProgress) || 0.001;

      const snapSync = orbitSnapTweenSyncRef.current;
      orbitSnapTweenSyncRef.current = null;
      const tweenDuration =
        snapSync && snapSync.duration > 0 ? snapSync.duration : 0.35;
      const tweenEase = snapSync?.ease ?? ease;

      animationRef.current = gsap.to(progressRef, {
        value: 1,
        duration: tweenDuration,
        ease: tweenEase,
        onUpdate: () => {
          const t = progressRef.value;
          let currentProgress: number;
          if (needsWrap) {
            if (isForward) {
              // Clockwise wrap: startProgress -> 1.0 -> 0.0 -> targetProgress
              if (t < (1.0 - startProgress) / wrappedDistance) {
                const firstPartProgress = t / ((1.0 - startProgress) / wrappedDistance);
                currentProgress = startProgress + (1.0 - startProgress) * firstPartProgress;
              } else {
                const secondPartStart = (1.0 - startProgress) / wrappedDistance;
                const secondPartProgress = (t - secondPartStart) / (1 - secondPartStart);
                currentProgress = targetProgress * secondPartProgress;
              }
            } else {
              // Counterclockwise wrap: startProgress -> 0.0 -> 1.0 -> targetProgress
              if (t < startProgress / wrappedDistance) {
                const firstPartProgress = t / (startProgress / wrappedDistance);
                currentProgress = startProgress - startProgress * firstPartProgress;
              } else {
                const secondPartStart = startProgress / wrappedDistance;
                const secondPartProgress = (t - secondPartStart) / (1 - secondPartStart);
                currentProgress = 1.0 - (1.0 - targetProgress) * secondPartProgress;
              }
            }
          } else {
            // Direct: no wrap. Forward = clockwise = progress increases. Backward = counterclockwise = progress decreases.
            if (isForward) {
              currentProgress = startProgress + (targetProgress - startProgress) * t;
            } else {
              currentProgress = startProgress - (startProgress - targetProgress) * t;
            }
          }
          setCircleProgress(currentProgress);
        },
        onComplete: () => {
          currentPathProgress.current = targetProgress;
          previousSectionIndexRef.current = currentSectionIndex;
          isAnimatingRef.current = false;
          animationRef.current = null;
          setCircleProgress(targetProgress);
        },
      });
    };

    if (Math.abs(targetProgress - startProgress) > 0.001 && !isAnimatingRef.current) {
      animateToTarget();
    } else {
      orbitSnapTweenSyncRef.current = null;
      currentPathProgress.current = targetProgress;
      previousSectionIndexRef.current = currentSectionIndex;
      setCircleProgress(targetProgress);
    }

    return () => {
      if (animationRef.current) animationRef.current.kill();
    };
  }, [isHomePage, currentSectionIndex, ease]);

  // Color inversion: light page = black circle + white line, dark page = white circle + black line
  useEffect(() => {
    const updateColors = () => {
      let shouldInvert: boolean;
      if (colorModeState === 'dark') {
        // Page explicitly asked for dark nav = light page background → black circle
        shouldInvert = true;
      } else if (colorModeState === 'light') {
        // Page explicitly asked for light nav = dark page background → white circle
        shouldInvert = false;
      } else {
        // Auto: detect from DOM
        const background = detectPageBackground();
        shouldInvert = (background === 'light' && !isDarkState) || (background === 'dark' && isDarkState);
      }

      if (DEBUG_SETTINGS.logColorDetection) {
        console.log('🎨 OrbitNav V2 Color:', { colorMode: colorModeState, shouldInvert, willShow: shouldInvert ? 'black circle' : 'white circle' });
      }
      setIsInverted(shouldInvert);
      const navHover =
        document.body.classList.contains('nav-or-text-hovered') &&
        (window.location.pathname.replace(/\/+$/, '') || '/') === '/';
      setNavOrTextHovered(navHover);
    };

    updateColors();

    const observer = new MutationObserver(updateColors);
    if (isHomePage) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        subtree: true,
      });
    } else {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
    return () => observer.disconnect();
  }, [isDarkState, colorModeState, isHomePage]);

  // Section tracking (only active on homepage)
  // Viewport-center index + boundary hysteresis (avoids rapid index toggles at section edges).
  // While the orbit dot is tweening (default ~0.35s; matches section snap when driven by intent), skip scroll-driven index updates so the motion
  // path animation can run; updating index every frame during that window was killing/restarting
  // the tween and broke mobile track animation.
  useEffect(() => {
    if (!isHomePage) return;

    const sectionSelectors = [...HOMEPAGE_SECTION_SELECTORS];
    sectionsRef.current = sectionSelectors;

    const elements = queryHomepageSectionElements();
    if (elements.length === 0) return;

    if (homepageSectionIndexFromHash(window.location.hash) !== null) {
      homeHashOverrideConsumedRef.current = false;
    }

    let rafId = 0;
    let lastOrbitBlockedLogAt = 0;
    const tick = () => {
      rafId = 0;
      if (isAnimatingRef.current) {
        if (isScrollDiagnosticsEnabled()) {
          const now = Date.now();
          if (now - lastOrbitBlockedLogAt > 400) {
            lastOrbitBlockedLogAt = now;
            logScrollDiag('OrbitNav', 'tick skipped (orbit dot tweening)', {
              scrollY: Math.round(window.scrollY),
              innerHeight: window.innerHeight,
            });
          }
        }
        return;
      }

      /* GSAP snap moves scroll after intent; viewport center still lags — don’t overwrite index from scroll. */
      if (typeof document !== 'undefined' && document.body.classList.contains('section-snap-scrolling')) {
        return;
      }

      const centerY = window.scrollY + window.innerHeight * 0.5;
      const next = homepageScrollDerivedIndexOrHash(
        elements,
        centerY,
        sectionIndexHysteresisRef.current,
        homeHashOverrideConsumedRef,
      );
      setCurrentSectionIndex((prev) => {
        if (prev === next) return prev;
        sectionIndexHysteresisRef.current = next;
        if (isScrollDiagnosticsEnabled()) {
          const raw = homepageRawIndexForCenter(elements, centerY);
          logScrollDiag('OrbitNav', 'section index change', {
            from: prev,
            to: next,
            raw,
            scrollY: Math.round(window.scrollY),
            centerY: Math.round(centerY),
            selector: sectionSelectors[next],
          });
        }
        return next;
      });
    };

    const onScroll = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(tick);
    };

    const onResize = () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };

    // Re-sync after navigation (ref persists on the React instance)
    const centerY0 = window.scrollY + window.innerHeight * 0.5;
    const hashIdx0 = homepageSectionIndexFromHash(window.location.hash);
    if (hashIdx0 !== null && elements[hashIdx0] && centerY0 < elements[hashIdx0].offsetTop - 1) {
      sectionIndexHysteresisRef.current = hashIdx0;
    } else {
      sectionIndexHysteresisRef.current = homepageRawIndexForCenter(elements, centerY0);
    }

    const onSectionSnapIntent = (e: Event) => {
      const ce = e as CustomEvent<SectionSnapIntentDetail>;
      const detail = ce.detail;
      const idx = detail?.sectionIndex;
      if (typeof idx !== 'number' || idx < 0 || idx >= HOMEPAGE_SECTION_SELECTORS.length) return;
      const d = detail.duration;
      if (typeof d === 'number' && d > 0) {
        orbitSnapTweenSyncRef.current = { duration: d, ease: detail.ease ?? ease };
      } else {
        orbitSnapTweenSyncRef.current = null;
      }
      sectionIndexHysteresisRef.current = idx;
      setCurrentSectionIndex(idx);
    };

    tick();
    window.addEventListener(SECTION_SNAP_INTENT_EVENT, onSectionSnapIntent);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.removeEventListener(SECTION_SNAP_INTENT_EVENT, onSectionSnapIntent);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (rafId !== 0) cancelAnimationFrame(rafId);
    };
  }, [isHomePage, routeHash, ease]);

  // Hover handlers (no scale effect; kept for potential drop-shadow / future use)
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  /** Homepage only: slide-bar white hover flips dot; ignore stale body class on subpages. */
  const displayInverted = isInverted !== (navOrTextHovered && isHomePage);

  const shouldShowBack =
    (isInverted || showBackState) && !isHomePage && !!backTarget && backAnchorLocal;
  const backTextLight = showBackState && !isInverted;
  const canNavigateBack = !isHomePage && !!backTarget;

  /** Fade / slide “back” in after route + dot layout settle (avoids abrupt pop-in). */
  const [backReveal, setBackReveal] = useState(false);
  useEffect(() => {
    if (!shouldShowBack) {
      setBackReveal(false);
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBackReveal(true);
      return;
    }
    setBackReveal(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBackReveal(true));
    });
    return () => cancelAnimationFrame(id);
  }, [shouldShowBack, pathKey]);

  const navigateBack = () => {
    if (!backTarget) return;
    window.location.href = backTarget;
  };

  // Minimum touch target (px); dot hit area extends by this much on each side
  const HIT_AREA_PADDING = 20;

  const backRightPx =
    backAnchorLocal != null
      ? PATH_WIDTH - backAnchorLocal.x + dotSize / 2 - HIT_AREA_PADDING * 2
      : 0;
  const backTopPx =
    backAnchorLocal != null ? backAnchorLocal.y + dotSize / 2 + HIT_AREA_PADDING : 0;

  const orbitUi = (
    <div
      ref={containerRef}
      className="orbit-nav-container fixed z-[100] pointer-events-none [backface-visibility:hidden]"
      style={{
        top: `calc(${offsets.top}px + env(safe-area-inset-top, 0px))`,
        right: `calc(${offsets.right}px + env(safe-area-inset-right, 0px))`,
        width: PATH_WIDTH,
        height: PATH_HEIGHT,
      }}
    >
      {shouldShowBack && backAnchorLocal && (
        <button
          type="button"
          className={`absolute z-[110] text-xs md:text-sm lg:text-base font-bold py-3 px-4 min-h-[44px] min-w-[44px] flex items-center justify-end transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 ${backReveal ? 'pointer-events-auto opacity-100 hover:opacity-70' : 'pointer-events-none opacity-0'} ${backTextLight ? 'text-white' : 'text-black'}`}
          style={{
            right: `${backRightPx}px`,
            top: `${backTopPx}px`,
            transform: backReveal ? 'translateY(-50%)' : 'translateY(calc(-50% + 6px))',
          }}
          onClick={navigateBack}
        >
          back
        </button>
      )}

      <svg
        width={PATH_WIDTH}
        height={PATH_HEIGHT}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ overflow: 'visible' }}
        viewBox={`0 0 ${PATH_WIDTH} ${PATH_HEIGHT}`}
      >
        <path
          ref={pathRef}
          d={orbitPathD}
          fill="none"
          stroke={debugMarkers ? 'rgba(255,255,255,0.3)' : 'transparent'}
          strokeWidth="1"
          strokeDasharray={debugMarkers ? '2,2' : 'none'}
        />
        {debugMarkers && debugPositions.map((pos, i) => (
          <circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r="4"
            fill={i === currentSectionIndex ? '#00ff00' : 'rgba(255,255,255,0.6)'}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Dot: larger hit area (HIT_AREA_PADDING on each side), visual dot centered */}
      <div
        ref={circleRef}
        className={`absolute flex items-center justify-center pointer-events-auto ${canNavigateBack ? 'cursor-pointer' : 'cursor-default'}`}
        style={{
          width: dotSize + HIT_AREA_PADDING * 2,
          height: dotSize + HIT_AREA_PADDING * 2,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={canNavigateBack ? navigateBack : undefined}
        onKeyDown={canNavigateBack ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigateBack();
          }
        } : undefined}
        role={canNavigateBack ? 'button' : undefined}
        tabIndex={canNavigateBack ? 0 : undefined}
        aria-label={canNavigateBack ? 'Back' : 'Navigation'}
        title={canNavigateBack ? 'Back' : 'Navigation'}
      >
        <OrbitNavDot
          size={dotSize}
          circleFill={displayInverted ? "black" : "white"}
          rectFill={displayInverted ? "white" : "black"}
          running={true}
          lineAxis={isHomePage ? 'y' : 'x'}
          className={isHovered ? 'drop-shadow-md' : ''}
        />
      </div>
    </div>
  );

  /* Portal keeps `position:fixed` anchored to the layout viewport (iOS/WebKit quirk with nested / view-transition wrappers). */
  return typeof document !== 'undefined'
    ? createPortal(orbitUi, document.body)
    : orbitUi;
}

// Note: This is OrbitNav V2 - simplified version without text labels
// Ready for new circle animation implementation