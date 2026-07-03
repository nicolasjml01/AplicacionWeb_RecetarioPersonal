import { useEffect } from "react";
import {
  preloadIngredientImages,
  type PreloadPriority,
} from "../utils/preloadImages";

/** Preloads ingredient image URLs when the list changes (stable dedupe inside preloadImages). */
export function usePreloadImages(
  urls: (string | null | undefined)[],
  priority: PreloadPriority = "normal",
): void {
  const key = urls
    .map((url) => url?.trim() ?? "")
    .filter(Boolean)
    .sort()
    .join("\0");

  useEffect(() => {
    if (!key) return;
    preloadIngredientImages(key.split("\0"), priority);
  }, [key, priority]);
}
