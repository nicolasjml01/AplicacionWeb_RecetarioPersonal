import type { RecipeMediaDto } from "../types/recipes";

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

export async function uploadRecipeMedia(
  userId: number,
  recipeId: number,
  file: File,
  stepId?: number
): Promise<RecipeMediaDto> {
  const fd = new FormData();
  fd.append("file", file);
  const qs = stepId != null ? `?stepId=${encodeURIComponent(String(stepId))}` : "";
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}/media${qs}`;
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeMediaDto>;
}

export async function deleteRecipeMedia(
  userId: number,
  recipeId: number,
  mediaId: number
): Promise<void> {
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}/media/items/${mediaId}`;
  const res = await fetch(url, { method: "DELETE" });
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
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}/media/items/${mediaId}/content`;
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<RecipeMediaDto>;
}

export async function reorderRecipeMedia(
  userId: number,
  recipeId: number,
  mediaIdsInOrder: number[],
  stepId?: number
): Promise<void> {
  const qs = stepId != null ? `?stepId=${encodeURIComponent(String(stepId))}` : "";
  const url = `${API_BASE}/api/users/${userId}/recipes/${recipeId}/media/items/order${qs}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaIdsInOrder }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}
