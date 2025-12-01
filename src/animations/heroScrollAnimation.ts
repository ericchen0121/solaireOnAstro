import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis } from './gsapLenis';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

interface HeroScrollAnimationOptions {
  triggerSelector: string;
  contentSelector: string;
  lastSpanSelector: string;
  markers?: boolean;
}

/**
 * Initialize hero scroll animation with two-phase motion:
 * 1. Fast acceleration - scroll most text off screen until last span
 * 2. Slow deceleration - animate last span off screen slowly
 */
export function initHeroScrollAnimation(options: HeroScrollAnimationOptions): () => void {
  const {
    triggerSelector,
    contentSelector,
    lastSpanSelector,
    markers = false,
  } = options;

  let timeline: gsap.core.Timeline | null = null;
  let mounted = true;

  const initAnimation = () => {
    const triggerElement = document.querySelector(triggerSelector) as HTMLElement;
    const contentElement = document.querySelector(contentSelector) as HTMLElement;
    const lastSpan = document.querySelector(lastSpanSelector) as HTMLElement;

    console.log('🔍 Hero Scroll Animation Debug:', {
      triggerElement: triggerElement ? 'Found' : 'NOT FOUND',
      contentElement: contentElement ? 'Found' : 'NOT FOUND',
      lastSpan: lastSpan ? 'Found' : 'NOT FOUND',
      mounted,
    });

    if (!triggerElement || !contentElement || !lastSpan || !mounted) {
      console.error('❌ Hero Scroll Animation: Missing elements or not mounted');
      return;
    }

    // Kill existing timeline if any
    if (timeline) {
      timeline.scrollTrigger?.kill();
      timeline.kill();
      timeline = null;
    }

    // Wait for layout to be ready
    requestAnimationFrame(() => {
      if (!mounted) return;

      // Calculate positions relative to viewport
      const contentRect = contentElement.getBoundingClientRect();
      const lastSpanRect = lastSpan.getBoundingClientRect();
      
      // Distance from viewport top to last span top (relative to viewport)
      const distanceToLastSpan = lastSpanRect.top;
      
      // Viewport height for moving last span off screen
      const viewportHeight = window.innerHeight;
      const lastSpanHeight = lastSpanRect.height;
      
      // Total distance: move to last span position, then move it off screen
      const totalDistance = distanceToLastSpan + viewportHeight;

      console.log('📐 Hero Scroll Animation Calculations:', {
        distanceToLastSpan,
        viewportHeight,
        lastSpanHeight,
        totalDistance,
        contentRect: { top: contentRect.top, height: contentRect.height },
        lastSpanRect: { top: lastSpanRect.top, height: lastSpanRect.height },
      });

      // Calculate 100vh in pixels
      const viewportHeightPx = window.innerHeight;
      
      // Get the top position of the hero section for scroll-to-top functionality
      const heroTopPosition = triggerElement.offsetTop;
      console.log("heroTopPosition", heroTopPosition)
      
      // Create timeline with ScrollTrigger
      // Animation triggers when user scrolls a bit from top, then plays automatically
      // Trigger zone spans 100vh to match the scroll distance at the end
      timeline = gsap.timeline({
        paused: true, // Start paused, will be triggered by ScrollTrigger
        scrollTrigger: {
          trigger: triggerElement,
          start: 'top+=10px top', // Trigger after scrolling 10px
          end: `top+=${10 + viewportHeightPx}px top`, // End trigger zone after scrolling 100vh (10px + viewport height)
          scrub: false, // Not tied to scroll - plays at own pace
          markers: markers,
          pin: false, // Don't pin, let it scroll naturally
          toggleActions: 'play none none none', // Only play forward, no reverse
          onEnter: () => {
            console.log('✅ ScrollTrigger: onEnter - Animation should play forward');
            console.log('🔍 Debug onEnter - Timeline state:', {
              timelineExists: !!timeline,
              paused: timeline?.paused(),
              progress: timeline?.progress(),
              duration: timeline?.duration(),
              isActive: timeline?.isActive(),
              scrollTrigger: timeline?.scrollTrigger ? 'exists' : 'missing',
              scrollTriggerIsActive: timeline?.scrollTrigger?.isActive,
              scrollTriggerProgress: timeline?.scrollTrigger?.progress,
            });
            
            // Explicitly play the timeline to ensure it starts
            if (timeline) {
              if (timeline.paused()) {
                console.log('▶️ Timeline is paused, calling play()...');
                timeline.play();
                console.log('🔍 After play() - Timeline state:', {
                  paused: timeline.paused(),
                  progress: timeline.progress(),
                  isActive: timeline.isActive(),
                });
              } else {
                console.log('⚠️ Timeline is not paused, current state:', {
                  paused: timeline.paused(),
                  progress: timeline.progress(),
                });
              }
            } else {
              console.error('❌ Timeline does not exist in onEnter!');
            }
          },
          onLeaveBack: () => {
            // When scrolling back up past the start trigger, reset text position and scroll to top
            console.log('⬆️ ScrollTrigger: onLeaveBack - Resetting text position and scrolling to top');
            console.log('🔍 Debug onLeaveBack - Before reset, Timeline state:', {
              timelineExists: !!timeline,
              paused: timeline?.paused(),
              progress: timeline?.progress(),
              duration: timeline?.duration(),
              isActive: timeline?.isActive(),
              scrollTrigger: timeline?.scrollTrigger ? 'exists' : 'missing',
              scrollTriggerIsActive: timeline?.scrollTrigger?.isActive,
            });
            
            // Reset the timeline progress to 0 and ensure it's paused and ready to play
            if (timeline && timeline.scrollTrigger) {
              // Pause first to stop any ongoing animation
              timeline.pause();
              console.log('🔍 After pause() - Timeline state:', {
                paused: timeline.paused(),
                progress: timeline.progress(),
                duration: timeline.duration(),
              });
              
              // Reset progress to beginning WITHOUT calling restart() (which clears tweens)
              timeline.progress(0);
              console.log('🔍 After progress(0) - Timeline state:', {
                paused: timeline.paused(),
                progress: timeline.progress(),
                duration: timeline.duration(),
              });
              
              // Refresh ScrollTrigger to ensure it's in sync
              timeline.scrollTrigger.refresh();
              console.log('🔍 After ScrollTrigger.refresh() - ScrollTrigger state:', {
                isActive: timeline.scrollTrigger.isActive,
                progress: timeline.scrollTrigger.progress,
                direction: timeline.scrollTrigger.direction,
                timelineDuration: timeline.duration(),
              });
            } else {
              console.error('❌ Timeline or ScrollTrigger missing in onLeaveBack!', {
                timelineExists: !!timeline,
                scrollTriggerExists: !!timeline?.scrollTrigger,
              });
            }
            
            // Set initial opacity to 0 for fade-in effect
            gsap.set(contentElement, { opacity: 0 });
            
            // Reset the y position and fade in opacity of the content element
            // Use overwrite: 'auto' to only overwrite conflicting properties, not all tweens
            gsap.to(contentElement, {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: 'power2.out',
              overwrite: 'auto', // Only overwrite conflicting properties, preserve timeline tweens
            });
            
            // Scroll to top of hero section
            const lenis = getLenis();
            if (lenis) {
              lenis.scrollTo(heroTopPosition, {
                duration: 0.7,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              });
            } else {
              // Fallback to native scroll if Lenis is not available
              window.scrollTo({
                top: heroTopPosition,
                behavior: 'smooth',
              });
            }
            console.log(`📜 Reset timeline, text y position to 0, and scrolled to top of hero section at position ${heroTopPosition}`);
          },
          onUpdate: (self) => {
            // Log when entering/leaving trigger zone for debugging
            if (self.isActive && self.progress === 0) {
              console.log('🔄 ScrollTrigger: onUpdate - Just entered trigger zone', {
                progress: self.progress,
                direction: self.direction,
                isActive: self.isActive,
                timelinePaused: timeline?.paused(),
                timelineProgress: timeline?.progress(),
              });
            }
            // Only log occasionally to avoid spam
            if (Math.random() < 0.01) {
              console.log('🔄 ScrollTrigger: onUpdate', {
                progress: self.progress,
                direction: self.direction,
                isActive: self.isActive,
                timelinePaused: timeline?.paused(),
                timelineProgress: timeline?.progress(),
              });
            }
          },
        },
      });

      console.log('🎬 Timeline created:', {
        paused: timeline.paused(),
        duration: timeline.duration(),
        progress: timeline.progress(),
        scrollTrigger: timeline.scrollTrigger ? 'Attached' : 'NOT ATTACHED',
        scrollTriggerConfig: timeline.scrollTrigger ? {
          isActive: timeline.scrollTrigger.isActive,
          progress: timeline.scrollTrigger.progress,
          start: timeline.scrollTrigger.start,
          end: timeline.scrollTrigger.end,
        } : null,
      });
      
      // Add timeline event listeners for debugging
      timeline.eventCallback('onStart', () => {
        console.log('🎬 Timeline: onStart callback fired');
      });
      
      timeline.eventCallback('onComplete', () => {
        if (!timeline) return;
        console.log('🎬 Timeline: onComplete callback fired', {
          progress: timeline.progress(),
          paused: timeline.paused(),
        });
      });
      
      timeline.eventCallback('onUpdate', () => {
        if (!timeline) return;
        // Only log occasionally
        if (Math.random() < 0.05) {
          console.log('🎬 Timeline: onUpdate callback', {
            progress: timeline.progress(),
            paused: timeline.paused(),
            isActive: timeline.isActive(),
          });
        }
      });

      // Phase 1: Fast acceleration - move content up until last span reaches viewport top
      timeline.to(contentElement, {
        y: -(distanceToLastSpan),
        duration: .5, // Fast phase - 0.3 seconds
        ease: 'power4.out', // Fast start, slows down
        onStart: () => {
          if (!timeline) return;
          console.log('🚀 Phase 1 started');
          console.log('🔍 Phase 1 onStart - Timeline state:', {
            paused: timeline.paused(),
            progress: timeline.progress(),
            isActive: timeline.isActive(),
          });
        },
        onComplete: () => {
          if (!timeline) return;
          console.log('✅ Phase 1 completed');
          console.log('🔍 Phase 1 onComplete - Timeline state:', {
            paused: timeline.paused(),
            progress: timeline.progress(),
            isActive: timeline.isActive(),
          });
        },
      });

      // Phase 2: Slow deceleration - move last span off screen slowly
      timeline.to(contentElement, {
        y: -(distanceToLastSpan+lastSpanHeight),//-totalDistance,
        duration: .5, // Slower phase - 0.7 seconds
        ease: 'power2.in', // Smooth, slow deceleration
        onStart: () => {
          if (!timeline) return;
          console.log('🐌 Phase 2 started');
          console.log('🔍 Phase 2 onStart - Timeline state:', {
            paused: timeline.paused(),
            progress: timeline.progress(),
            isActive: timeline.isActive(),
          });
        },
        onComplete: () => {
          if (!timeline) return;
          console.log('✅ Phase 2 completed - Animation finished');
          console.log('🔍 Phase 2 onComplete - Timeline state:', {
            paused: timeline.paused(),
            progress: timeline.progress(),
            isActive: timeline.isActive(),
          });
          // Scroll to exactly 100vh from top so next section is in view
          const lenis = getLenis();
          const scrollTarget = viewportHeightPx; // Scroll to exactly 100vh from top
          console.log(lenis, "scrollTarget", scrollTarget)
          if (lenis) {
            lenis.scrollTo(scrollTarget, {
              duration: 0.05,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
          } else {
            // Fallback to native scroll if Lenis is not available
            window.scrollTo({
              top: scrollTarget,
              behavior: 'smooth',
            });
          }
          console.log(`📜 Scrolled to 100vh (${viewportHeightPx}px) - next section in view`);
        },
      });

      // Refresh ScrollTrigger after setup
      ScrollTrigger.refresh();
      
      console.log('✨ Hero Scroll Animation initialized successfully');
    });
  };

  // Wait for DOM and Lenis to be ready
  const waitAndInit = () => {
    if (typeof window === 'undefined' || !mounted) return;

    // Wait a bit for Lenis to initialize
    setTimeout(() => {
      if (mounted) {
        initAnimation();
      }
    }, 300);
  };

  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', waitAndInit);
    } else {
      waitAndInit();
    }
  }

  // Cleanup function
  return () => {
    mounted = false;

    if (timeline) {
      timeline.scrollTrigger?.kill();
      timeline.kill();
      timeline = null;
    }
  };
}

