import { useEffect, useRef, useMemo } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface OdometerProps {
  value: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function Odometer({
  value,
  duration = 1.4,
  delay = 0,
  prefix = "",
  suffix = "",
  className = "",
}: OdometerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const animationRefs = useRef<gsap.core.Tween[]>([]);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  gsap.registerPlugin(ScrollTrigger);

  /**
   * Convert number → array of each digit (no commas)
   * Example: 12345 → ["1","2","3","4","5"]
   */
  const formattedChars = useMemo(() => {
    return value.toString().split("");
  }, [value]);

  /**
   * Build the rolling digit stack for ONE column.
   * If the final digit is 7 and this digit needs 25 increments:
   *  - cycles = Math.floor(25 / 10) = 2
   *  - remainder = 5
   * Stack: [0..9] x 2 cycles + [0..5]
   */
  const buildDigitStack = (increments: number, finalDigit: number) => {
    const cycles = Math.floor(increments / 10);
    const remainder = increments % 10;

    const stack: number[] = [];

    // full cycles
    for (let c = 0; c < cycles; c++) {
      for (let i = 0; i < 10; i++) stack.push(i);
    }

    // partial cycle up to final digit
    for (let i = 0; i <= finalDigit; i++) stack.push(i);

    return stack;
  };

  /**
   * Compute increments for each digit place:
   * ones increments `value` times
   * tens increments `Math.floor(value / 10)` times
   * hundreds increments `Math.floor(value / 100)` times
   */
  const digitsOnly = formattedChars.filter((c) => /\d/.test(c));

  const digitColumns = useMemo(() => {
    const cols = [];

    for (let i = 0; i < digitsOnly.length; i++) {
      const finalDigit = parseInt(digitsOnly[digitsOnly.length - 1 - i]);
      const increments = Math.floor(value / Math.pow(10, i));

      cols.push({ finalDigit, increments });
    }

    return cols.reverse(); // back to visual left→right
  }, [value]);

  useEffect(() => {
    if (!rootRef.current) return;

    // Kill any existing animations and trigger
    animationRefs.current.forEach((anim) => anim.kill());
    animationRefs.current = [];
    if (triggerRef.current) {
      triggerRef.current.kill();
    }

    const trigger = ScrollTrigger.create({
      trigger: rootRef.current,
      start: "top bottom", // Start when top of element enters bottom of viewport (for onLeaveBack to fire when completely above)
      end: "bottom top", // End when bottom of element passes top of viewport (completely out of view when scrolling down)
      onEnter: () => {
        const nodes = rootRef.current!.querySelectorAll("[data-odo-col]");
        nodes.forEach((col: any) => {
          const steps = col.children.length - 1;
          const dist = steps * col.children[0].clientHeight;

          // Kill any existing animation on this column
          gsap.killTweensOf(col);

          // Create new animation
          const anim = gsap.to(col, {
            y: -dist,
            duration,
            delay,
            ease: "power2.out",
          });
          animationRefs.current.push(anim);
        });
      },
      onLeave: () => {
        // Reset all columns to 0 when completely out of viewport (scrolling down)
        const nodes = rootRef.current!.querySelectorAll("[data-odo-col]");
        nodes.forEach((col: any) => {
          gsap.killTweensOf(col);
          gsap.set(col, { y: 0 });
        });
        animationRefs.current = [];
      },
      onLeaveBack: () => {
        // Reset all columns to 0 when completely out of viewport (scrolling up)
        // This fires when scrolling up past the start point, which is when element is above viewport
        const nodes = rootRef.current!.querySelectorAll("[data-odo-col]");
        nodes.forEach((col: any) => {
          gsap.killTweensOf(col);
          gsap.set(col, { y: 0 });
        });
        animationRefs.current = [];
      },
    });

    triggerRef.current = trigger;

    return () => {
      animationRefs.current.forEach((anim) => anim.kill());
      animationRefs.current = [];
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
    };
  }, [duration, delay, value]);

  return (
    <div ref={rootRef} className={`flex items-center gap-0 ${className}`}>
      {prefix && <span>{prefix}</span>}

      {formattedChars.map((char, idx) => {
        if (!/\d/.test(char)) {
          return (
            <span key={idx} className="mx-0.5">
              {char}
            </span>
          );
        }

        // figure out which digit this maps to in digitsOnly
        const digitIdx =
          formattedChars.slice(0, idx + 1).filter((c) => /\d/.test(c))
            .length - 1;

        const { finalDigit, increments } = digitColumns[digitIdx];
        const stack = buildDigitStack(increments, finalDigit);

        return (
          <div
            key={idx}
            className="overflow-hidden inline-block"
            style={{ 
              height: "1em", 
              lineHeight: "1em", 
              margin: 0, 
              padding: 0,
              width: "1ch" // One character width for consistent spacing with tabular-nums
            }}
          >
            <div data-odo-col className="relative">
              {stack.map((d, i) => (
                <div
                  key={i}
                  style={{ height: "1em", lineHeight: "1em", width: "1ch" }}
                  className="text-current"
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {suffix && <span>{suffix}</span>}
    </div>
  );
}
