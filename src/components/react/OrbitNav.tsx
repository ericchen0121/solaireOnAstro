import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { routeLabels } from '../../utils/navigation';

interface OrbitNavProps {
  isDark?: boolean;
  colorMode?: 'auto' | 'light' | 'dark'; // 'auto' detects background, 'light' = white on black, 'dark' = black on white
}

export default function OrbitNav({ isDark = false, colorMode = 'auto' }: OrbitNavProps) {
  const circleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentLabel, setCurrentLabel] = useState('accueil');
  const [isInverted, setIsInverted] = useState(false);
  const animationRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Get current route
    const getCurrentRoute = () => {
      const path = window.location.pathname;
      // Match exact route or find closest match
      if (routeLabels[path]) {
        return routeLabels[path];
      }
      // Fallback: try to match partial paths
      for (const [route, label] of Object.entries(routeLabels)) {
        if (path.startsWith(route) || route.startsWith(path)) {
          return label;
        }
      }
      return 'accueil';
    };

    setCurrentLabel(getCurrentRoute());

    // Listen for route changes (for client-side navigation if implemented)
    const handlePopState = () => {
      setCurrentLabel(getCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    // Detect page background color by checking the first section
    const checkBackground = () => {
      if (colorMode !== 'auto') {
        setIsInverted(colorMode === 'dark');
        return;
      }

      const firstSection = document.querySelector('section');
      if (!firstSection) {
        // Fallback to body
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
      
      // Check if background is light (white/light colors)
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
        setIsInverted(brightness > 128);
      } else {
        // Check for black background class
        const isBlack = firstSection.classList.contains('bg-black') || 
                       firstSection.classList.contains('bg-charcoal');
        setIsInverted(!isBlack);
      }
    };

    // Initial check
    checkBackground();
    
    // Watch for background changes (e.g., when scrolling between sections)
    const observer = new MutationObserver(checkBackground);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true,
    });

    // Also check on scroll for section changes
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

  useEffect(() => {
    if (!circleRef.current) return;

    // Kill any existing animation
    if (animationRef.current) {
      animationRef.current.kill();
    }

    // Physics-based orbiting motion with inertia, tension, and acceleration/deceleration
    const radius = 15; // Small orbit radius for subtle movement
    const duration = 8; // Slow, smooth motion
    
    // Create timeline to manage all animations
    const tl = gsap.timeline({ repeat: -1 });

    // X-axis orbit with physics easing (acceleration/deceleration)
    const xMotion = gsap.to(circleRef.current, {
      x: radius,
      duration: duration / 2,
      ease: 'power2.inOut', // Smooth acceleration and deceleration
      yoyo: true,
      repeat: -1,
    });

    // Y-axis orbit with slight delay for circular/elliptical motion
    const yMotion = gsap.to(circleRef.current, {
      y: -radius,
      duration: duration / 2,
      ease: 'power1.inOut', // Different easing creates more organic motion
      yoyo: true,
      repeat: -1,
      delay: duration / 4, // Offset creates circular motion
    });

    // Subtle scale pulsing (tension effect with inertia)
    const scaleMotion = gsap.to(circleRef.current, {
      scale: 1.1,
      duration: 3,
      ease: 'sine.inOut', // Smooth sine wave for natural pulsing
      yoyo: true,
      repeat: -1,
    });

    // Store timeline reference
    animationRef.current = tl;
    tl.add(xMotion, 0);
    tl.add(yMotion, duration / 4);
    tl.add(scaleMotion, 0);

    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
      xMotion.kill();
      yMotion.kill();
      scaleMotion.kill();
    };
  }, []);

  useEffect(() => {
    if (!textRef.current) return;

    // Fade in animation for text when it changes
    gsap.fromTo(
      textRef.current,
      { opacity: 0, y: 5 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }, [currentLabel]);

  // Determine colors based on background
  // isInverted = true means light background (use dark colors)
  // isInverted = false means dark background (use light colors)
  const circleColor = isDark || isInverted ? 'bg-black' : 'bg-white';
  const textColor = isDark || isInverted ? 'text-black' : 'text-white';

  return (
    <div 
      ref={containerRef}
      className="fixed top-8 right-8 md:top-12 md:right-16 z-50 flex flex-col items-center gap-2 pointer-events-none"
    >
      {/* White/Black circle with physics-based motion */}
      <div
        ref={circleRef}
        className={`${circleColor} w-4 h-4 rounded-full`}
        style={{
          transformOrigin: 'center center',
          willChange: 'transform', // Optimize for animations
        }}
      />
      {/* Text label */}
      <div
        ref={textRef}
        className={`${textColor} text-sm font-light lowercase tracking-wide`}
      >
        {currentLabel}
      </div>
    </div>
  );
}

