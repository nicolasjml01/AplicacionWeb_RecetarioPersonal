import type {
  CreateShoppingListItemRequest,
  DeleteOwnedIngredientResponse,
  IngredientCategoryCatalogDto,
  IngredientDto,
  ShoppingListItemDto,
  UpdateOwnedIngredientRequest,
  UpdateShoppingListItemRequest,
  UnitOfMeasureDto,
} from "../types/shopping";

import { apiFetch } from "./http";

function readErrorMessage(res: Response): Promise<string> {
  return res
    .json()
    .then((body: unknown) => {
      const maybe = body as { message?: string };
      return maybe.message ?? `Request failed with status ${res.status}`;
    })
    .catch(() => `Request failed with status ${res.status}`);
}

export async function searchIngredients(
  userId: number,
  query: string,
): Promise<IngredientDto[]> {
  const q = query.trim();
  if (!q) return [];

  const res = await apiFetch(
    `/api/users/${userId}/ingredients?search=${encodeURIComponent(q)}`,
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as IngredientDto[];
}

export async function getUnits(): Promise<UnitOfMeasureDto[]> {
  const res = await apiFetch(`/api/units-of-measure`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as UnitOfMeasureDto[];
}

export async function getShoppingList(
  userId: number,
): Promise<ShoppingListItemDto[]> {
  const res = await apiFetch(`/api/users/${userId}/shopping-list`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as ShoppingListItemDto[];
}

export async function addShoppingItem(
  userId: number,
  payload: CreateShoppingListItemRequest,
): Promise<ShoppingListItemDto> {
  const res = await apiFetch(`/api/users/${userId}/shopping-list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as ShoppingListItemDto;
}

export async function patchShoppingItem(
  userId: number,
  itemId: number,
  payload: UpdateShoppingListItemRequest,
): Promise<ShoppingListItemDto | null> {
  const res = await apiFetch(
    `/api/users/${userId}/shopping-list/${itemId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  // Backend deletes the item when bought=true and returns 204.
  if (res.status === 204) return null;

  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as ShoppingListItemDto;
}

export async function getIngredientsCatalog(
  userId: number,
): Promise<IngredientCategoryCatalogDto[]> {
  const res = await apiFetch(
    `/api/users/${userId}/ingredients/catalog`,
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as IngredientCategoryCatalogDto[];
}

/** User-created ingredients only (any category), sorted by name. */
export async function getOwnedIngredients(
  userId: number,
): Promise<IngredientDto[]> {
  const res = await apiFetch(`/api/users/${userId}/ingredients/owned`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as IngredientDto[];
}

export async function patchOwnedIngredient(
  userId: number,
  ingredientId: number,
  payload: UpdateOwnedIngredientRequest,
): Promise<IngredientDto> {
  const res = await apiFetch(
    `/api/users/${userId}/ingredients/${ingredientId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as IngredientDto;
}

export async function deleteOwnedIngredient(
  userId: number,
  ingredientId: number,
): Promise<DeleteOwnedIngredientResponse> {
  const res = await apiFetch(
    `/api/users/${userId}/ingredients/${ingredientId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as DeleteOwnedIngredientResponse;
}

export async function uploadOwnedIngredientImage(
  userId: number,
  ingredientId: number,
  file: File,
): Promise<IngredientDto> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(
    `/api/users/${userId}/ingredients/${ingredientId}/image`,
    { method: "POST", body: fd },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as IngredientDto;
}
