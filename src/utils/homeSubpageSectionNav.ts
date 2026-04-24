/**
 * Homepage "strip" links to subpages (Pourquoi, clients, projets, contact).
 * - Markup: anchor has class {@link HOME_SUBPAGE_SECTION_LINK_CLASS}.
 * - Optional {@link DATA_SUBPAGE_WIPE_ATTR}: "false" = same hard navigation + orbit pill, no white-bar wipe; omit or "true" = bar wipe.
 * OrbitNav and `index.astro` use this so navigation is not tied to the slide-bar animation implementation.
 */
export const HOME_SUBPAGE_SECTION_LINK_CLASS = "home-subpage-section-link" as const;
export const DATA_SUBPAGE_WIPE_ATTR = "data-subpage-wipe" as const;

export function shouldPlaySubpageWipeAnims(anchor: HTMLAnchorElement): boolean {
  return anchor.dataset.subpageWipe !== "false";
}
