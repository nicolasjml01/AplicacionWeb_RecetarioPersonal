import { useEffect } from "react";
import { getCurrentUserId } from "../../auth/session";
import { getIngredientsCatalog, getShoppingList } from "../../api/shopping";
import {
  collectCatalogImageUrls,
  collectIngredientImageUrls,
  preloadImages,
} from "../../utils/preloadImages";

/**
 * Warms the browser cache with all catalog + shopping-list ingredient photos
 * as soon as the user enters the authenticated shell.
 */
export function IngredientCatalogPreloader() {
  const userId = getCurrentUserId();

  useEffect(() => {
    if (userId == null) return;

    let cancelled = false;
    void (async () => {
      try {
        const [catalog, list] = await Promise.all([
          getIngredientsCatalog(userId),
          getShoppingList(userId),
        ]);
        if (cancelled) return;
        preloadImages([
          ...collectCatalogImageUrls(catalog),
          ...collectIngredientImageUrls(list.map((item) => item.ingredient)),
        ]);
      } catch {
        // Pages fetch their own data; preload is best-effort.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
