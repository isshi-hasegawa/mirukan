import { useEffect, useState } from "react";

const RESIZE_THROTTLE_MS = 100;

export function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    let resizeTimer: number | null = null;
    let nextWidth = window.innerWidth;

    const flushWidth = () => {
      resizeTimer = null;
      setWidth(nextWidth);
    };

    const handler = () => {
      nextWidth = window.innerWidth;
      if (resizeTimer !== null) return;
      resizeTimer = window.setTimeout(flushWidth, RESIZE_THROTTLE_MS);
    };

    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }
    };
  }, []);

  return width;
}
