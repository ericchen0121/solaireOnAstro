import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface TumblerTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export default function TumblerText({
  text,
  className = '',
  delay = 0,
  duration = 0.8,
}: TumblerTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const chars = text.split('');
    const charElements: HTMLSpanElement[] = [];

    // Create character elements
    chars.forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'rotateX(90deg)';
      span.style.transformOrigin = 'center';
      span.style.transformStyle = 'preserve-3d';
      containerRef.current?.appendChild(span);
      charElements.push(span);
    });

    // Animate characters in with tumbler effect
    const tl = gsap.timeline({ delay });

    charElements.forEach((char, index) => {
      tl.to(
        char,
        {
          opacity: 1,
          rotationX: 0,
          duration: duration / chars.length,
          ease: 'back.out(1.7)',
        },
        index * 0.03
      );
    });

    setIsVisible(true);

    return () => {
      charElements.forEach((el) => el.remove());
    };
  }, [text, delay, duration]);

  return (
    <div
      ref={containerRef}
      className={`tumbler-text ${className}`}
      style={{ perspective: '1000px' }}
    />
  );
}


