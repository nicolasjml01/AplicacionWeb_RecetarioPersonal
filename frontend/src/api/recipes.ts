import type { RecipeDto } from "../types/recipes";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type GetRecipesOptions = {
  categoryId?: number;
  recipeSearch?: string;
};

export async function getRecipes(
  userId: number,
  options?: GetRecipesOptions
): Promise<RecipeDto[]> {
  const params = new URLSearchParams();
  if (options?.categoryId != null) {
    params.set("categoryId", String(options.categoryId));
  }
  const q = options?.recipeSearch?.trim();
  if (q) params.set("recipeSearch", q);

  const qs = params.toString();
  const url = `${API_BASE}/api/users/${userId}/recipes${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudieron cargar las recetas.");
  return res.json() as Promise<RecipeDto[]>;
}

export async function getRecipe(
  userId: number,
  recipeId: number
): Promise<RecipeDto> {
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}`;
  const res = await fetch(url);
  if (res.status === 404) throw new Error("Receta no encontrada.");
  if (!res.ok) throw new Error("No se pudo cargar la receta.");
  return res.json() as Promise<RecipeDto>;
}