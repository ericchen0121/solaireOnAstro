import type Lenis from "lenis";

export function getLenis(): Lenis | null {
  return (window as any).lenis || null;
}

export function onLenisReady(cb: (lenis: Lenis) => void): void {
  if ((window as any).lenis) {
    cb((window as any).lenis);
  } else {
    const interval = setInterval(() => {
      if ((window as any).lenis) {
        clearInterval(interval);
        cb((window as any).lenis);
      }
    }, 50);
  }
}
