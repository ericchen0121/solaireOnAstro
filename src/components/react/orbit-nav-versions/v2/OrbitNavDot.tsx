import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ORBIT_NAV_LAYOUT } from '../../orbit-nav-config';

/**
 * OrbitNavDot - Circle with animating rectangle inside (design spec).
 * Proportions: rectangle height ~inner radius, width ~18% of diameter.
 * Inner boundary (racetrack): line travels to offset concentric boundary (~90% of radius).
 * Scales with size prop (32 desktop, 24 tablet, 20 mobile); inner line thickness scales proportionally.
 */

const INNER_BOUNDARY_RATIO = 0.9;
const RECT_WIDTH_RATIO = 0.18;
const INNER_STROKE_SCALE = 0.3 / 32; // stroke 0.3 at 32px → proportional

interface OrbitNavDotProps {
  size?: number;
  className?: string;
  circleFill?: string;
  rectFill?: string;
  running?: boolean;
}

export default function OrbitNavDot({
  size = ORBIT_NAV_LAYOUT.DOT_SIZE_DESKTOP,
  className = '',
  circleFill = 'white',
  rectFill = 'black',
  running = true,
}: OrbitNavDotProps) {
  const rectRef = useRef<SVGRectElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const center = size / 2;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * INNER_BOUNDARY_RATIO;
  const rectFullHeight = innerRadius;
  const rectFullWidth = size * RECT_WIDTH_RATIO;
  const topBoundary = center - innerRadius;
  const bottomBoundary = center + innerRadius;
  const innerStrokeWidth = Math.max(0.2, size * INNER_STROKE_SCALE);

  useEffect(() => {
    const rect = rectRef.current;
    if (!rect || !running) return;

    const rectX = center - rectFullWidth / 2;
    const y0 = center - rectFullHeight / 2;

    const durationMultiplier = 1.5;
    const durationCompress = 1 * durationMultiplier;
    const durationReturn = .8 * durationMultiplier;
    const compressAmount = (innerRadius * 2) * (1 / 4);
    const tl = gsap.timeline({ repeat: -1 });

    // ---- BOUNCE UP (simplified) ----
    // // 1. Travel up to top boundary
    // tl.to(rect, {
    //   attr: {
    //     y: topBoundary,
    //     height: rectFullHeight,
    //     x: rectX,
    //     width: rectFullWidth,
    //   },
    //   duration: durationTravel,
    //   // ease: easeTravel,
    // });
    // 2. Compress smoothly to compressAmount (top edge stays at boundary)
    tl.to(rect, {
      attr: {
        y: topBoundary,
        height: compressAmount,
        x: rectX,
        width: rectFullWidth,
      },
      duration: durationCompress,
      // ease: 'power3.in', // accelerate into compression
    });
    // 3. Decompress smoothly back to full height at center
    tl.to(rect, {
      attr: { y: y0, height: rectFullHeight, x: rectX, width: rectFullWidth },
      duration: durationReturn,
      // ease: 'power3.out', // decelerate out of compression
    });

    // ---- BOUNCE DOWN (simplified, symmetrical) ----
    // 1. Travel down to bottom boundary
    // tl.to(rect, {
    //   attr: {
    //     y: bottomBoundary - rectFullHeight,
    //     height: rectFullHeight,
    //     x: rectX,
    //     width: rectFullWidth,
    //   },
    //   duration: durationTravel,
    //   // ease: easeTravel,
    // });
    // 2. Compress smoothly to compressAmount (bottom edge stays at boundary)
    tl.to(rect, {
      attr: {
        y: bottomBoundary - compressAmount,
        height: compressAmount,
        x: rectX,
        width: rectFullWidth,
      },
      duration: durationCompress,
      // ease: 'power3.in', // accelerate into compression
    });
    // 3. Decompress smoothly back to full height at center
    tl.to(rect, {
      attr: { y: y0, height: rectFullHeight, x: rectX, width: rectFullWidth },
      duration: durationReturn,
      // ease: 'power3.out', // decelerate out of compression
    });

    timelineRef.current = tl;
    return () => {
      tl.kill();
      timelineRef.current = null;
    };
  }, [running, size, center, rectFullWidth, rectFullHeight, topBoundary, bottomBoundary, innerRadius]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Outer circle (dot) */}
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill={circleFill}
        style={{ shapeRendering: 'geometricPrecision' }}
      />
      {/* Inner boundary (racetrack) - line travels to this offset; stroke scales with size */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius}
        fill="none"
        stroke={circleFill}
        strokeWidth={innerStrokeWidth}
        strokeDasharray="1.5 1.5"
        opacity={0.12}
        style={{ pointerEvents: 'none' }}
      />
      {/* Animating rectangle (line) - pill-shaped edges, height-only compression */}
      <rect
        ref={rectRef}
        x={center - rectFullWidth / 2}
        y={center - rectFullHeight / 2}
        width={rectFullWidth}
        height={rectFullHeight}
        rx={rectFullWidth / 2}
        ry={rectFullWidth / 2}
        fill={rectFill}
        style={{ shapeRendering: 'geometricPrecision' }}
      />
    </svg>
  );
}
