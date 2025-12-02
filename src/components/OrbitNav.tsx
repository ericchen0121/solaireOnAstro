/** @jsxImportSource react */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface OrbitNavProps {
  items: Array<{ label: string; href: string }>;
  isDark?: boolean;
}

export default function OrbitNav({ items, isDark = false }: OrbitNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const [isInverted, setIsInverted] = useState(false);

  useEffect(() => {
    // Detect page background color by checking the first section
    const checkBackground = () => {
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
  }, []);

  useEffect(() => {
    if (!containerRef.current || !orbitRef.current) return;

    const navItems = orbitRef.current.querySelectorAll('.orbit-nav-item');
    const centerX = containerRef.current.offsetWidth / 2;
    const centerY = containerRef.current.offsetHeight / 2;
    const radius = 80; // Orbit radius in pixels
    const angleStep = (2 * Math.PI) / navItems.length;

    // Physics-based animation with inertia and tension
    const tl = gsap.timeline({ repeat: -1 });

    navItems.forEach((item, index) => {
      const angle = index * angleStep;
      const x = centerX + radius * Math.cos(angle) - 20; // -20 for item width offset
      const y = centerY + radius * Math.sin(angle) - 20; // -20 for item height offset

      gsap.set(item, {
        x: x,
        y: y,
        rotation: 0,
      });

      // Create orbiting motion with physics
      const orbitAnimation = gsap.to(item, {
        rotation: 360,
        duration: 20 + index * 2, // Varying speeds for visual interest
        ease: 'none',
        repeat: -1,
      });

      // Add subtle floating motion with inertia
      gsap.to(item, {
        y: `+=${5 + index * 0.5}`,
        duration: 2 + index * 0.2,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1,
      });

      // Add tension effect (slight scale variation)
      gsap.to(item, {
        scale: 1.05,
        duration: 3 + index * 0.3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    });

    // Main orbit rotation with acceleration/deceleration
    gsap.to(orbitRef.current, {
      rotation: 360,
      duration: 30,
      ease: 'power1.inOut',
      repeat: -1,
    });

    return () => {
      tl.kill();
    };
  }, [items]);

  const colorClass = isDark || isInverted ? 'text-black' : 'text-white';
  const bgClass = isDark || isInverted ? 'bg-white' : 'bg-black';

  return (
    <div
      ref={containerRef}
      className="fixed top-4 right-4 z-50 w-40 h-40 pointer-events-none"
    >
      <div ref={orbitRef} className="relative w-full h-full">
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            className={`orbit-nav-item absolute ${colorClass} ${bgClass} px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-colors duration-300 pointer-events-auto hover:scale-110`}
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}

