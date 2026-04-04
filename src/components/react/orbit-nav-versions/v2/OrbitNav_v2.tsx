import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import {
  DEBUG_SETTINGS,
  getDotSize,
  getOrbitContainerOffsets,
  getOrbitPathDimensions,
} from '../../orbit-nav-config';
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
 */
function getBackTargetFromPath(normalisedPath: string): string | null {
  switch (normalisedPath) {
    case '/why-solar': return '/#why-solar-section';
    case '/why-work-with-us': return '/#why-us-section';
    case '/clients': return '/#clients-section';
    case '/projets':
    case '/projects': return '/#projets-section';
    case '/contact': return '/#contact-section';
    default: return '/';
  }
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
    case '/projects':
      return { colorMode: 'dark', showBack: false, isDark: false };
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
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isInverted, setIsInverted] = useState(false);
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
  const [isHomePage, setIsHomePage] = useState(true);
  const [backTarget, setBackTarget] = useState<string | null>(null);
  const [colorModeState, setColorModeState] = useState(colorMode);
  const [showBackState, setShowBackState] = useState(showBackOverride);
  const [isDarkState, setIsDarkState] = useState(isDark);
  const [dotCenter, setDotCenter] = useState<{ x: number; y: number } | null>(null);
  const syncDotCenterRef = useRef<() => void>(() => {});

  const syncDotCenter = () => {
    if (!pathRef.current || !containerRef.current) return;
    const path = pathRef.current;
    const progress = currentPathProgress.current;
    const totalLength = path.getTotalLength();
    const pt = path.getPointAtLength(progress * totalLength);
    const rect = containerRef.current.getBoundingClientRect();
    setDotCenter({ x: rect.left + pt.x, y: rect.top + pt.y });
  };

  useEffect(() => {
    syncDotCenterRef.current = syncDotCenter;
  });

  // Responsive orbit and dot size
  useEffect(() => {
    const update = () => {
      const newPathDimensions = getOrbitPathDimensions();
      const newDotSize = getDotSize();

      setPathDimensions(newPathDimensions);
      setDotSize(newDotSize);
      setOffsets(getOrbitContainerOffsets(newDotSize));
      requestAnimationFrame(() => syncDotCenterRef.current());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
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
    setBackTarget(newBackTarget);
    setColorModeState(newColorMode);
    setShowBackState(newShowBack);
    setIsDarkState(newIsDark);
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
      requestAnimationFrame(() => syncFromDocument());
    };

    document.addEventListener('astro:before-swap', onBeforeSwap);
    document.addEventListener('astro:page-load', onAfterNavigate);
    document.addEventListener('astro:after-swap', onAfterNavigate);
    return () => {
      document.removeEventListener('astro:before-swap', onBeforeSwap);
      document.removeEventListener('astro:page-load', onAfterNavigate);
      document.removeEventListener('astro:after-swap', onAfterNavigate);
    };
  }, []);

  const PATH_WIDTH = pathDimensions.w;
  const PATH_HEIGHT = pathDimensions.h;

  const createPillPath = (width: number, height: number) => {
    const radius = height / 2;
    return `M ${radius},0 H ${width - radius} A ${radius},${radius} 0 0 1 ${width - radius},${height} H ${radius} A ${radius},${radius} 0 0 1 ${radius},0 Z`;
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

  // Section positions along the pill path (same mapping as V1)
  const sectionPositionsRef = useRef<number[]>([]);

  // Set up pill path and compute section positions (same as V1)
  useEffect(() => {
    if (!pathRef.current) return;
    const path = pathRef.current;
    path.setAttribute('d', createPillPath(PATH_WIDTH, PATH_HEIGHT));

    const pathWidth = PATH_WIDTH;
    const pathHeight = PATH_HEIGHT;
    const leftCenter = calculatePathPosition(path, pathWidth, pathHeight, 'left-center');
    const rightCenter = calculatePathPosition(path, pathWidth, pathHeight, 'right-center');
    const section5And7X = 0.85;
    const section5TopX = calculatePathPosition(path, pathWidth, pathHeight, 'top-at-x', section5And7X);
    let distanceFromRightCenterTo5 = section5TopX - rightCenter;
    if (distanceFromRightCenterTo5 < 0) distanceFromRightCenterTo5 += 1.0;
    const leftCenterPos = calculatePathPosition(path, pathWidth, pathHeight, 'left-center');
    let section4And8Pos = leftCenterPos + distanceFromRightCenterTo5;
    if (section4And8Pos >= 1.0) section4And8Pos -= 1.0;
    const totalLength = path.getTotalLength();
    const radius = pathHeight / 2;
    const straightLength = pathWidth - pathHeight;
    const topStraightEnd = straightLength / totalLength;
    const rightSemicircleEnd = (straightLength + Math.PI * radius) / totalLength;
    const bottomStraightEnd = (straightLength * 2 + Math.PI * radius) / totalLength;
    const leftSemicircleStart = bottomStraightEnd;
    let section4And8X = 0.15;
    if (section4And8Pos >= 0 && section4And8Pos <= topStraightEnd) {
      section4And8X = section4And8Pos / topStraightEnd;
    } else if (section4And8Pos >= rightSemicircleEnd && section4And8Pos <= bottomStraightEnd) {
      const bottomStart = rightSemicircleEnd;
      const bottomEnd = bottomStraightEnd;
      const positionOnBottom = section4And8Pos - bottomStart;
      const bottomProgress = positionOnBottom / (bottomEnd - bottomStart);
      section4And8X = 1.0 - bottomProgress;
    }
    const section4TopX = calculatePathPosition(path, pathWidth, pathHeight, 'top-at-x', section4And8X);
    const section7BottomX = calculatePathPosition(path, pathWidth, pathHeight, 'bottom-at-x', section5And7X);
    const section8BottomX = calculatePathPosition(path, pathWidth, pathHeight, 'bottom-at-x', section4And8X);

    sectionPositionsRef.current = [
      leftCenter, leftCenter, leftCenter, leftCenter,
      section4TopX, section5TopX, rightCenter, section7BottomX, section8BottomX,
    ];
    
    // Only initialize position on first mount, preserve it across navigation/resize
    if (!hasInitializedPosition.current) {
      currentPathProgress.current = leftCenter;
      previousSectionIndexRef.current = 0;
      hasInitializedPosition.current = true;
    } else if (circleRef.current) {
      // Path dimensions changed (e.g. resize), reposition circle at current progress
      const circle = circleRef.current;
      const progress = currentPathProgress.current;
      gsap.set(circle, {
        motionPath: {
          path: path,
          autoRotate: false,
          start: progress,
          end: progress,
        },
      });
    }

    if (debugMarkers && pathRef.current) {
      const pts: Array<{ x: number; y: number; label: string }> = [];
      sectionPositionsRef.current.forEach((progress, i) => {
        const pt = pathRef.current!.getPointAtLength(progress * pathRef.current!.getTotalLength());
        pts.push({ x: pt.x, y: pt.y, label: `${i}` });
      });
      setDebugPositions(pts);
    }
    requestAnimationFrame(() => syncDotCenterRef.current());
  }, [debugMarkers, PATH_WIDTH, PATH_HEIGHT]);

  // Move circle to section position on section change (only active on homepage)
  useEffect(() => {
    // Only move dot based on section changes when on homepage
    if (!isHomePage) return;
    if (!circleRef.current || !pathRef.current || sectionPositionsRef.current.length === 0) return;

    const circle = circleRef.current;
    const path = pathRef.current;
    const positions = sectionPositionsRef.current;
    const targetProgress = positions[currentSectionIndex] ?? 0;
    const startProgress = currentPathProgress.current;

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
      gsap.set(circle, {
        motionPath: {
          path: path,
          autoRotate: false,
          start: p,
          end: p,
        },
      });
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

      animationRef.current = gsap.to(progressRef, {
        value: 1,
        duration: 0.35,
        ease: ease,
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
    };

    updateColors();

    const observer = new MutationObserver(updateColors);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });
    return () => observer.disconnect();
  }, [isDarkState, colorModeState]);

  // Section tracking (only active on homepage)
  // Viewport-center index + boundary hysteresis (avoids rapid index toggles at section edges).
  // While the orbit dot is tweening (~0.35s), skip scroll-driven index updates so the motion
  // path animation can run; updating index every frame during that window was killing/restarting
  // the tween and broke mobile track animation.
  useEffect(() => {
    if (!isHomePage) return;

    const SECTION_INDEX_HYSTERESIS_PX = 32;

    const sectionSelectors = [
      '#hero-trigger',
      '.company-name-section',
      '.stats-section',
      '.video-section',
      '.why-solar-section',
      '.why-us-section',
      '.clients-section',
      '.projets-section',
      '.contact-section',
    ];

    sectionsRef.current = sectionSelectors;

    const elements = sectionSelectors
      .map((sel) => document.querySelector(sel) as HTMLElement | null)
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const getRawIndexForCenter = (centerY: number): number => {
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
    };

    const getIndexWithHysteresis = (centerY: number): number => {
      const raw = getRawIndexForCenter(centerY);
      const last = sectionIndexHysteresisRef.current;
      if (raw === last) return last;
      if (Math.abs(raw - last) > 1) return raw;

      const margin = SECTION_INDEX_HYSTERESIS_PX;
      if (raw > last) {
        const topNext = elements[raw].offsetTop;
        return centerY >= topNext + margin ? raw : last;
      }
      const topLeave = elements[last].offsetTop;
      return centerY <= topLeave - margin ? raw : last;
    };

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

      const centerY = window.scrollY + window.innerHeight * 0.5;
      const next = getIndexWithHysteresis(centerY);
      setCurrentSectionIndex((prev) => {
        if (prev === next) return prev;
        sectionIndexHysteresisRef.current = next;
        if (isScrollDiagnosticsEnabled()) {
          const raw = getRawIndexForCenter(centerY);
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
    sectionIndexHysteresisRef.current = getRawIndexForCenter(centerY0);

    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (rafId !== 0) cancelAnimationFrame(rafId);
    };
  }, [isHomePage]);

  // Hover handlers (no scale effect; kept for potential drop-shadow / future use)
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const shouldShowBack = (isInverted || showBackState) && !isHomePage && !!backTarget && dotCenter;
  const backTextLight = showBackState && !isInverted;
  const canNavigateBack = !isHomePage && !!backTarget;

  const navigateBack = () => {
    if (!backTarget) return;
    window.location.href = backTarget;
  };

  // Minimum touch target (px); dot hit area extends by this much on each side
  const HIT_AREA_PADDING = 20;

  return (
    <>
      {shouldShowBack && dotCenter && (
        <button
          type="button"
          className={`fixed z-[100] text-xs md:text-sm lg:text-base font-bold hover:opacity-70 transition-opacity pointer-events-auto py-3 px-4 min-h-[44px] min-w-[44px] flex items-center justify-end ${backTextLight ? 'text-white' : 'text-black'}`}
          style={{
            right: `calc(100vw - ${dotCenter.x}px + ${dotSize/2}px - ${HIT_AREA_PADDING*2}px)`,
            top: dotCenter.y + dotSize/2 + HIT_AREA_PADDING,
            transform: 'translateY(-50%)',
          }}
          onClick={navigateBack}
        >
          back
        </button>
      )}

      <div
        ref={containerRef}
        className="orbit-nav-container fixed z-[100] pointer-events-none"
        style={{
          top: offsets.top,
          right: offsets.right,
          width: PATH_WIDTH,
          height: PATH_HEIGHT,
        }}
      >
        <svg
          width={PATH_WIDTH}
          height={PATH_HEIGHT}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ overflow: 'visible' }}
          viewBox={`0 0 ${PATH_WIDTH} ${PATH_HEIGHT}`}
        >
          <path
            ref={pathRef}
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
            circleFill={isInverted ? "black" : "white"}
            rectFill={isInverted ? "white" : "black"}
            running={true}
            lineAxis={isHomePage ? 'y' : 'x'}
            className={isHovered ? 'drop-shadow-md' : ''}
          />
        </div>
      </div>
    </>
  );
}

// Note: This is OrbitNav V2 - simplified version without text labels
// Ready for new circle animation implementation