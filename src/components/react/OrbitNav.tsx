import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { routeLabels } from '../../utils/navigation';

gsap.registerPlugin(MotionPathPlugin);

interface OrbitNavProps {
  isDark?: boolean;
  colorMode?: 'auto' | 'light' | 'dark';
  ease?: string; // Configurable easing function
  debugMarkers?: boolean; // Toggle debug markers on/off
}

// Section labels mapping
const sectionLabels: Record<string, string> = {
  '#hero-trigger': '', // No text for section 0
  '.company-name-section': '', // No text for section 1
  '.stats-section': '', // No text for section 2
  '.video-section': '',
  '.why-solar-section': 'le solaire?',
  '.why-us-section': 'nous?',
  '.clients-section': 'clients',
  '.projets-section': 'projets',
  '.contact-section': 'contact',
};

export default function OrbitNav({ 
  isDark = false, 
  colorMode = 'auto',
  ease = 'power3.inOut', // Default physics-based easing
  debugMarkers = false // Default to off
}: OrbitNavProps) {
  const circleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement | HTMLAnchorElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const currentSectionSelectorRef = useRef<string>(''); // Track actual section selector
  const [isInverted, setIsInverted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownHovered, setIsDropdownHovered] = useState(false);
  const [areTargetSectionsInView, setAreTargetSectionsInView] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);
  const sectionsRef = useRef<string[]>([]);
  const currentPathProgress = useRef<number>(0); // Track current position along path
  const previousSectionIndexRef = useRef<number>(0); // Track previous section index for direction detection
  const isAnimatingRef = useRef<boolean>(false); // Track if animation is in progress
  const [debugPositions, setDebugPositions] = useState<Array<{x: number, y: number, label: string}>>([]);

  // Create pill-shaped path with outward-facing semicircles (like a real pill)
  // The semicircles on left and right should bulge outward
  const createPillPath = (width: number, height: number) => {
    const radius = height / 2;

  // Clockwise pill path starting at left center
  const path = `
    M ${radius},0
    H ${width - radius}
    A ${radius},${radius} 0 0 1 ${width - radius},${height}
    H ${radius}
    A ${radius},${radius} 0 0 1 ${radius},0
    Z
  `;

  return path;
  };

  // Utility function to measure actual text width
  const measureTextWidth = (text: string, element: HTMLElement): number => {
    // First try to use the element's actual rendered width (most accurate)
    // This works even if opacity is 0, as long as the element is in the DOM
    if (element.textContent === text && element.offsetWidth > 0) {
      return element.offsetWidth;
    }
    
    // Fallback to Canvas API measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return text.length * 8; // Final fallback if canvas not available
    
    // Get computed styles from the text element
    const computedStyle = window.getComputedStyle(element);
    const fontFamily = computedStyle.fontFamily || 'system-ui';
    const fontSize = computedStyle.fontSize || '14px';
    const fontWeight = computedStyle.fontWeight || '300';
    const fontStyle = computedStyle.fontStyle || 'normal';
    const letterSpacing = computedStyle.letterSpacing || 'normal';
    
    // Set font on canvas context
    context.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
    
    // Measure text width
    const metrics = context.measureText(text);
    let width = metrics.width;
    
    // Account for letter spacing if it's not 'normal'
    if (letterSpacing !== 'normal') {
      const letterSpacingValue = parseFloat(letterSpacing);
      if (!isNaN(letterSpacingValue)) {
        width += letterSpacingValue * (text.length - 1);
      }
    }
    
    return width;
  };

  // Utility function to calculate positions along the path based on actual geometry
  // This ensures positions are correct regardless of path dimensions
  const calculatePathPosition = (
    pathElement: SVGPathElement,
    pathWidth: number,
    pathHeight: number,
    positionType: 'left-center' | 'right-center' | 'top-at-x' | 'bottom-at-x',
    xPercent?: number // For top-at-x and bottom-at-x: 0.0 = left edge, 1.0 = right edge of straight section
  ): number => {
    if (!pathElement) return 0;

    const totalLength = pathElement.getTotalLength();
    const radius = pathHeight / 2;
    const straightLength = pathWidth - pathHeight;

    // Calculate segment lengths
    const topStraightLength = straightLength;
    const rightSemicircleLength = Math.PI * radius; // Half circle
    const bottomStraightLength = straightLength;
    const leftSemicircleLength = Math.PI * radius; // Half circle

    // Calculate cumulative positions (in path length units)
    const topStraightEnd = topStraightLength;
    const rightSemicircleEnd = topStraightEnd + rightSemicircleLength;
    const bottomStraightEnd = rightSemicircleEnd + bottomStraightLength;
    const leftSemicircleEnd = bottomStraightEnd + leftSemicircleLength;

    let position = 0;

    switch (positionType) {
      case 'left-center':
        // Middle of left semicircle (vertical center, at x = radius, y = height/2)
        // Left semicircle starts at bottomStraightEnd and goes to totalLength
        const leftSemicircleStart = bottomStraightEnd;
        position = leftSemicircleStart + (leftSemicircleLength / 2);
        break;

      case 'right-center':
        // Middle of right semicircle (vertical center, at x = width - radius, y = height/2)
        // Right semicircle starts at topStraightEnd and goes to rightSemicircleEnd
        position = topStraightEnd + (rightSemicircleLength / 2);
        break;

      case 'top-at-x':
        // Position on top straight line at xPercent along the straight section
        // xPercent: 0.0 = left edge (radius), 1.0 = right edge (width - radius)
        if (xPercent === undefined) xPercent = 0;
        position = topStraightLength * xPercent;
        break;

      case 'bottom-at-x':
        // Position on bottom straight line at xPercent along the straight section
        // xPercent: 0.0 = left edge (radius), 1.0 = right edge (width - radius)
        // Note: bottom goes right to left, so we reverse: (1 - xPercent) maps left->right to right->left
        if (xPercent === undefined) xPercent = 0;
        position = rightSemicircleEnd + (bottomStraightLength * (1 - xPercent));
        break;
    }

    // Convert to percentage (0.0 - 1.0)
    return position / totalLength;
  };

  useEffect(() => {
    // Get section order from DOM
    const getSectionOrder = () => {
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
      return sectionSelectors;
    };

    getSectionOrder();

    // Listen for section changes via custom event or scroll position
    const handleSectionChange = () => {
      // Map selectors to their elements
      const sectionMap = sectionsRef.current.map(sel => ({
        selector: sel,
        element: document.querySelector(sel) as HTMLElement | null
      })).filter(item => item.element !== null);
      
      if (sectionMap.length === 0) return;

      // Find which section is currently in view (center of viewport)
      const viewportCenter = window.innerHeight / 2;
      let currentSection = sectionMap[0];
      let minDistance = Infinity;

      sectionMap.forEach(({ selector, element }) => {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);
        
        if (distance < minDistance && rect.top < viewportCenter && rect.bottom > viewportCenter) {
          minDistance = distance;
          currentSection = { selector, element };
        }
      });

      // Find the index in the original array for backward compatibility
      const originalIndex = sectionsRef.current.indexOf(currentSection.selector);
      setCurrentSectionIndex(originalIndex >= 0 ? originalIndex : 0);
      currentSectionSelectorRef.current = currentSection.selector;
    };

    // Initial check
    handleSectionChange();
    
    // Initialize selector ref
    if (sectionsRef.current.length > 0 && currentSectionSelectorRef.current === '') {
      const firstExisting = sectionsRef.current.find(sel => document.querySelector(sel));
      if (firstExisting) {
        currentSectionSelectorRef.current = firstExisting;
      }
    }

    // Check on scroll
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleSectionChange, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also listen for section snap completion
    const handleSnapComplete = () => {
      setTimeout(handleSectionChange, 50);
    };
    window.addEventListener('scroll', handleSnapComplete, { passive: true });

    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleSnapComplete);
    };
  }, []);

  useEffect(() => {
    if (!circleRef.current || !pathRef.current || sectionsRef.current.length === 0) return;

    // Kill any existing animation and reset animation flag
    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }
    isAnimatingRef.current = false;

    // Create pill path
    const pathWidth = 120; // Total width of pill
    const pathHeight = 50; // Height of pill (radius * 2)
    const pathData = createPillPath(pathWidth, pathHeight);
    
    if (pathRef.current) {
      pathRef.current.setAttribute('d', pathData);
    }

    // Calculate positions along path for each section using geometry-based utility
    const totalSections = sectionsRef.current.length;
    const positions: number[] = [];
    
    // Calculate positions based on actual path geometry
    // This ensures positions are correct regardless of path dimensions
    if (pathRef.current) {
      // Left center (middle of left semicircle, vertical center)
      const leftCenter = calculatePathPosition(pathRef.current, pathWidth, pathHeight, 'left-center');
      
      // Right center (middle of right semicircle, vertical center)
      const rightCenter = calculatePathPosition(pathRef.current, pathWidth, pathHeight, 'right-center');
      
      // Section positions:
      // - Section 4 (why-solar): top left, vertically above section 8
      // - Section 5 (why-us): top right, spread out from section 4
      // - Section 7 (projets): bottom right, vertically below section 5
      // - Section 8 (contact): bottom left, vertically below section 4
      //
      // Sections 4/8 should be the same distance from left center (sections 1-3)
      // as sections 5/7 are from right center (section 6)
      
      // First, calculate right center and section 5/7 positions
      const rightCenterPos = calculatePathPosition(pathRef.current, pathWidth, pathHeight, 'right-center');
      const section5And7X = 0.85; // 85% from left edge
      const section5TopX = calculatePathPosition(pathRef.current, pathWidth, pathHeight, 'top-at-x', section5And7X);
      
      // Calculate distance from right center to section 5 along the path (clockwise)
      // Since path is circular, we need to handle wrapping
      let distanceFromRightCenterTo5 = section5TopX - rightCenterPos;
      if (distanceFromRightCenterTo5 < 0) {
        distanceFromRightCenterTo5 += 1.0; // Wrap around
      }
      
      // Now calculate left center position
      const leftCenterPos = calculatePathPosition(pathRef.current, pathWidth, pathHeight, 'left-center');
      
      // Position section 4/8 the same distance from left center (going clockwise)
      // Calculate the target position for section 4/8
      let section4And8Pos = leftCenterPos + distanceFromRightCenterTo5;
      if (section4And8Pos >= 1.0) {
        section4And8Pos -= 1.0; // Wrap around
      }
      
      // Now we need to find what xPercent on top/bottom gives us this position
      // Get path geometry
      const totalLength = pathRef.current.getTotalLength();
      const radius = pathHeight / 2;
      const straightLength = pathWidth - pathHeight;
      const topStraightLength = straightLength;
      const rightSemicircleLength = Math.PI * radius;
      const bottomStraightLength = straightLength;
      const leftSemicircleLength = Math.PI * radius;
      
      const topStraightEnd = topStraightLength / totalLength;
      const rightSemicircleEnd = (topStraightLength + rightSemicircleLength) / totalLength;
      const bottomStraightEnd = (topStraightLength + rightSemicircleLength + bottomStraightLength) / totalLength;
      const leftSemicircleStart = bottomStraightEnd;
      
      let section4And8X = 0.15; // Default fallback
      
      // Check if section 4/8 position is on top straight
      if (section4And8Pos >= 0 && section4And8Pos <= topStraightEnd) {
        // On top straight
        section4And8X = section4And8Pos / topStraightEnd;
      } else if (section4And8Pos >= leftSemicircleStart && section4And8Pos <= 1.0) {
        // On bottom straight (wrapped around)
        // Bottom goes from rightSemicircleEnd to leftSemicircleStart
        const bottomStart = rightSemicircleEnd;
        const bottomEnd = leftSemicircleStart;
        const positionOnBottom = section4And8Pos >= bottomStart 
          ? section4And8Pos - bottomStart 
          : (1.0 - bottomStart) + section4And8Pos; // Wrapped
        const bottomProgress = positionOnBottom / (bottomEnd - bottomStart);
        section4And8X = 1.0 - bottomProgress; // Reverse because bottom goes right-to-left
      }
      
      // Calculate all positions
      const section4TopX = calculatePathPosition(pathRef.current, pathWidth, pathHeight, 'top-at-x', section4And8X);
      const section7BottomX = calculatePathPosition(pathRef.current, pathWidth, pathHeight, 'bottom-at-x', section5And7X);
      const section8BottomX = calculatePathPosition(pathRef.current, pathWidth, pathHeight, 'bottom-at-x', section4And8X);
      
      // Map each section to its calculated position
      positions.push(
        leftCenter,   // Section 0: hero - left center
        leftCenter,   // Section 1: company-name - left center
        leftCenter,   // Section 2: stats - left center
        leftCenter,   // Section 3: video - left center
        section4TopX, // Section 4: why-solar - top, same distance from left center as section 5 is from right center
        section5TopX, // Section 5: why-us - top right, vertically above section 7
        rightCenter,  // Section 6: clients - right center (same y as sections 1-3)
        section7BottomX, // Section 7: projets - bottom right, vertically below section 5
        section8BottomX, // Section 8: contact - bottom left, vertically below section 4
      );
      
      // Map each section to its calculated position
      positions.push(
        leftCenter,   // Section 0: hero - left center
        leftCenter,   // Section 1: company-name - left center
        leftCenter,   // Section 2: stats - left center
        leftCenter,   // Section 3: video - left center
        section4TopX, // Section 4: why-solar - top, vertically above section 8
        section5TopX, // Section 5: why-us - top right, vertically above section 7
        rightCenter,  // Section 6: clients - right center (same y as sections 1-3)
        section7BottomX, // Section 7: projets - bottom right, vertically below section 5
        section8BottomX, // Section 8: contact - bottom left, vertically below section 4
      );
    } else {
      // Fallback to default positions if path not ready
      positions.push(0.875, 0.875, 0.875, 0.875, 0.05, 0.20, 0.375, 0.55, 0.70);
    }
    
    // Ensure we have positions for all sections
    while (positions.length < totalSections) {
      positions.push(0);
    }

    // Calculate debug positions for visualization
    // Use requestAnimationFrame to ensure path is rendered first
    requestAnimationFrame(() => {
      if (pathRef.current) {
        const debugPoints: Array<{x: number, y: number, label: string}> = [];
        const sectionLabels = [
          'Hero', 'Company', 'Stats', 'Video', 
          'Why Solar', 'Why Us', 'Clients', 'Projets', 'Contact'
        ];
        
        positions.forEach((progress, index) => {
          // Get point along path at this progress
          const pathLength = pathRef.current!.getTotalLength();
          const point = pathRef.current!.getPointAtLength(pathLength * progress);
          
          // MotionPath positions the element's transform-origin at the path point
          // The circle has transformOrigin: 'center center' and is w-4 h-4 (16px)
          // The circle's initial position is left: 8px, top: 28px
          // The path starts at (radius, 0) = (25, 0) in path coordinates
          // But the SVG viewBox is 0 0 200 60, and path is 120x50
          // 
          // The issue: MotionPath applies a transform that moves the circle from its
          // initial position to the path point. The transform-origin is 'center center',
          // so the circle's center should align with the path point.
          //
          // However, the circle's initial position (8px, 28px) might not correspond to
          // the path's starting point in SVG coordinates. We need to find the offset.
          //
          // Path starts at (radius, 0) = (25, 0) in the path's coordinate system
          // But in the SVG viewBox (0 0 200 60), the path might be positioned differently
          // 
          // For now, use the path coordinates directly - MotionPath should handle the alignment
          // If there's still an offset, we may need to adjust the circle's initial position
          // or account for the path's position within the SVG
          debugPoints.push({
            x: point.x,
            y: point.y,
            label: `${index}: ${sectionLabels[index] || 'Section'} (${(progress * 100).toFixed(1)}%)`
          });
        });
        
        setDebugPositions(debugPoints);
        console.log('📍 OrbitNav Debug Positions:', debugPoints);
        console.log('📍 OrbitNav Path Length:', pathRef.current.getTotalLength());
      }
    });

    // Get target position for current section
    const targetProgress = positions[currentSectionIndex] || 0;
    const startProgress = currentPathProgress.current; // Start from tracked current position
    
    console.log(`🎯 OrbitNav: Section ${currentSectionIndex}, start: ${startProgress.toFixed(3)}, target: ${targetProgress.toFixed(3)}`);
    
    // Set initial position on first render (left center position)
    if (currentSectionIndex === 0 && currentPathProgress.current === 0) {
      const initialPosition = 0.875; // Left center (middle of left semicircle)
      
      // Set initial position using MotionPath
      // MotionPath positions the element's transform-origin at the path point
      // Since transform-origin is 'center center', the circle's center will be at the path point
      // We need to ensure the circle starts at the path's initial position
      if (pathRef.current && circleRef.current) {
        const pathLength = pathRef.current.getTotalLength();
        const initialPoint = pathRef.current.getPointAtLength(pathLength * initialPosition);
        
        // MotionPath uses transforms, so we set the initial position to match the path point
        // The circle is 16px (w-4 h-4), center is at 8px from top-left
        // MotionPath will position the transform-origin (center) at the path point
        // So we set the initial x/y to position the circle correctly
        gsap.set(circleRef.current, {
          motionPath: {
            path: pathRef.current,
            autoRotate: false,
            start: initialPosition,
            end: initialPosition,
          },
          // Set initial position to match path point (accounting for circle center)
          x: initialPoint.x,
          y: initialPoint.y,
        });
      }
      
      currentPathProgress.current = initialPosition;
      previousSectionIndexRef.current = 0;
    }
    
    // Helper function to handle text display and positioning
    // Called after circle animation completes
    const handleTextDisplay = () => {
      if (textContainerRef.current && textRef.current && pathRef.current && circleRef.current) {
        // Use the actual selector if available, otherwise fall back to index
        const selector = currentSectionSelectorRef.current || sectionsRef.current[currentSectionIndex];
        const label = sectionLabels[selector] || '';
        
        // Get the circle's current position on the path
        const pathLength = pathRef.current.getTotalLength();
        const circlePoint = pathRef.current.getPointAtLength(pathLength * targetProgress);
        
        if (label) {
          // Measure actual text width
          const textWidth = measureTextWidth(label, textRef.current);
          
          // Position text container to the left of circle center, vertically centered
          // Add padding (32px) between circle and text
          const textOffset = textWidth + 12; // Half text width + padding to circle center
          const textX = circlePoint.x - textOffset; // Text to the left of circle
          const textY = circlePoint.y - 2; // Vertically centered with circle
          
          // Set position immediately, then fade in
          gsap.set(textContainerRef.current, { x: textX, y: textY });
          gsap.to(textRef.current, {
            opacity: 1,
            duration: 0.3,
            ease: 'power2.out',
          });
        } else {
          // For sections without labels, position container to the left of circle for dropdown
          // Use a fixed offset similar to sections with labels
          const textOffset = 72; // Fixed offset to position dropdown to the left
          const textX = circlePoint.x - textOffset; // To the left of circle
          const textY = circlePoint.y - 20; // Vertically centered with circle
          console.log('📍 handleTextDisplay: Positioning container for section without label', {
            textX,
            textY,
            circlePoint: { x: circlePoint.x, y: circlePoint.y },
            currentSectionIndex,
          });
          // Position container and ensure it's visible for hover detection
          gsap.set(textContainerRef.current, { 
            x: textX, 
            y: textY,
            opacity: 1, // Keep container visible for hover
            visibility: 'visible',
          });
          gsap.to(textRef.current, { opacity: 0, duration: 0.2 });
        }
      }
    };

    // Only animate if there's a change in position and we're not already animating
    if (Math.abs(targetProgress - startProgress) > 0.001 && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      
      // Determine direction: forward (clockwise) or backward (counterclockwise)
      const isForward = currentSectionIndex > previousSectionIndexRef.current;
      const needsWrap = isForward 
        ? startProgress > targetProgress  // Forward: wrap if start > target
        : startProgress < targetProgress; // Backward: wrap if start < target
      
      console.log(`🎬 OrbitNav: Starting animation from section ${previousSectionIndexRef.current} to ${currentSectionIndex}, forward: ${isForward}, wrap: ${needsWrap}`);
      
      if (needsWrap) {
        // Need to wrap around the path - use a single continuous animation
        // Calculate the wrapped distance
        const wrappedDistance = isForward 
          ? (1.0 - startProgress) + targetProgress  // Forward: distance to end + distance from start
          : startProgress + (1.0 - targetProgress); // Backward: distance to start + distance from end
        
        // Use a single animation with custom progress calculation
        // Match duration with section snap animation (0.35s)
        const progressRef = { value: 0 };
        animationRef.current = gsap.to(progressRef, {
          value: 1,
          duration: 0.35, // Match sectionSnap snapDuration
          ease: ease,
          onUpdate: () => {
            const t = progressRef.value;
            let currentProgress: number;
            
            if (isForward) {
              // Forward (clockwise) wrap: startProgress -> 1.0 -> 0.0 -> targetProgress
              if (t < (1.0 - startProgress) / wrappedDistance) {
                // First part: from startProgress to 1.0
                const firstPartProgress = t / ((1.0 - startProgress) / wrappedDistance);
                currentProgress = startProgress + (1.0 - startProgress) * firstPartProgress;
              } else {
                // Second part: from 0.0 to targetProgress
                const secondPartStart = (1.0 - startProgress) / wrappedDistance;
                const secondPartProgress = (t - secondPartStart) / (1 - secondPartStart);
                currentProgress = targetProgress * secondPartProgress;
              }
            } else {
              // Backward (counterclockwise) wrap: startProgress -> 0.0 -> 1.0 -> targetProgress
              if (t < startProgress / wrappedDistance) {
                // First part: from startProgress to 0.0
                const firstPartProgress = t / (startProgress / wrappedDistance);
                currentProgress = startProgress - startProgress * firstPartProgress;
              } else {
                // Second part: from 1.0 to targetProgress
                const secondPartStart = startProgress / wrappedDistance;
                const secondPartProgress = (t - secondPartStart) / (1 - secondPartStart);
                currentProgress = 1.0 - (1.0 - targetProgress) * secondPartProgress;
              }
            }
            
            // Normalize to 0-1 range
            if (currentProgress >= 1.0) currentProgress -= 1.0;
            if (currentProgress < 0.0) currentProgress += 1.0;
            
            currentPathProgress.current = currentProgress;
            
            // Update circle position
            if (pathRef.current && circleRef.current) {
              gsap.set(circleRef.current, {
                motionPath: {
                  path: pathRef.current,
                  autoRotate: false,
                  start: currentProgress,
                  end: currentProgress,
                },
              });
            }
          },
          onComplete: () => {
            currentPathProgress.current = targetProgress;
            previousSectionIndexRef.current = currentSectionIndex;
            isAnimatingRef.current = false;
            console.log(`✅ OrbitNav: Animation complete (wrapped ${isForward ? 'CW' : 'CCW'}), now at progress ${targetProgress.toFixed(3)}`);
            handleTextDisplay();
          },
        });
      } else {
        // No wrap needed - direct animation
        // Match duration with section snap animation (0.35s)
        animationRef.current = gsap.to(circleRef.current, {
          motionPath: {
            path: pathRef.current,
            autoRotate: false,
            start: startProgress,
            end: targetProgress,
          },
          duration: 0.35, // Match sectionSnap snapDuration
          ease: ease,
          onUpdate: () => {
            if (animationRef.current && 'progress' in animationRef.current) {
              const progress = animationRef.current.progress();
              currentPathProgress.current = startProgress + (targetProgress - startProgress) * progress;
            }
          },
          onComplete: () => {
            currentPathProgress.current = targetProgress;
            previousSectionIndexRef.current = currentSectionIndex;
            isAnimatingRef.current = false;
            console.log(`✅ OrbitNav: Animation complete (${isForward ? 'CW' : 'CCW'}), now at progress ${targetProgress.toFixed(3)}`);
            handleTextDisplay();
          },
        });
      }
    } else {
      // No animation needed, but still update text and previous index
      currentPathProgress.current = targetProgress;
      previousSectionIndexRef.current = currentSectionIndex;
      console.log(`⏸️ OrbitNav: No movement needed (already at target)`);
      handleTextDisplay();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [currentSectionIndex, ease]);

  useEffect(() => {
    // Check if any of the three target sections are in viewport
    const checkSectionsInView = () => {
      const whySolarSection = document.querySelector('.why-solar-section');
      const whyUsSection = document.querySelector('.why-us-section');
      const clientsSection = document.querySelector('.clients-section');

      const sections = [whySolarSection, whyUsSection, clientsSection].filter(Boolean) as HTMLElement[];

      if (sections.length === 0) {
        setAreTargetSectionsInView(false);
        return;
      }

      const isAnyInView = sections.some((section) => {
        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        return rect.top < viewportHeight && rect.bottom > 0 && rect.left < viewportWidth && rect.right > 0;
      });

      setAreTargetSectionsInView(isAnyInView);
      
      if (!isAnyInView) {
        setIsHovered(false);
        document.body.classList.remove('nav-or-text-hovered');
      }
    };

    checkSectionsInView();

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        checkSectionsInView();
      }, 50);
    };

    const sectionVisibilityMap = new Map<Element, boolean>();
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionVisibilityMap.set(entry.target, entry.isIntersecting);
        });
        const isAnyVisible = Array.from(sectionVisibilityMap.values()).some((visible) => visible);
        setAreTargetSectionsInView(isAnyVisible);
        
        if (!isAnyVisible) {
          setIsHovered(false);
          document.body.classList.remove('nav-or-text-hovered');
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
      }
    );

    const whySolarSection = document.querySelector('.why-solar-section');
    const whyUsSection = document.querySelector('.why-us-section');
    const clientsSection = document.querySelector('.clients-section');

    [whySolarSection, whyUsSection, clientsSection].forEach((section) => {
      if (section) {
        observer.observe(section);
        sectionVisibilityMap.set(section, false);
      }
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkSectionsInView, { passive: true });

    return () => {
      clearTimeout(scrollTimeout);
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkSectionsInView);
    };
  }, []);

  useEffect(() => {
    const handleTextHover = () => {
      if (areTargetSectionsInView) {
        setIsHovered(true);
        document.body.classList.add('nav-or-text-hovered');
      }
    };
    
    const handleTextLeave = () => {
      setIsHovered(false);
      if (!containerRef.current?.matches(':hover')) {
        document.body.classList.remove('nav-or-text-hovered');
      }
    };

    const whySolarText = document.querySelector('#why-solar-text');
    const whyUsText = document.querySelector('#why-us-text');
    const clientsText = document.querySelector('#clients-text');

    if (whySolarText) {
      whySolarText.addEventListener('mouseenter', handleTextHover);
      whySolarText.addEventListener('mouseleave', handleTextLeave);
    }
    if (whyUsText) {
      whyUsText.addEventListener('mouseenter', handleTextHover);
      whyUsText.addEventListener('mouseleave', handleTextLeave);
    }
    if (clientsText) {
      clientsText.addEventListener('mouseenter', handleTextHover);
      clientsText.addEventListener('mouseleave', handleTextLeave);
    }

    return () => {
      if (whySolarText) {
        whySolarText.removeEventListener('mouseenter', handleTextHover);
        whySolarText.removeEventListener('mouseleave', handleTextLeave);
      }
      if (whyUsText) {
        whyUsText.removeEventListener('mouseenter', handleTextHover);
        whyUsText.removeEventListener('mouseleave', handleTextLeave);
      }
      if (clientsText) {
        clientsText.removeEventListener('mouseenter', handleTextHover);
        clientsText.removeEventListener('mouseleave', handleTextLeave);
      }
      document.body.classList.remove('nav-or-text-hovered');
    };
  }, [areTargetSectionsInView]);

  useEffect(() => {
    const checkBackground = () => {
      if (colorMode !== 'auto') {
        setIsInverted(colorMode === 'dark');
        return;
      }

      const firstSection = document.querySelector('section');
      if (!firstSection) {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        const bgColor = computedStyle.backgroundColor;
        const rgb = bgColor.match(/\d+/g);
        if (rgb) {
          const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
          setIsInverted(brightness > 128);
        }
        return;
      }

      const computedStyle = window.getComputedStyle(firstSection);
      const bgColor = computedStyle.backgroundColor;
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
        setIsInverted(brightness > 128);
      } else {
        const isBlack = firstSection.classList.contains('bg-black') || 
                       firstSection.classList.contains('bg-charcoal');
        setIsInverted(!isBlack);
      }
    };

    checkBackground();
    
    const observer = new MutationObserver(checkBackground);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true,
    });

    const handleScroll = () => {
      const sections = document.querySelectorAll('section');
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
          const computedStyle = window.getComputedStyle(section);
          const bgColor = computedStyle.backgroundColor;
          const rgb = bgColor.match(/\d+/g);
          if (rgb) {
            const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
            setIsInverted(brightness > 128);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [colorMode]);

  // Update text content when section changes - hide immediately
  // Text will be shown again in handleTextDisplay after circle animation completes
  useEffect(() => {
    if (!textRef.current) return;

    // Immediately hide text when section changes (before circle animation starts)
    // This ensures previous section text disappears as soon as swipe starts
    gsap.to(textRef.current, {
      opacity: 0,
      duration: 0.1, // Quick fade out
      onComplete: () => {
        // Update text content after fade out (but keep it hidden)
        // It will be shown in handleTextDisplay after circle animation completes
        if (textRef.current) {
          // Use the actual selector if available, otherwise fall back to index
          const selector = currentSectionSelectorRef.current || sectionsRef.current[currentSectionIndex];
          const label = sectionLabels[selector] || '';
          textRef.current.textContent = label;
          // Keep opacity at 0 - handleTextDisplay will fade it in after circle animation
          gsap.set(textRef.current, { opacity: 0 });
        }
      },
    });
  }, [currentSectionIndex]);

  const circleColor = (isHovered && areTargetSectionsInView) ? 'bg-black' : (isDark || isInverted ? 'bg-black' : 'bg-white');
  const textColor = (isHovered && areTargetSectionsInView) ? 'text-black' : (isDark || isInverted ? 'text-black' : 'text-white');

  // Dropdown menu items - all navigation sections
  const dropdownItems = [
    { label: 'le solaire?', href: '/why-solar/', selector: '.why-solar-section' },
    { label: 'nous?', href: '/why-work-with-us/', selector: '.why-us-section' },
    { label: 'clients', href: '/clients/', selector: '.clients-section' },
    { label: 'projets', href: '/projets/', selector: '.projets-section' },
    { label: 'home', href: '/', selector: '#hero-trigger' },
    { label: 'contact', href: 'mailto:contact@rochatsolaire.com', selector: null },
  ];

  // Get current section label
  const getCurrentSectionLabel = () => {
    const selector = currentSectionSelectorRef.current || sectionsRef.current[currentSectionIndex];
    const label = sectionLabels[selector] || '';
    // Return empty string if no label (for sections without text)
    return label;
  };

  // Get current section href
  const getCurrentSectionHref = () => {
    const currentLabel = getCurrentSectionLabel();
    const currentItem = dropdownItems.find(item => item.label === currentLabel);
    return currentItem?.href || '#';
  };

  return (
    <div 
      ref={containerRef}
      className="orbit-nav-container fixed top-12 right-40 md:top-16 md:right-40 z-50"
      style={{
        padding: '20px', // Add padding to create larger hover zone
        margin: '-20px', // Negative margin to keep positioning the same
      }}
      onMouseEnter={(e) => {
        console.log('🖱️ Container onMouseEnter', {
          x: e.clientX,
          y: e.clientY,
          target: (e.target as HTMLElement)?.tagName,
          currentTarget: (e.currentTarget as HTMLElement)?.className,
        });
        setIsHovered(true);
        setIsDropdownHovered(true);
        if (areTargetSectionsInView) {
          document.body.classList.add('nav-or-text-hovered');
        }
      }}
      onMouseLeave={(e) => {
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Check if we're moving to any part of the nav (circle, text, or dropdown)
        // Ensure relatedTarget is a Node before calling contains()
        const isValidNode = relatedTarget && relatedTarget instanceof Node;
        const isMovingToContainer = isValidNode && containerRef.current && containerRef.current.contains(relatedTarget);
        const isMovingToTextContainer = isValidNode && textContainerRef.current && textContainerRef.current.contains(relatedTarget);
        const isMovingToCircle = isValidNode && circleRef.current && circleRef.current.contains(relatedTarget);
        const isMovingToDropdown = relatedTarget && relatedTarget instanceof Element && relatedTarget.closest('.dropdown-items');
        const isMovingToNavContainer = relatedTarget && relatedTarget instanceof Element && relatedTarget.closest('.orbit-nav-container');
        
        const isMovingWithinNav = isMovingToContainer || isMovingToTextContainer || isMovingToCircle || isMovingToDropdown || isMovingToNavContainer;
        
        console.log('🖱️ Container onMouseLeave', {
          x: mouseX,
          y: mouseY,
          relatedTarget: relatedTarget?.tagName,
          relatedTargetClass: relatedTarget?.className,
          isMovingToContainer,
          isMovingToTextContainer,
          isMovingToCircle,
          isMovingToDropdown: !!isMovingToDropdown,
          isMovingToNavContainer: !!isMovingToNavContainer,
          isMovingWithinNav,
          containerBounds: containerRef.current ? {
            top: containerRef.current.getBoundingClientRect().top,
            left: containerRef.current.getBoundingClientRect().left,
            right: containerRef.current.getBoundingClientRect().right,
            bottom: containerRef.current.getBoundingClientRect().bottom,
          } : null,
        });
        
        if (!isMovingWithinNav) {
          console.log('🖱️ Container: Setting hover to false');
          setIsHovered(false);
          setIsDropdownHovered(false);
          const whySolarText = document.querySelector('#why-solar-text');
          const whyUsText = document.querySelector('#why-us-text');
          const clientsText = document.querySelector('#clients-text');
          const isTextHovered = 
            (whySolarText && whySolarText.matches(':hover')) ||
            (whyUsText && whyUsText.matches(':hover')) ||
            (clientsText && clientsText.matches(':hover'));
          if (!isTextHovered) {
            document.body.classList.remove('nav-or-text-hovered');
          }
        } else {
          console.log('🖱️ Container: Keeping hover true (moving within nav)');
        }
      }}
    >
      {/* SVG path for pill shape - visible for debugging */}
      <svg 
        width="200" 
        height="60" 
        className="absolute top-0 left-0"
        style={{ 
          pointerEvents: 'none',
          overflow: 'visible'
        }}
        viewBox="0 0 200 60"
      >
        {/* Pill path outline - visible if debug markers are enabled, hidden otherwise */}
        <path
          ref={pathRef}
          fill="none"
          stroke={debugMarkers ? "rgba(255, 255, 255, 0.3)" : "transparent"}
          strokeWidth="1"
          strokeDasharray={debugMarkers ? "2,2" : "none"}
        />
        
        {/* Debug markers at each stopping position */}
        {debugMarkers && debugPositions.map((point, index) => (
          <g key={index}>
            {/* Circle marker */}
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill={index === currentSectionIndex ? "#00ff00" : "rgba(255, 255, 255, 0.6)"}
              stroke={index === currentSectionIndex ? "#00ff00" : "rgba(255, 255, 255, 0.8)"}
              strokeWidth="1"
            />
            {/* Label */}
            <text
              x={point.x}
              y={point.y - 8}
              fill="rgba(255, 255, 255, 0.8)"
              fontSize="8"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {index}
            </text>
            {/* Section name */}
            <text
              x={point.x}
              y={point.y + 20}
              fill="rgba(255, 255, 255, 0.6)"
              fontSize="7"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {point.label.split(':')[1]?.trim().split(' ')[0] || ''}
            </text>
          </g>
        ))}
      </svg>
      
      {/* Circle that moves along path */}
      <div
        ref={circleRef}
        className={`${circleColor} w-4 h-4 rounded-full absolute cursor-pointer`}
        style={{
          transformOrigin: 'center center',
          willChange: 'transform',
          // Let MotionPath handle all positioning - no fixed top/left
          // The initial position will be set by MotionPath in the useEffect
        }}
        onMouseEnter={(e) => {
          const currentLabel = getCurrentSectionLabel();
          console.log('🖱️ Circle onMouseEnter', {
            x: e.clientX,
            y: e.clientY,
            hasLabel: !!currentLabel,
            currentLabel,
            currentSectionIndex,
            isDropdownHovered,
            textContainerPosition: textContainerRef.current ? {
              x: gsap.getProperty(textContainerRef.current, 'x'),
              y: gsap.getProperty(textContainerRef.current, 'y'),
            } : 'not positioned',
          });
          // Show dropdown when hovering circle, especially for sections without labels
          setIsDropdownHovered(true);
          console.log('🖱️ Circle: Set isDropdownHovered to true');
          // Only change background color if we're on a section with a label and target sections are in view
          if (currentLabel && areTargetSectionsInView) {
            setIsHovered(true);
            document.body.classList.add('nav-or-text-hovered');
            console.log('🖱️ Circle: Also set isHovered to true (has label)');
          } else {
            console.log('🖱️ Circle: Not setting isHovered (no label or target sections not in view)');
          }
        }}
        onMouseLeave={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement | null;
          const isValidNode = relatedTarget && relatedTarget instanceof Node;
          const isMovingToTextContainer = isValidNode && textContainerRef.current && textContainerRef.current.contains(relatedTarget);
          const isMovingToDropdown = relatedTarget && relatedTarget instanceof Element && relatedTarget.closest('.dropdown-items');
          const isMovingToContainer = isValidNode && containerRef.current && containerRef.current.contains(relatedTarget);
          
          // Also check if we're moving to any child of the text container (which includes dropdown)
          const isMovingToTextContainerChild = relatedTarget && textContainerRef.current && (
            textContainerRef.current.contains(relatedTarget) ||
            relatedTarget.closest('.dropdown-items') ||
            relatedTarget.parentElement === textContainerRef.current
          );
          
          console.log('🖱️ Circle onMouseLeave', {
            x: e.clientX,
            y: e.clientY,
            relatedTarget: relatedTarget?.tagName,
            relatedTargetClass: relatedTarget?.className,
            isMovingToTextContainer,
            isMovingToDropdown: !!isMovingToDropdown,
            isMovingToContainer,
            isMovingToTextContainerChild: !!isMovingToTextContainerChild,
          });
          
          // Only clear hover if we're truly leaving the nav area
          // Keep hover active if moving to dropdown or text container
          if (!isMovingToTextContainer && !isMovingToDropdown && !isMovingToContainer && !isMovingToTextContainerChild) {
            console.log('🖱️ Circle: Will clear hover state (with delay)');
            // Clear any existing timeout
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
            // Use a small delay to allow dropdown's onMouseEnter to fire first
            hoverTimeoutRef.current = setTimeout(() => {
              // Check current state - if dropdown is hovered, don't clear
              setIsDropdownHovered((current) => {
                if (!current) {
                  console.log('🖱️ Circle: Actually clearing hover state');
                  setIsHovered(false);
                  if (!getCurrentSectionLabel() || !areTargetSectionsInView) {
                    document.body.classList.remove('nav-or-text-hovered');
                  }
                  return false;
                } else {
                  console.log('🖱️ Circle: Keeping hover state (dropdown is hovered)');
                  return true;
                }
              });
              hoverTimeoutRef.current = null;
            }, 100);
          } else {
            console.log('🖱️ Circle: Keeping hover state (moving within nav)');
            // Cancel any pending clear
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            // Explicitly maintain isDropdownHovered when moving to dropdown
            if (isMovingToDropdown || isMovingToTextContainerChild) {
              setIsDropdownHovered(true);
            }
          }
        }}
      />
      
      {/* Text container - positioned relative to circle, contains text and dropdown */}
      {/* For sections without labels, this container is still positioned and visible to allow hover */}
      <div
        ref={textContainerRef}
        className="absolute flex flex-col items-start"
        style={{
          // Position will be set dynamically by GSAP based on circle position
          pointerEvents: 'auto',
          visibility: 'visible', // Always visible to receive mouse events
          // Add padding to create a hover area even when there's no label
          // This creates a "bridge" between circle and dropdown for easier hover
          padding: getCurrentSectionLabel() ? '0' : '12px',
          minWidth: getCurrentSectionLabel() ? 'auto' : '120px', // Ensure hover area for non-labeled sections
          minHeight: getCurrentSectionLabel() ? 'auto' : '40px',
          // Negative margin to extend hover area closer to circle
          marginLeft: getCurrentSectionLabel() ? '0' : '-20px',
        }}
        onMouseEnter={(e) => {
          console.log('🖱️ TextContainer onMouseEnter', {
            x: e.clientX,
            y: e.clientY,
            target: (e.target as HTMLElement)?.tagName,
          });
          setIsHovered(true);
          setIsDropdownHovered(true);
        }}
        onMouseLeave={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement | null;
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          
          // Check if we're moving to another part of the nav (circle or container)
          // Ensure relatedTarget is a Node before calling contains()
          const isValidNode = relatedTarget && relatedTarget instanceof Node;
          const isMovingToContainer = isValidNode && containerRef.current && containerRef.current.contains(relatedTarget);
          const isMovingToCircle = isValidNode && circleRef.current && circleRef.current.contains(relatedTarget);
          const isMovingToNavContainer = relatedTarget && relatedTarget instanceof Element && relatedTarget.closest('.orbit-nav-container');
          const isMovingToDropdown = relatedTarget && relatedTarget instanceof Element && relatedTarget.closest('.dropdown-items');
          
          const isMovingWithinNav = isMovingToContainer || isMovingToCircle || isMovingToNavContainer || isMovingToDropdown;
          
          console.log('🖱️ TextContainer onMouseLeave', {
            x: mouseX,
            y: mouseY,
            relatedTarget: relatedTarget?.tagName,
            relatedTargetClass: relatedTarget?.className,
            isMovingToContainer,
            isMovingToCircle,
            isMovingToNavContainer: !!isMovingToNavContainer,
            isMovingToDropdown: !!isMovingToDropdown,
            isMovingWithinNav,
          });
          
          if (!isMovingWithinNav) {
            console.log('🖱️ TextContainer: Setting hover to false');
            setIsHovered(false);
            setIsDropdownHovered(false);
          } else {
            console.log('🖱️ TextContainer: Keeping hover true (moving within nav)');
          }
        }}
      >
        {/* Current section text - clickable */}
        {getCurrentSectionLabel() ? (
          <a
            ref={textRef as React.RefObject<HTMLAnchorElement>}
            href={getCurrentSectionHref()}
            className={`${textColor} text-sm font-light lowercase tracking-wide whitespace-nowrap block transition-opacity duration-200 hover:opacity-60 cursor-pointer`}
            style={{
              pointerEvents: 'auto',
            }}
          />
        ) : (
          <div
            ref={textRef as React.RefObject<HTMLDivElement>}
            className={`${textColor} text-sm font-light lowercase tracking-wide whitespace-nowrap block`}
            style={{
              pointerEvents: 'auto',
            }}
          />
        )}
        
        {/* Dropdown items - stacked vertically below current text */}
        {/* Show dropdown if current section has a label OR if circle is hovered (for sections without labels) */}
        {(getCurrentSectionLabel() || isDropdownHovered) && (
          <div
            className={`dropdown-items flex flex-col transition-all duration-300 ease-in-out ${
              isHovered || isDropdownHovered
                ? 'opacity-100 visible translate-y-0'
                : 'opacity-0 invisible -translate-y-2'
            }`}
            style={{
              pointerEvents: isHovered || isDropdownHovered ? 'auto' : 'none',
              marginTop: '0.5rem',
              gap: '0.25rem',
            }}
            onMouseEnter={(e) => {
              console.log('🖱️ Dropdown container onMouseEnter', {
                x: e.clientX,
                y: e.clientY,
                isHovered,
                isDropdownHovered,
                hasLabel: !!getCurrentSectionLabel(),
              });
              // Cancel any pending hover clear from circle's onMouseLeave
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
                console.log('🖱️ Dropdown: Cancelled pending hover clear');
              }
              // Keep hover state active when entering dropdown
              // This is critical for sections without labels - must set immediately
              setIsDropdownHovered(true);
              console.log('🖱️ Dropdown: Set isDropdownHovered to true');
              if (getCurrentSectionLabel() && areTargetSectionsInView) {
                setIsHovered(true);
              }
            }}
            onMouseLeave={(e) => {
              const relatedTarget = e.relatedTarget as HTMLElement | null;
              const isValidNode = relatedTarget && relatedTarget instanceof Node;
              const isMovingToCircle = isValidNode && circleRef.current && circleRef.current.contains(relatedTarget);
              const isMovingToTextContainer = isValidNode && textContainerRef.current && textContainerRef.current.contains(relatedTarget);
              const isMovingToContainer = isValidNode && containerRef.current && containerRef.current.contains(relatedTarget);
              
              console.log('🖱️ Dropdown container onMouseLeave', {
                isMovingToCircle,
                isMovingToTextContainer,
                isMovingToContainer,
              });
              
              // Only hide dropdown if not moving to circle, text container, or main container
              if (!isMovingToCircle && !isMovingToTextContainer && !isMovingToContainer) {
                setIsHovered(false);
                setIsDropdownHovered(false);
              }
            }}
          >
            {dropdownItems
              .filter((item) => {
                const currentLabel = getCurrentSectionLabel();
                // Don't show the current section in the dropdown (only if it has a label)
                // For sections without labels, show all items
                if (currentLabel === '') {
                  return true; // Show all items for sections without labels
                }
                return item.label !== currentLabel;
              })
              .map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`${textColor} text-sm font-light lowercase tracking-wide transition-opacity duration-200 hover:opacity-60 whitespace-nowrap block`}
                  onMouseEnter={(e) => {
                    console.log('🖱️ DropdownItem onMouseEnter', {
                      x: e.clientX,
                      y: e.clientY,
                      label: item.label,
                    });
                    setIsHovered(true);
                    setIsDropdownHovered(true);
                  }}
                  onMouseLeave={(e) => {
                    const relatedTarget = e.relatedTarget as HTMLElement | null;
                    const mouseX = e.clientX;
                    const mouseY = e.clientY;
                    
                    // Check if we're moving to another part of the nav
                    // Ensure relatedTarget is a Node before calling contains()
                    const isValidNode = relatedTarget && relatedTarget instanceof Node;
                    const isMovingToContainer = isValidNode && containerRef.current && containerRef.current.contains(relatedTarget);
                    const isMovingToTextContainer = isValidNode && textContainerRef.current && textContainerRef.current.contains(relatedTarget);
                    const isMovingToCircle = isValidNode && circleRef.current && circleRef.current.contains(relatedTarget);
                    const isMovingToNavContainer = relatedTarget && relatedTarget instanceof Element && relatedTarget.closest('.orbit-nav-container');
                    const isMovingToAnotherItem = relatedTarget && relatedTarget instanceof Element && relatedTarget.closest('.dropdown-items');
                    
                    const isMovingWithinNav = isMovingToContainer || isMovingToTextContainer || isMovingToCircle || isMovingToNavContainer || isMovingToAnotherItem;
                    
                    console.log('🖱️ DropdownItem onMouseLeave', {
                      x: mouseX,
                      y: mouseY,
                      label: item.label,
                      relatedTarget: relatedTarget?.tagName,
                      relatedTargetClass: relatedTarget?.className,
                      isMovingToContainer,
                      isMovingToTextContainer,
                      isMovingToCircle,
                      isMovingToNavContainer: !!isMovingToNavContainer,
                      isMovingToAnotherItem: !!isMovingToAnotherItem,
                      isMovingWithinNav,
                    });
                    
                    if (!isMovingWithinNav) {
                      console.log('🖱️ DropdownItem: Setting hover to false');
                      setIsHovered(false);
                      setIsDropdownHovered(false);
                    } else {
                      console.log('🖱️ DropdownItem: Keeping hover true (moving within nav)');
                    }
                  }}
                >
                  {item.label}
                </a>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
