import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DEBUG_SETTINGS } from '../../orbit-nav-config';

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

interface OrbitNavProps {
  isDark?: boolean;
  colorMode?: 'auto' | 'light' | 'dark';
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
 * - ScrollTrigger integration (preserved from v1)
 */
export default function OrbitNav({ 
  isDark = false, 
  colorMode = 'auto',
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
  const [debugPositions, setDebugPositions] = useState<Array<{x: number, y: number, label: string}>>([]);

  // Pill-shaped path (same as V1) - circle moves to positions along this path per section
  const PATH_WIDTH = 120;
  const PATH_HEIGHT = 50;

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
    if (colorMode === 'light') return 'light';
    if (colorMode === 'dark') return 'dark';

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
    currentPathProgress.current = leftCenter;
    previousSectionIndexRef.current = 0;

    if (debugMarkers && pathRef.current) {
      const pts: Array<{ x: number; y: number; label: string }> = [];
      sectionPositionsRef.current.forEach((progress, i) => {
        const pt = pathRef.current!.getPointAtLength(progress * pathRef.current!.getTotalLength());
        pts.push({ x: pt.x, y: pt.y, label: `${i}` });
      });
      setDebugPositions(pts);
    }
  }, [debugMarkers]);

  // Move circle to section position on section change (same as V1: forward = clockwise, backward = counterclockwise)
  useEffect(() => {
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
  }, [currentSectionIndex, ease]);

  // Color inversion based on page background
  useEffect(() => {
    const updateColors = () => {
      const background = detectPageBackground();
      const shouldInvert = (background === 'light' && !isDark) || (background === 'dark' && isDark);
      
      if (DEBUG_SETTINGS.logColorDetection) {
        console.log('🎨 OrbitNav V2 Color Detection:', {
          detectedBackground: background,
          isDark: isDark,
          shouldInvert: shouldInvert,
          willShowAs: shouldInvert ? 'black circle' : 'white circle'
        });
      }
      
      setIsInverted(shouldInvert);
    };

    updateColors();
    
    // Watch for background changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [isDark, colorMode]);

  // Section tracking (preserved from v1 for potential future use)
  useEffect(() => {
    const sections = [
      '#hero-trigger',
      '.company-name-section', 
      '.stats-section',
      '.video-section',
      '.why-solar-section',
      '.why-us-section', 
      '.clients-section',
      '.projets-section',
      '.contact-section'
    ];

    sectionsRef.current = sections;

    // Create ScrollTriggers for section detection
    const scrollTriggers: ScrollTrigger[] = [];

    sections.forEach((selector, index) => {
      const element = document.querySelector(selector);
      if (!element) return;

      const trigger = ScrollTrigger.create({
        trigger: element,
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => {
          if (!isAnimatingRef.current) {
            setCurrentSectionIndex(index);
            // Do NOT set previousSectionIndexRef here - it is updated in animation onComplete
            // so that isForward = (currentSectionIndex > previousSectionIndexRef) is correct
          }
        },
        onEnterBack: () => {
          if (!isAnimatingRef.current) {
            setCurrentSectionIndex(index);
            // Do NOT set previousSectionIndexRef here
          }
        }
      });

      scrollTriggers.push(trigger);
    });

    return () => {
      scrollTriggers.forEach(trigger => trigger.kill());
    };
  }, []);

  // Hover handlers
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (circleRef.current) {
      gsap.to(circleRef.current, {
        scale: 1.2,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (circleRef.current) {
      gsap.to(circleRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  };

  // V2: Always white circle (no color inversion)
  const circleColorClass = 'bg-white';
  const hoverColorClass = 'hover:bg-gray-100';
  const circleBorderClass = 'border-white';

  return (
    <div
      ref={containerRef}
      className="orbit-nav-container fixed top-12 right-40 md:top-16 md:right-40 z-50"
      style={{ width: PATH_WIDTH, height: PATH_HEIGHT }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

      {/* Circle moves along path (position set by GSAP motionPath, same as V1) */}
      <div
        ref={circleRef}
        className={`
          w-4 h-4 rounded-full absolute cursor-pointer border-2 border-white
          ${circleColorClass} ${hoverColorClass}
          ${isHovered ? 'shadow-lg' : ''}
        `}
        style={{
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
        title="Navigation"
      />
    </div>
  );
}

// Note: This is OrbitNav V2 - simplified version without text labels
// Ready for new circle animation implementation