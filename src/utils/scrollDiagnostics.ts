/**
 * Safari / WebKit scroll & ScrollTrigger debugging.
 *
 * Enable logs in the browser console:
 * - Add `?debugScroll` or `?debugScroll=1` to the URL and reload, or
 * - Run `localStorage.setItem('debugScroll', '1')` then reload
 * - Disable: `localStorage.removeItem('debugScroll')` or remove the query param
 */
export function isScrollDiagnosticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("debugScroll")) {
      return true;
    }
    if (localStorage.getItem("debugScroll") === "1") {
      return true;
    }
  } catch {
    /* private mode / blocked storage */
  }
  return false;
}

/** Prefix keeps console filter easy: `[scrollDiag]` */
export function logScrollDiag(
  source: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!isScrollDiagnosticsEnabled()) return;
  if (data !== undefined) {
    console.log(`[scrollDiag] ${source}: ${message}`, data);
  } else {
    console.log(`[scrollDiag] ${source}: ${message}`);
  }
}
