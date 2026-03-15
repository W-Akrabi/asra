import { useEffect, useRef } from "react";

/**
 * Custom hook to automatically scroll to the bottom of a container
 * when new items are added
 */
export function useAutoScroll<T extends HTMLElement>(
  dependency: any[],
  enabled: boolean = true
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (enabled && ref.current) {
      // Scroll to bottom with smooth behavior
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [dependency, enabled]);

  return ref;
}
