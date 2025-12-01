import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface OdometerProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function Odometer({
  value,
  duration = 2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: OdometerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!containerRef.current || hasAnimated.current) return;

    // Register ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Create scroll trigger to animate when in view
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top 80%',
      onEnter: () => {
        if (hasAnimated.current) return;
        hasAnimated.current = true;

        // Animate the number
        gsap.to(
          {},
          {
            duration,
            ease: 'power2.out',
            onUpdate: function () {
              const progress = this.progress();
              const currentValue = value * progress;
              setDisplayValue(currentValue);
            },
            onComplete: () => {
              setDisplayValue(value);
            },
          }
        );
      },
    });

    return () => {
      trigger.kill();
    };
  }, [value, duration]);

  const formatNumber = (num: number): string => {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div ref={containerRef} className={`odometer ${className}`}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </div>
  );
}

