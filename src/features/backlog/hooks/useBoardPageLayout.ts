import { useWindowSize } from "./useWindowSize.ts";

export function useBoardPageLayout() {
  const windowWidth = useWindowSize();

  return {
    isMobileLayout: windowWidth <= 720,
  };
}
