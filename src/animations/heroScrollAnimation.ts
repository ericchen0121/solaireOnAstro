import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { CustomEase } from 'gsap/CustomEase';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, CustomEase);

interface HeroScrollAnimationOptions {
  triggerSelector: string;
  contentSelector: string;
  lastSpanSelector: string;
  markers?: boolean;
  /**
   * When true, Phase 1 & 2 of the hero animation are tied to scroll position (scrubbed).
   * When false (default), they play automatically after the trigger is entered.
   */
  scrubPhase12?: boolean;
  /**
   * When true, Phase 3 (company name section) animation is tied to scroll position (scrubbed).
   * When false (default), it plays automatically after Phase 2 completes.
   * This is independent of scrubPhase12, so you can have different scrub modes for different phases.
   */
  scrubPhase3?: boolean;
  /**
   * Callback when Phase 2 (hero animation) completes
   */
  onHeroComplete?: () => void;
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
    scrubPhase12 = false,
    scrubPhase3 = false,
    onHeroComplete,
  } = options;

  let timeline: gsap.core.Timeline | null = null;
  let phase3Timeline: gsap.core.Timeline | null = null;
  let mounted = true;
  const startY = 120;

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
      
      // Check initial scroll position - if already past the hero section, hide content
      const currentScrollY = window.scrollY || window.pageYOffset;
      const triggerBottom = heroTopPosition + viewportHeightPx;
      const isPastHeroSection = currentScrollY > triggerBottom;
      
      if (isPastHeroSection) {
        // If page loaded while scrolled past hero section, hide the content immediately
        gsap.set(contentElement, { 
          opacity: 0,
          y: -(distanceToLastSpan + lastSpanHeight), // Set to final animated position
          visibility: 'hidden' // Hide completely to prevent flash
        });
        console.log('🚫 Page loaded past hero section - hiding content element');
      } else {
        // Ensure content is visible if we're in or before the hero section
        gsap.set(contentElement, { 
          opacity: 1,
          y: 0,
          visibility: 'visible'
        });
      }
      
      // Set initial state for company name section
      // h2 container: y: startY (will move up)
      // spans: opacity: 0 (will fade in)
      // Keep section background black
      if (companyNameH2) {
        gsap.set(companyNameH2, { y: startY });
        console.log('🎨 Company name h2 initial state set (y: startY)');
      }
      if (companyNameSpans.length > 0) {
        companyNameSpans.forEach((span) => {
          gsap.set(span, { opacity: 0.05 });
        });
        console.log(`🎨 Company name spans initial state set (opacity: 0) for ${companyNameSpans.length} spans`);
      }
      
      // Create timeline with ScrollTrigger
      // Animation triggers when user scrolls a bit from top, then plays automatically
      // Trigger zone spans 100vh to match the scroll distance at the end
      timeline = gsap.timeline({
        paused: !scrubPhase12, // If scrubbed, ScrollTrigger drives the timeline
        scrollTrigger: {
          trigger: triggerElement,
          start: 'top+=10px top', // Trigger after scrolling 10px
          end: `top+=${10 + viewportHeightPx}px top`, // End trigger zone after scrolling 100vh (10px + viewport height)
          scrub: scrubPhase12, // When true, Phase 1 & 2 follow scroll
          markers: markers,
          pin: false, // Don't pin, let it scroll naturally
          toggleActions: 'play none none none', // Only play forward, no reverse
          onRefresh: () => {
            // When ScrollTrigger refreshes, check if we're past the section
            const scrollY = window.scrollY || window.pageYOffset;
            const triggerBottom = heroTopPosition + viewportHeightPx;
            if (scrollY > triggerBottom && timeline) {
              // If past the section, ensure content is hidden and timeline is at end
              gsap.set(contentElement, { 
                opacity: 0,
                y: -(distanceToLastSpan + lastSpanHeight),
                visibility: 'hidden'
              });
              if (!scrubPhase12) {
                timeline.progress(1); // Set timeline to completed state
              }
            }
          },
          onEnter: () => {
            // Make content visible when entering the trigger zone
            gsap.set(contentElement, { visibility: 'visible' });
            
            if (!scrubPhase12) {
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
            // h2 container: y: startY
            // spans: opacity: 0
            if (companyNameH2) {
              const h2Height = companyNameH2.offsetHeight;
              gsap.set(companyNameH2, { y: h2Height }); // set this to padding height
              console.log(`🔄 Reset company name h2 to initial state (y: ${startY})`);
            }
            if (companyNameSpans.length > 0) {
              companyNameSpans.forEach((span) => {
                gsap.set(span, { opacity: 0 });
              });
              console.log(`🔄 Reset company name spans to initial state (opacity: 0)`);
            }
            
            // Scroll to top of hero section using GSAP ScrollTo
            gsap.to(window, {
              scrollTo: {
                y: heroTopPosition,
                autoKill: false,
              },
              duration: 0.7,
              ease: "power2.out",
            });
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
          const scrollTarget = viewportHeightPx; // Scroll to exactly 100vh from top
          console.log("scrollTarget", scrollTarget);
          gsap.to(window, {
            scrollTo: {
              y: scrollTarget,
              autoKill: false,
            },
            duration: 0.05,
            ease: "power2.out",
          });
          console.log(`📜 Scrolled to 100vh (${viewportHeightPx}px) - next section in view`);
          
          // Call completion callback if provided
          if (onHeroComplete) {
            onHeroComplete();
          }
        },
      });

      // Phase 3: Fade in and slide up company name section
      // Separate timeline with its own ScrollTrigger for independent scrub control
      // Uses transform-based animations (y, opacity) - doesn't affect document flow
      if (companyNameH2 && companyNameSpans.length > 0 && companyNameSection) {
        // Get the height of the h2 element
        const h2Height = companyNameH2.offsetHeight;
        
        const duration1 = 1;
        const duration2 = 0.55;
        const totalDuration = duration1 + duration2;

        // Create separate timeline for Phase 3 with independent ScrollTrigger
        phase3Timeline = gsap.timeline({
          paused: !scrubPhase3, // Pause if not scrubbing (will be triggered by ScrollTrigger)
          scrollTrigger: {
            trigger: companyNameSection,
            start: 'top-=100px top', // Start when section top hits viewport top
            end: `+=${viewportHeightPx}`, // End after scrolling 100vh
            scrub: scrubPhase3, // Independent scrub control for Phase 3
            markers: markers,
            // pin: true,
            onEnter: () => {
              if (!scrubPhase3 && phase3Timeline && phase3Timeline.paused()) {
                phase3Timeline.play();
                console.log('✨ Phase 3 started - Company name section fade in and slide up');
              }
            },
            onLeave: () => {
              console.log('✅ Phase 3 completed - Company name section animation finished');
            },
            onEnterBack: () => {
              if (!scrubPhase3 && phase3Timeline) {
                // Restart animation when scrolling back up into the section
                // Reset to initial state first
                if (companyNameH2) {
                  gsap.set(companyNameH2, { y: startY });
                }
                if (companyNameSpans.length > 0) {
                  companyNameSpans.forEach((span) => {
                    gsap.set(span, { opacity: 0.05 });
                  });
                }
                // Reset timeline and play from beginning
                phase3Timeline.progress(0);
                phase3Timeline.pause();
                phase3Timeline.play();
                console.log('🔄 Phase 3 restarting - Company name section animation restarting from beginning');
              }
            },
            onLeaveBack: () => {
              // When leaving the section going backwards (scrolling up past it), reset to initial state
              if (!scrubPhase3) {
                if (companyNameH2) {
                  gsap.set(companyNameH2, { y: startY });
                }
                if (companyNameSpans.length > 0) {
                  companyNameSpans.forEach((span) => {
                    gsap.set(span, { opacity: 0.05 });
                  });
                }
                if (phase3Timeline) {
                  phase3Timeline.progress(0);
                  phase3Timeline.pause();
                }
                console.log('🔄 Phase 3 reset - Company name section reset to initial state');
              }
            },
          },
        });

        // Animate spans opacity (fade in) - same timing as both parts
        phase3Timeline.to(companyNameSpans, {
          opacity: 1,
          duration: totalDuration,
          ease: CustomEase.create("custom", "M0,0 C0.272,0 0.522,0.117 0.566,0.335 0.654,0.776 0.744,1 1,1 "),
          onStart: () => {
            console.log('✨ Phase 3 started - Company name section fade in and slide up');
          },
          onComplete: () => {
            console.log('✅ Phase 3 completed - Company name section animation finished');
          },
        }, 0); // Start at timeline position 0

        // Part 1: Move from y: h2Height to y: -h2Height+100
        // Using transform (translateY) - doesn't affect document flow, allows normal scrolling
        phase3Timeline.to(companyNameH2, {
          y: -h2Height + 100,
          duration: duration1,
          ease: 'none',
        }, 0); // Start at the same time as spans animation
        
        // Part 2: Move from y: -h2Height+100 to y: -(viewportHeightPx - h2Height*1.75)
        phase3Timeline.to(companyNameH2, {
          y: -(viewportHeightPx - h2Height * 1.75),
          duration: duration2,
          ease: 'power3.out',
        }, duration1); // Start after part 1 completes
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

    if (phase3Timeline) {
      phase3Timeline.scrollTrigger?.kill();
      phase3Timeline.kill();
      phase3Timeline = null;
    }
  };
}

