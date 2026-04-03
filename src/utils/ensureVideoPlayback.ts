/**
 * iOS Safari and some desktop browsers need muted + playsinline set as properties
 * and an explicit play() for background videos; autoplay alone is unreliable.
 */
export function tryPlayVideo(video: HTMLVideoElement): void {
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  const p = video.play();
  if (p !== undefined) {
    p.catch(() => {
      /* autoplay policy — ignored */
    });
  }
}
