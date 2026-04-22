/**
 * Left-pointing back arrow for orbit nav. Uses `currentColor` for stroke
 * (set `text-white` / `text-black` on a parent for contrast).
 */
export default function OrbitNavBackArrow({
  className = '',
  'aria-hidden': ariaHidden = true,
}: {
  className?: string;
  'aria-hidden'?: boolean;
}) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaHidden}
    >
      <path
        d="M15 6L9 12L15 18"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="square"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
