import type { IngredientCategoryCatalogDto } from "../types/shopping";

export type IngredientCategoryOption = {
  categoryId: number;
  categoryName: string;
};

/** Excludes virtual buckets like "Recientes" ({@code categoryId === -999}). */
export function ingredientCategoriesForSelect(
  catalog: IngredientCategoryCatalogDto[],
): IngredientCategoryOption[] {
  return catalog
    .filter((c) => c.categoryId >= 0 && c.categoryId !== -999)
    .map((c) => ({ categoryId: c.categoryId, categoryName: c.categoryName }))
    .sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName, "es", { sensitivity: "base" }),
    );
}

/** Prefer "Propios" when present; otherwise first catalog category. */
export function defaultIngredientCategoryId(
  options: IngredientCategoryOption[],
): number | null {
  const propios = options.find((o) =>
    /^(propios|propio|own)$/i.test(o.categoryName.trim()),
  );
  return propios?.categoryId ?? options[0]?.categoryId ?? null;
}
