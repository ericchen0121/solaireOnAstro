import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ORBIT_NAV_LAYOUT } from '../../orbit-nav-config';

/**
 * OrbitNavDot - Circle with animating rectangle inside (design spec).
 * Proportions: bar height ~inner radius, width ~18% of diameter; square ends (no rx/ry).
 * Inner boundary (racetrack): line travels to offset concentric boundary (~90% of radius).
 * lineAxis 'y' = home: line on center x-axis, animates up/down. 'x' = subpage: line on center y-axis, animates left/right.
 */

const INNER_BOUNDARY_RATIO = 0.9;
const RECT_WIDTH_RATIO = 0.14;
/** Inner racetrack ring — thinner than original (0.3 @ 32px). */
const INNER_STROKE_SCALE = 0.4 / 32;
const TRANSITION_DURATION = 0.35;
/** Home ↔ subpage switches `lineAxis`; keep this short to avoid a visible “morph flash” on client navigations. */
const AXIS_CHANGE_DURATION = 0.06;

interface OrbitNavDotProps {
  size?: number;
  className?: string;
  circleFill?: string;
  rectFill?: string;
  running?: boolean;
  /** 'y' = home: vertical line, up/down animation. 'x' = subpage: horizontal line, left/right animation. */
  lineAxis?: 'y' | 'x';
}

export default function OrbitNavDot({
  size = ORBIT_NAV_LAYOUT.DOT_SIZE_DESKTOP,
  className = '',
  circleFill = 'white',
  rectFill = 'black',
  running = true,
  lineAxis = 'y',
}: OrbitNavDotProps) {
  const rectRef = useRef<SVGRectElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const transitionRef = useRef<gsap.core.Tween | null>(null);
  const previousAxisRef = useRef<'y' | 'x'>(lineAxis);

  const center = size / 2;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * INNER_BOUNDARY_RATIO;
  const rectFullHeight = innerRadius;
  const rectFullWidth = size * RECT_WIDTH_RATIO;
  const topBoundary = center - innerRadius;
  const bottomBoundary = center + innerRadius;
  const leftBoundary = center - innerRadius;
  const rightBoundary = center + innerRadius;
  const innerStrokeWidth = Math.max(0.2, size * INNER_STROKE_SCALE);
  const compressAmount = (innerRadius * 2) * (1 / 4);

  const durationMultiplier = 1.5;
  const durationCompress = 1 * durationMultiplier;
  const durationReturn = 0.8 * durationMultiplier;

  // Center-state rect attributes per axis (for transition target and initial state)
  const centerStateY = {
    x: center - rectFullWidth / 2,
    y: center - rectFullHeight / 2,
    width: rectFullWidth,
    height: rectFullHeight,
  };
  const centerStateX = {
    x: center - rectFullHeight / 2,
    y: center - rectFullWidth / 2,
    width: rectFullHeight,
    height: rectFullWidth,
  };

  useEffect(() => {
    const rect = rectRef.current;
    if (!rect || !running) return;

    const runTransitionTo = (
      target: typeof centerStateY,
      onComplete: () => void,
      duration: number = TRANSITION_DURATION,
    ) => {
      if (transitionRef.current) transitionRef.current.kill();
      transitionRef.current = gsap.to(rect, {
        attr: target,
        duration,
        ease: 'power2.inOut',
        onComplete: () => {
          transitionRef.current = null;
          onComplete();
        },
      });
    };

    const startYAxisTimeline = () => {
      if (timelineRef.current) timelineRef.current.kill();
      const rectX = center - rectFullWidth / 2;
      const y0 = center - rectFullHeight / 2;
      const tl = gsap.timeline({ repeat: -1 });
      tl.to(rect, {
        attr: { y: topBoundary, height: compressAmount, x: rectX, width: rectFullWidth },
        duration: durationCompress,
      });
      tl.to(rect, {
        attr: { y: y0, height: rectFullHeight, x: rectX, width: rectFullWidth },
        duration: durationReturn,
      });
      tl.to(rect, {
        attr: { y: bottomBoundary - compressAmount, height: compressAmount, x: rectX, width: rectFullWidth },
        duration: durationCompress,
      });
      tl.to(rect, {
        attr: { y: y0, height: rectFullHeight, x: rectX, width: rectFullWidth },
        duration: durationReturn,
      });
      timelineRef.current = tl;
    };

    const startXAxisTimeline = () => {
      if (timelineRef.current) timelineRef.current.kill();
      const yRect = center - rectFullWidth / 2;
      const x0 = center - rectFullHeight / 2;
      const tl = gsap.timeline({ repeat: -1 });
      tl.to(rect, {
        attr: { x: leftBoundary, width: compressAmount, y: yRect, height: rectFullWidth },
        duration: durationCompress,
      });
      tl.to(rect, {
        attr: { x: x0, width: rectFullHeight, y: yRect, height: rectFullWidth },
        duration: durationReturn,
      });
      tl.to(rect, {
        attr: { x: rightBoundary - compressAmount, width: compressAmount, y: yRect, height: rectFullWidth },
        duration: durationCompress,
      });
      tl.to(rect, {
        attr: { x: x0, width: rectFullHeight, y: yRect, height: rectFullWidth },
        duration: durationReturn,
      });
      timelineRef.current = tl;
    };

    const axisChanged = previousAxisRef.current !== lineAxis;
    previousAxisRef.current = lineAxis;

    if (axisChanged) {
      const targetCenter = lineAxis === 'y' ? centerStateY : centerStateX;
      runTransitionTo(
        targetCenter,
        () => {
          if (lineAxis === 'y') startYAxisTimeline();
          else startXAxisTimeline();
        },
        AXIS_CHANGE_DURATION,
      );
    } else {
      gsap.set(rect, { attr: lineAxis === 'y' ? centerStateY : centerStateX });
      if (lineAxis === 'y') startYAxisTimeline();
      else startXAxisTimeline();
    }

    return () => {
      transitionRef.current?.kill();
      timelineRef.current?.kill();
      timelineRef.current = null;
      transitionRef.current = null;
    };
  }, [
    running,
    lineAxis,
    size,
    center,
    rectFullWidth,
    rectFullHeight,
    topBoundary,
    bottomBoundary,
    leftBoundary,
    rightBoundary,
    innerRadius,
    compressAmount,
    durationCompress,
    durationReturn,
  ]);

  const initialRect = lineAxis === 'y' ? centerStateY : centerStateX;

  const svgPaintTransition =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? undefined
      : 'fill 0.22s ease-out, stroke 0.22s ease-out';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill={circleFill}
        style={{
          shapeRendering: 'geometricPrecision',
          transition: svgPaintTransition,
        }}
      />
      <circle
        cx={center}
        cy={center}
        r={innerRadius}
        fill="none"
        stroke={circleFill}
        strokeWidth={innerStrokeWidth}
        strokeDasharray="1.5 1.5"
        opacity={0.12}
        style={{
          pointerEvents: 'none',
          transition: svgPaintTransition,
        }}
      />
      <rect
        ref={rectRef}
        x={initialRect.x}
        y={initialRect.y}
        width={initialRect.width}
        height={initialRect.height}
        rx={0}
        ry={0}
        fill={rectFill}
        style={{
          shapeRendering: 'geometricPrecision',
          transition: svgPaintTransition,
        }}
      />
    </svg>
  );
}
