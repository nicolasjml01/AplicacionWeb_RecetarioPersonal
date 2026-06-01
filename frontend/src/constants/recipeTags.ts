/** Default recipe tag when a recipe has no tags assigned. */
export const DEFAULT_RECIPE_TAG = "Sin etiqueta";

export function isDefaultRecipeTag(name: string): boolean {
  return name.trim().toLowerCase() === DEFAULT_RECIPE_TAG.toLowerCase();
}
