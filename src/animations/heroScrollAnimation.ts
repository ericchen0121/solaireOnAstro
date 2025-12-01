import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { getLenis } from './gsapLenis';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, CustomEase);

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
    const companyNameSection = document.querySelector('.company-name-section') as HTMLElement;
    const companyNameH2 = companyNameSection 
      ? companyNameSection.querySelector('h2') as HTMLElement
      : null;
    const companyNameSpans = companyNameH2 
      ? Array.from(companyNameH2.querySelectorAll('span')) as HTMLElement[]
      : [];

    console.log('🔍 Hero Scroll Animation Debug:', {
      triggerElement: triggerElement ? 'Found' : 'NOT FOUND',
      contentElement: contentElement ? 'Found' : 'NOT FOUND',
      lastSpan: lastSpan ? 'Found' : 'NOT FOUND',
      companyNameSection: companyNameSection ? 'Found' : 'NOT FOUND',
      companyNameH2: companyNameH2 ? 'Found' : 'NOT FOUND',
      companyNameSpans: companyNameSpans.length,
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
      
      // Set initial state for company name section
      // h2 container: y: 40 (will move up)
      // spans: opacity: 0 (will fade in)
      // Keep section background black
      if (companyNameH2) {
        gsap.set(companyNameH2, { y: 40 });
        console.log('🎨 Company name h2 initial state set (y: 40)');
      }
      if (companyNameSpans.length > 0) {
        companyNameSpans.forEach((span) => {
          gsap.set(span, { opacity: 0 });
        });
        console.log(`🎨 Company name spans initial state set (opacity: 0) for ${companyNameSpans.length} spans`);
      }
      
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
          // To enable scrub mode (tie Phase 3 animation to scroll): change to scrub: true
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
            
            // Reset company name section to initial state
            // h2 container: y: 40
            // spans: opacity: 0
            if (companyNameH2) {
              gsap.set(companyNameH2, { y: 100 }); // set this to padding height
              console.log('🔄 Reset company name h2 to initial state (y: 40)');
            }
            if (companyNameSpans.length > 0) {
              companyNameSpans.forEach((span) => {
                gsap.set(span, { opacity: 0 });
              });
              console.log(`🔄 Reset company name spans to initial state (opacity: 0)`);
            }
            
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

      // Phase 3: Fade in and slide up company name section
      // Starts after Phase 2 completes (after scroll to 100vh)
      // Uses transform-based animations (y, opacity) - doesn't affect document flow
      // To switch to scrub mode: change main timeline's ScrollTrigger scrub to true (line ~98)
      if (companyNameH2 && companyNameSpans.length > 0) {
        // Get the height of the h2 element
        const h2Height = companyNameH2.offsetHeight;
        
        const duration1 = 1;
        const duration2 = 0.55;
        const totalDuration = duration1 + duration2;

        // Animate spans opacity (fade in) - same timing as both parts
        timeline.to(companyNameSpans, {
          opacity: 1,
          duration: totalDuration,
          ease: CustomEase.create("custom", "M0,0 C0.272,0 0.522,0.117 0.566,0.335 0.654,0.776 0.744,1 1,1 "),
          onStart: () => {
            if (!timeline) return;
            console.log('✨ Phase 3 started - Company name section fade in and slide up');
          },
          onComplete: () => {
            if (!timeline) return;
            console.log('✅ Phase 3 completed - Company name section animation finished');
          },
        }, '>='); // Start after Phase 2 completes

        // Part 1: Move from y: 100 to y: -h2Height+100
        // Using transform (translateY) - doesn't affect document flow, allows normal scrolling
        timeline.to(companyNameH2, {
          y: -h2Height + 100,
          duration: duration1,
          ease: 'none',
        }, '<'); // Start at the same time as spans animation
        
        // Part 2: Move from y: -h2Height+100 to y: -(viewportHeightPx - h2Height*1.75)
        timeline.to(companyNameH2, {
          y: -(viewportHeightPx - h2Height * 1.75),
          duration: duration2,
          ease: 'power3.out',
        }, '>='); // Start after part 1 completes
      }

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

