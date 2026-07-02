import { hasIngredientImage } from "./ingredientImage";
import { resolveMediaUrl } from "./mediaUrl";

const preloaded = new Set<string>();

/** Warm browser cache for ingredient images (deduped per session). */
export function preloadImages(urls: Iterable<string | null | undefined>): void {
  for (const raw of urls) {
    if (!hasIngredientImage(raw)) continue;
    const src = resolveMediaUrl(raw!.trim());
    if (preloaded.has(src)) continue;
    preloaded.add(src);
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function collectIngredientImageUrls(
  items: Iterable<{ imageUrl?: string | null }>,
): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (hasIngredientImage(item.imageUrl)) out.push(item.imageUrl!.trim());
  }
  return out;
}

export function collectCatalogImageUrls(
  catalog: { ingredients: { imageUrl?: string | null }[] }[],
): string[] {
  return catalog.flatMap((category) => collectIngredientImageUrls(category.ingredients));
}

export function collectRecipeIngredientImageUrls(
  rows: { ingredient: { imageUrl?: string | null } }[],
): string[] {
  return collectIngredientImageUrls(rows.map((row) => row.ingredient));
}
