/**
 * Projets page — backup animation: titles synced to the looping background video.
 * Markup: one `.projets-title-item` per entry in `PROJETS_TITLE_LOOP_TEXTS` (labels in HTML).
 */
import { tryPlayVideo } from "../utils/ensureVideoPlayback";

export const PROJETS_TITLE_LOOP_TEXTS = [
  "Industriel",
  "Résidentiel",
  "Rural",
  "École",
  "Hôpital",
] as const;

/** Title appears this many seconds after its segment’s video start. */
export const PROJETS_TITLE_APPEAR_OFFSET_S = 0.1;
/** Start leaving this many seconds before the *next* segment’s “start” (same t-grid as the video). */
export const PROJETS_TITLE_END_BEFORE_NEXT_S = 0.06;
/** Must match `.projets-title-item` `leave` / `--projets-title-leave-dur` (~0.1s). */
export const PROJETS_TITLE_LEAVE_DURATION_S = 0.1;

export type ProjetsTitleMode = "idle" | "active" | "leaving";

function sleepMs(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function readCssDurationMs(
  el: HTMLElement,
  prop: string,
  fallbackS: number,
): number {
  const raw = getComputedStyle(el).getPropertyValue(prop).trim();
  const m = raw.match(/^([\d.]+)s$/);
  const s = m ? parseFloat(m[1]) : fallbackS;
  return Math.max(0, Math.round(s * 1000) + 60);
}

const texts = PROJETS_TITLE_LOOP_TEXTS;

function initProjetsTitleLoopTimed(
  items: HTMLElement[],
  section: HTMLElement,
) {
  const holdS = Math.max(
    0.2,
    parseFloat(section.dataset.projetsTitleHoldS ?? "3"),
  );

  const ac = new AbortController();
  const { signal } = ac;
  const video = section.querySelector<HTMLVideoElement>("#projets-video");

  if (video) tryPlayVideo(video);

  let prevModes: ProjetsTitleMode[] | null = null;
  const n = items.length;

  void (async () => {
    let k = 0;
    try {
      while (!signal.aborted) {
        const soloActive = Array.from({ length: n }, (_, i) =>
          i === k ? "active" : "idle",
        ) as ProjetsTitleMode[];
        prevModes = applyProjetsTitleItemsState(
          items,
          soloActive,
          prevModes,
        );

        const enterMs = readCssDurationMs(
          items[k]!,
          "--projets-title-enter-dur",
          0.24,
        );
        await sleepMs(enterMs, signal);
        await sleepMs(holdS * 1000, signal);

        const next = (k + 1) % n;
        const overlap = Array.from({ length: n }, (_, i) => {
          if (i === k) return "leaving";
          if (i === next) return "active";
          return "idle";
        }) as ProjetsTitleMode[];
        prevModes = applyProjetsTitleItemsState(items, overlap, prevModes);

        const leaveMs = readCssDurationMs(
          items[k]!,
          "--projets-title-leave-dur",
          PROJETS_TITLE_LEAVE_DURATION_S,
        );
        const enterNextMs = readCssDurationMs(
          items[next]!,
          "--projets-title-enter-dur",
          0.24,
        );
        await sleepMs(Math.max(leaveMs, enterNextMs), signal);

        const onlyNext = Array.from({ length: n }, (_, i) =>
          i === next ? "active" : "idle",
        ) as ProjetsTitleMode[];
        prevModes = applyProjetsTitleItemsState(items, onlyNext, prevModes);

        k = next;
        await sleepMs(120, signal);
      }
    } catch {
      /* aborted */
    }
  })();

  projetsTitleLoopBackupCleanup = () => {
    ac.abort();
    for (const el of items) {
      el.removeAttribute("style");
      el.classList.remove("active", "leaving");
    }
  };
}

export type ProjetsViz = {
  k: number | null;
  m: "idle" | "active" | "leaving";
};

/**
 * Per-segment windows on the shared video timeline: black holds are explicit so titles line up
 * with the edit (0.1s in / 0.06s out before the next “cut”).
 */
export function computeProjetsTitleLoopViz(
  t: number,
  duration: number,
): ProjetsViz {
  const n = texts.length;
  if (!Number.isFinite(t) || !Number.isFinite(duration) || duration <= 0) {
    return { k: null, m: "idle" };
  }
  t = ((t % duration) + duration) % duration;
  const D = duration / n;

  if (t < PROJETS_TITLE_APPEAR_OFFSET_S) {
    return { k: null, m: "idle" };
  }
  for (let i = 0; i < n; i++) {
    const a0 = i * D + PROJETS_TITLE_APPEAR_OFFSET_S;
    const a1 = (i + 1) * D - PROJETS_TITLE_END_BEFORE_NEXT_S;
    if (t >= a0 && t < a1) {
      return { k: i, m: "active" };
    }
  }
  for (let i = 0; i < n; i++) {
    const l0 = (i + 1) * D - PROJETS_TITLE_END_BEFORE_NEXT_S;
    const l1 = l0 + PROJETS_TITLE_LEAVE_DURATION_S;
    if (t >= l0 && t < l1) {
      return { k: i, m: "leaving" };
    }
  }
  for (let i = 0; i < n; i++) {
    const l0 = (i + 1) * D - PROJETS_TITLE_END_BEFORE_NEXT_S;
    const i0 = l0 + PROJETS_TITLE_LEAVE_DURATION_S;
    const i1 = (i + 1) * D + PROJETS_TITLE_APPEAR_OFFSET_S;
    if (t >= i0 && t < i1) {
      return { k: null, m: "idle" };
    }
  }
  return { k: null, m: "idle" };
}

function vizEqual(a: ProjetsViz | null, b: ProjetsViz | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.k === b.k && a.m === b.m;
}

/** Map single-title viz (video timeline) to one mode per item. */
export function modesFromProjetsViz(
  viz: ProjetsViz,
  n: number,
): ProjetsTitleMode[] {
  const modes: ProjetsTitleMode[] = Array.from({ length: n }, () => "idle");
  if (viz.m === "idle" || viz.k == null) return modes;
  if (viz.k >= 0 && viz.k < n) {
    modes[viz.k] = viz.m;
  }
  return modes;
}

/**
 * Apply `active` / `leaving` / idle (no classes) per item. Reflow only when entering `active`
 * from a non-active prior mode so CSS transitions restart.
 */
export function applyProjetsTitleItemsState(
  items: HTMLElement[],
  modes: ProjetsTitleMode[],
  prevModes: ProjetsTitleMode[] | null,
): ProjetsTitleMode[] {
  for (let i = 0; i < items.length; i++) {
    const el = items[i]!;
    const mode = modes[i] ?? "idle";
    const was = prevModes?.[i] ?? "idle";
    const needsActiveReflow = mode === "active" && was !== "active";

    el.removeAttribute("style");
    el.classList.remove("active", "leaving");

    if (mode === "idle") {
      continue;
    }
    if (mode === "leaving") {
      el.classList.add("leaving");
      continue;
    }
    if (needsActiveReflow) void el.offsetHeight;
    el.classList.add("active");
  }
  return [...modes];
}

/** Apply video-sync viz to all title items; returns updated previous-modes snapshot. */
export function applyProjetsTitleLoopViz(
  viz: ProjetsViz,
  titleItems: HTMLElement[],
  prevModes: ProjetsTitleMode[] | null = null,
): ProjetsTitleMode[] {
  const modes = modesFromProjetsViz(viz, titleItems.length);
  return applyProjetsTitleItemsState(titleItems, modes, prevModes);
}

let projetsTitleLoopBackupCleanup: (() => void) | null = null;
let videoDuration = 0;
let rafId = 0;
let lastT = 0;
let lastViz: ProjetsViz | null = null;

export function initProjetsTitleLoopBackup() {
  projetsTitleLoopBackupCleanup?.();
  projetsTitleLoopBackupCleanup = null;

  const video = document.getElementById("projets-video") as HTMLVideoElement | null;
  if (!video) return;

  const section = video.closest(".projets-section");
  if (!(section instanceof HTMLElement)) return;

  const items = [
    ...section.querySelectorAll<HTMLElement>(".projets-title-item"),
  ];
  if (items.length === 0) return;

  if (section.dataset.projetsTitleTimed === "true") {
    initProjetsTitleLoopTimed(items, section);
    return;
  }

  const v = video;
  let didInitTiming = false;
  videoDuration = 0;
  lastT = 0;
  lastViz = null;
  let prevModes: ProjetsTitleMode[] | null = null;

  const ac = new AbortController();

  const stopRaf = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const tick = () => {
    rafId = requestAnimationFrame(tick);
    if (videoDuration <= 0) return;
    const tRaw = v.currentTime;
    const t = ((tRaw % videoDuration) + videoDuration) % videoDuration;
    if (lastT - t > 0.2 && lastT > 0.5) {
      lastViz = null;
    }
    const viz = computeProjetsTitleLoopViz(t, videoDuration);
    if (lastViz == null || !vizEqual(viz, lastViz)) {
      prevModes = applyProjetsTitleLoopViz(viz, items, prevModes);
      lastViz = viz;
    }
    lastT = t;
  };

  function startRaf() {
    stopRaf();
    rafId = requestAnimationFrame(tick);
  }

  function onLoadedMetadata() {
    const d = v.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    if (didInitTiming) {
      return;
    }
    didInitTiming = true;
    videoDuration = d;
    lastViz = null;
    lastT = 0;
    prevModes = null;
    const t =
      ((v.currentTime % videoDuration) + videoDuration) % videoDuration;
    const viz = computeProjetsTitleLoopViz(t, videoDuration);
    prevModes = applyProjetsTitleLoopViz(viz, items, prevModes);
    lastViz = viz;
    startRaf();
    tryPlayVideo(v);
  }

  v.addEventListener("loadedmetadata", onLoadedMetadata, {
    signal: ac.signal,
  });
  v.addEventListener(
    "ended",
    () => {
      lastViz = null;
      lastT = 0;
      prevModes = null;
      if (Number.isFinite(v.duration) && v.duration > 0) {
        videoDuration = v.duration;
      }
      const t = 0;
      const viz = computeProjetsTitleLoopViz(t, videoDuration);
      prevModes = applyProjetsTitleLoopViz(viz, items, prevModes);
      lastViz = viz;
    },
    { signal: ac.signal },
  );

  tryPlayVideo(v);

  if (v.readyState >= 2 && Number.isFinite(v.duration) && v.duration > 0) {
    videoDuration = v.duration;
    onLoadedMetadata();
  }

  projetsTitleLoopBackupCleanup = () => {
    ac.abort();
    stopRaf();
    prevModes = null;
    for (const el of items) {
      el.removeAttribute("style");
      el.classList.remove("active", "leaving");
    }
  };
}
