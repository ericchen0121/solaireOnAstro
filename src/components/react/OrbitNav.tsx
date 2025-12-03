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
  const [isHovered, setIsHovered] = useState(false);
  const [areTargetSectionsInView, setAreTargetSectionsInView] = useState(false);
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
        // Check if section is at least partially visible in viewport
        // Section must be in viewport (not completely above or below)
        return rect.top < viewportHeight && rect.bottom > 0 && rect.left < viewportWidth && rect.right > 0;
      });

      setAreTargetSectionsInView(isAnyInView);
      
      // If no target sections are in view, remove hover class
      if (!isAnyInView) {
        setIsHovered(false);
        document.body.classList.remove('nav-or-text-hovered');
      }
    };

    // Initial check
    checkSectionsInView();

    // Check on scroll with throttling
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        checkSectionsInView();
      }, 50);
    };

    // Use IntersectionObserver for better performance
    const sectionVisibilityMap = new Map<Element, boolean>();
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionVisibilityMap.set(entry.target, entry.isIntersecting);
        });
        // Check if any section is visible
        const isAnyVisible = Array.from(sectionVisibilityMap.values()).some((visible) => visible);
        setAreTargetSectionsInView(isAnyVisible);
        
        // If no target sections are in view, remove hover class
        if (!isAnyVisible) {
          setIsHovered(false);
          document.body.classList.remove('nav-or-text-hovered');
        }
      },
      {
        threshold: 0.1, // Trigger when at least 10% is visible
        rootMargin: '0px',
      }
    );

    const whySolarSection = document.querySelector('.why-solar-section');
    const whyUsSection = document.querySelector('.why-us-section');
    const clientsSection = document.querySelector('.clients-section');

    [whySolarSection, whyUsSection, clientsSection].forEach((section) => {
      if (section) {
        observer.observe(section);
        sectionVisibilityMap.set(section, false); // Initialize as not visible
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
    // Listen for hover events on text sections and nav
    // Only apply hover effect if target sections are in view
    const handleTextHover = () => {
      if (areTargetSectionsInView) {
        setIsHovered(true);
        document.body.classList.add('nav-or-text-hovered');
      }
    };
    
    const handleTextLeave = () => {
      setIsHovered(false);
      // Only remove class if nav is not hovered
      if (!containerRef.current?.matches(':hover')) {
        document.body.classList.remove('nav-or-text-hovered');
      }
    };

    // Add hover listeners to text sections
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
  // When hovered (nav or text sections) AND target sections are in view, force black
  const circleColor = (isHovered && areTargetSectionsInView) ? 'bg-black' : (isDark || isInverted ? 'bg-black' : 'bg-white');
  const textColor = (isHovered && areTargetSectionsInView) ? 'text-black' : (isDark || isInverted ? 'text-black' : 'text-white');

  return (
    <div 
      ref={containerRef}
      className="orbit-nav-container fixed top-8 right-8 md:top-12 md:right-16 z-50 flex flex-col items-center gap-2"
      onMouseEnter={() => {
        // Only change color if target sections are in view
        if (areTargetSectionsInView) {
          setIsHovered(true);
          document.body.classList.add('nav-or-text-hovered');
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        // Only remove class if text sections are not hovered
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
      }}
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

