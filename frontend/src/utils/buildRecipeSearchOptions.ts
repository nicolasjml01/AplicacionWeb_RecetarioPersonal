import type { GetRecipesOptions } from "../api/recipes";
import type { RecipeCategoryDto } from "../types/recipes";

/** Prefer tag (etiqueta) filter when the query matches a tag name; otherwise search by title. */
export function buildRecipeSearchOptions(
  query: string,
  tags: RecipeCategoryDto[],
): GetRecipesOptions {
  const trimmed = query.trim();
  if (!trimmed) return {};

  const q = trimmed.toLowerCase();
  const tagMatch = tags.some((t) => t.name.toLowerCase().includes(q));
  if (tagMatch) {
    return { categorySearch: trimmed };
  }
  return { recipeSearch: trimmed };
}
