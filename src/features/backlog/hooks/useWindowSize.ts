import { useEffect, useState } from "react";

const RESIZE_THROTTLE_MS = 100;

export function useWindowSize() {
  const [width, setWidth] = useState(globalThis.innerWidth);

  useEffect(() => {
    let resizeTimer: number | null = null;
    let nextWidth = globalThis.innerWidth;

    const flushWidth = () => {
      resizeTimer = null;
      setWidth(nextWidth);
    };

    const handler = () => {
      nextWidth = globalThis.innerWidth;
      if (resizeTimer !== null) return;
      resizeTimer = globalThis.setTimeout(flushWidth, RESIZE_THROTTLE_MS);
    };

    globalThis.addEventListener("resize", handler);
    return () => {
      globalThis.removeEventListener("resize", handler);
      if (resizeTimer !== null) {
        globalThis.clearTimeout(resizeTimer);
      }
    };
  }, []);

  return width;
}
