/**
 * Left-pointing back arrow for orbit nav. Uses `currentColor` for stroke
 * (set `text-white` / `text-black` on a parent for contrast).
 *
 * `segmentLength` = each chevron leg length, matched to the inner pill’s
 * long edge (OrbitNavDot bar length in the centered state).
 */
export default function OrbitNavBackArrow({
  className = '',
  segmentLength,
  'aria-hidden': ariaHidden = true,
}: {
  className?: string;
  /** Px length of each of the two segments (tip = 90°). */
  segmentLength: number;
  'aria-hidden'?: boolean;
}) {
  const L = segmentLength;
  /** Same 90° chevron as the old 24px asset; each leg = L in current units. */
  const a = L / Math.SQRT2; // L / √2, endpoint offset from the tip
  // Legacy path used legs of length 6√2 in a 24-wide view; scale stroke to match.
  const strokeW = Math.max(0.35, (L * 2.25) / (6 * Math.SQRT2));
  const pad = strokeW / 2 + 0.5;
  const vbW = L / Math.SQRT2 + 2 * pad;
  const vbH = L * Math.SQRT2 + 2 * pad;
  const d = `M ${a} ${-a} L 0 0 L ${a} ${a}`;

  return (
    <svg
      className={className}
      width={vbW}
      height={vbH}
      viewBox={`${-pad} ${-a - pad} ${vbW} ${vbH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaHidden}
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={strokeW}
        strokeLinecap="square"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
