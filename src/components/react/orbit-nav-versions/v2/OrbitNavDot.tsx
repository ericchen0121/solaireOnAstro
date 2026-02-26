import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * OrbitNavDot - Circle with animating rectangle inside (design spec).
 * Proportions: rectangle height ~70% of circle diameter, width ~18%.
 * Inner boundary (racetrack): line travels to offset concentric boundary (~85% of radius).
 * Bounce: line travels up to top boundary, compresses in thirds with accel at peak, returns; same down.
 */

const DOT_SIZE = 24; // px diameter, developer discretion for crisp rendering
const INNER_BOUNDARY_RATIO = 0.9; // line stays inside this (offset concentric) - more spacing from edge
const RECT_WIDTH_RATIO = 0.2; // rectangle width vs circle diameter

const center = DOT_SIZE / 2;
const outerRadius = DOT_SIZE / 2; // 12px
const innerRadius = outerRadius * INNER_BOUNDARY_RATIO; // 8.64px
const rectFullHeight = innerRadius
const rectFullWidth = DOT_SIZE * RECT_WIDTH_RATIO;
const topBoundary = center - innerRadius;   // y of top boundary
const bottomBoundary = center + innerRadius; // y of bottom boundary

interface OrbitNavDotProps {
  className?: string;
  circleFill?: string;
  rectFill?: string;
  running?: boolean;
}

export default function OrbitNavDot({
  className = '',
  circleFill = 'white',
  rectFill = 'black',
  running = true,
}: OrbitNavDotProps) {
  const rectRef = useRef<SVGRectElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const rect = rectRef.current;
    if (!rect || !running) return;

    const rectX = center - rectFullWidth / 2;
    const y0 = center - rectFullHeight / 2;

    const durationTravel = .6;   // time to travel to boundary (2x slower)
    const durationMultiplier = 1.5;
    const durationCompress = 1 * durationMultiplier;  // compression in thirds + accel (2x slower)
    const durationReturn = .8 * durationMultiplier;    // return to center (2x slower)
    const easeTravel = 'power2.inOut';
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
  }, [running]);

  return (
    <svg
      width={DOT_SIZE}
      height={DOT_SIZE}
      viewBox={`0 0 ${DOT_SIZE} ${DOT_SIZE}`}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Outer circle (dot) */}
      <circle
        cx={center}
        cy={center}
        r={DOT_SIZE / 2}
        fill={circleFill}
        style={{ shapeRendering: 'geometricPrecision' }}
      />
      {/* Inner boundary (racetrack) - line travels to this offset, not to outer edge */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius}
        fill="none"
        stroke={circleFill}
        strokeWidth={0.3}
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
