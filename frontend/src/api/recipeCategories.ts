import type { RecipeCategoryDto } from "../types/recipes";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export async function getRecipeCategories(userId: number): Promise<RecipeCategoryDto[]> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/recipe-categories`);
  if (!res.ok) throw new Error("No se pudieron cargar las categorías.");
  return res.json() as Promise<RecipeCategoryDto[]>;
}

export async function createRecipeCategory(userId: number, name: string): Promise<RecipeCategoryDto> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/recipe-categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    let message = "No se pudo crear la categoría.";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep the default fallback message if error body is not JSON.
    }
    throw new Error(message);
  }

  return res.json() as Promise<RecipeCategoryDto>;
}