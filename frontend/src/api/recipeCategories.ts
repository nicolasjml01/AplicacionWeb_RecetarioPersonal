import type { RecipeCategoryDto } from "../types/recipes";

import { apiFetch } from "./http";

export async function getRecipeCategories(userId: number): Promise<RecipeCategoryDto[]> {
  const res = await apiFetch(`/api/users/${userId}/recipe-categories`);
  if (!res.ok) throw new Error("No se pudieron cargar las etiquetas.");
  return res.json() as Promise<RecipeCategoryDto[]>;
}

export async function createRecipeCategory(userId: number, name: string): Promise<RecipeCategoryDto> {
  const res = await apiFetch(`/api/users/${userId}/recipe-categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    let message = "No se pudo crear la etiqueta.";
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

export async function updateRecipeCategory(
  userId: number,
  categoryId: number,
  name: string
): Promise<RecipeCategoryDto> {
  const res = await apiFetch(`/api/users/${userId}/recipe-categories/${categoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    let message = "No se pudo actualizar la etiqueta.";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  return res.json() as Promise<RecipeCategoryDto>;
}

export async function deleteRecipeCategory(userId: number, categoryId: number): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}/recipe-categories/${categoryId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    let message = "No se pudo eliminar la etiqueta.";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }
}