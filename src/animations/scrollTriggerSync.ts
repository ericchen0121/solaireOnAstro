import { ScrollTrigger } from "gsap/ScrollTrigger";

export function setupScrollTriggerSync(): void {
  // Note: ScrollTrigger sync is already set up in LenisProvider.astro
  // This function just refreshes ScrollTrigger
  ScrollTrigger.refresh();
}
