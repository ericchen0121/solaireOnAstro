import { HOME_SUBPAGE_SECTION_LINK_CLASS } from "./homeSubpageSectionNav";

/** Strip click / hover / snap classes that must not survive bfcache or back navigation. */
export function resetHomePageVisualState(): void {
  if (typeof document === "undefined") return;

  document.body.classList.remove(
    "nav-or-text-hovered",
    "section-snap-scrolling",
    "strip-nav-departing",
  );

  document
    .querySelectorAll(`a.${HOME_SUBPAGE_SECTION_LINK_CLASS}.active`)
    .forEach((link) => {
      link.classList.remove("active");
    });
}
