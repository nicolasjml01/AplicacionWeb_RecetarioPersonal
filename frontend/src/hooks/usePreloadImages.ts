import { useEffect } from "react";
import { preloadImages } from "../utils/preloadImages";

/** Preloads ingredient image URLs when the list changes (stable dedupe inside preloadImages). */
export function usePreloadImages(urls: (string | null | undefined)[]): void {
  const key = urls
    .map((url) => url?.trim() ?? "")
    .filter(Boolean)
    .sort()
    .join("\0");

  useEffect(() => {
    if (!key) return;
    preloadImages(key.split("\0"));
  }, [key]);
}
