import type { RecipeMediaDto } from "../types/recipes";

import { apiFetch } from "./http";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (body.message) return body.message;
  } catch {
    // ignore
  }
  return `Error (${res.status})`;
}

export async function uploadRecipeMedia(
  userId: number,
  recipeId: number,
  file: File,
  stepId?: number
): Promise<RecipeMediaDto> {
  const fd = new FormData();
  fd.append("file", file);
  const qs = stepId != null ? `?stepId=${encodeURIComponent(String(stepId))}` : "";
  const url = `/api/users/${userId}/recipes/${recipeId}/media${qs}`;
  const res = await apiFetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeMediaDto>;
}

export async function deleteRecipeMedia(
  userId: number,
  recipeId: number,
  mediaId: number
): Promise<void> {
  const url = `/api/users/${userId}/recipes/${recipeId}/media/items/${mediaId}`;
  const res = await apiFetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

// Replaces the file of an existing media item (used by the in-app editor on
// re-edit). Keeps mediaId, step and displayOrder server-side.
export async function replaceRecipeMediaContent(
  userId: number,
  recipeId: number,
  mediaId: number,
  file: File
): Promise<RecipeMediaDto> {
  const fd = new FormData();
  fd.append("file", file);
  const url = `/api/users/${userId}/recipes/${recipeId}/media/items/${mediaId}/content`;
  const res = await apiFetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeMediaDto>;
}

export type ImportRecipeMediaFromUrlsResponse = {
  media: RecipeMediaDto[];
  warnings: string[];
};

export async function importRecipeMediaFromUrls(
  userId: number,
  recipeId: number,
  urls: string[],
): Promise<ImportRecipeMediaFromUrlsResponse> {
  const url = `/api/users/${userId}/recipes/${recipeId}/media/import-from-urls`;
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<ImportRecipeMediaFromUrlsResponse>;
}

export async function reorderRecipeMedia(
  userId: number,
  recipeId: number,
  mediaIdsInOrder: number[],
  stepId?: number
): Promise<void> {
  const qs = stepId != null ? `?stepId=${encodeURIComponent(String(stepId))}` : "";
  const url = `/api/users/${userId}/recipes/${recipeId}/media/items/order${qs}`;
  const res = await apiFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaIdsInOrder }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}
