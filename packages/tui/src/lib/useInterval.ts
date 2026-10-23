import { useEffect, useRef } from "react";

/**
 * Runs `callback` every `delayMs` while mounted, and always clears the interval on
 * unmount or when `delayMs` changes to null. Every screen that polls the API
 * (Dashboard, Upgrade) goes through this so cleanup is never a place-by-place concern.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => callbackRef.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
