import { resolveMediaUrl } from "./mediaUrl";

export const INGREDIENT_IMAGE_PLACEHOLDER = "/logoShoppingList.png";

export function ingredientImageSrc(imageUrl?: string | null): string {
  const trimmed = imageUrl?.trim();
  if (trimmed) return resolveMediaUrl(trimmed);
  return INGREDIENT_IMAGE_PLACEHOLDER;
}
