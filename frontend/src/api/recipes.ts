import type { RecipeDto, RecipeStepDto } from "../types/recipes";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (body.message) return body.message;
  } catch {
    // ignore
  }
  return `Error (${res.status})`;
}

export type GetRecipesOptions = {
  categoryId?: number;
  recipeSearch?: string;
  categorySearch?: string;
  /** Solo borradores (excluye filtros de categoría en el servidor). */
  draftsOnly?: boolean;
};

export type CreateRecipePayload = {
  title: string;
  /** null or empty → backend assigns "Sin categoría". */
  categoryIds: number[] | null;
  /** Si es true, la receta no aparece en home/categorías hasta publicar. */
  draft?: boolean;
};

export type CreateRecipeStepPayload = {
  stepNumber: number;
  content: string;
};

export type PatchRecipePayload = {
  title?: string;
  categoryIds?: number[] | null;
};

export type PatchRecipeStepPayload = {
  stepNumber?: number;
  content?: string;
};

export async function getRecipes(
  userId: number,
  options?: GetRecipesOptions
): Promise<RecipeDto[]> {
  const params = new URLSearchParams();
  if (options?.draftsOnly) params.set("draftsOnly", "true");
  if (options?.categoryId != null) {
    params.set("categoryId", String(options.categoryId));
  }
  const q = options?.recipeSearch?.trim();
  if (q) params.set("recipeSearch", q);
  const cs = options?.categorySearch?.trim();
  if (cs) params.set("categorySearch", cs);

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

export async function createRecipe(
  userId: number,
  payload: CreateRecipePayload
): Promise<RecipeDto> {
  const url = `${API_BASE}/api/users/${userId}/recipes`;
  const body: Record<string, unknown> = {
    title: payload.title.trim(),
    categoryIds:
      payload.categoryIds != null && payload.categoryIds.length > 0
        ? payload.categoryIds
        : null,
  };
  if (payload.draft === true) body.draft = true;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeDto>;
}

export async function patchRecipe(
  userId: number,
  recipeId: number,
  payload: PatchRecipePayload
): Promise<RecipeDto> {
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeDto>;
}

export async function publishRecipe(userId: number, recipeId: number): Promise<RecipeDto> {
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}/publish`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeDto>;
}

export async function addRecipeStep(
  userId: number,
  recipeId: number,
  payload: CreateRecipeStepPayload
): Promise<RecipeStepDto> {
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}/steps`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stepNumber: payload.stepNumber,
      content: payload.content.trim(),
    }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeStepDto>;
}

export async function patchRecipeStep(
  userId: number,
  recipeId: number,
  stepId: number,
  payload: PatchRecipeStepPayload
): Promise<RecipeStepDto> {
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}/steps/${stepId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeStepDto>;
}

export async function deleteRecipeStep(
  userId: number,
  recipeId: number,
  stepId: number
): Promise<void> {
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}/steps/${stepId}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}
