import type {
  CreateShoppingListItemRequest,
  IngredientCategoryCatalogDto,
  IngredientDto,
  ShoppingListItemDto,
  UpdateShoppingListItemRequest,
  UnitOfMeasureDto,
} from "../types/shopping";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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

  const res = await fetch(
    `${API_BASE}/api/users/${userId}/ingredients?search=${encodeURIComponent(q)}`,
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as IngredientDto[];
}

export async function getUnits(): Promise<UnitOfMeasureDto[]> {
  const res = await fetch(`${API_BASE}/api/units-of-measure`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as UnitOfMeasureDto[];
}

export async function getShoppingList(
  userId: number,
): Promise<ShoppingListItemDto[]> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/shopping-list`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as ShoppingListItemDto[];
}

export async function addShoppingItem(
  userId: number,
  payload: CreateShoppingListItemRequest,
): Promise<ShoppingListItemDto> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/shopping-list`, {
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
  const res = await fetch(
    `${API_BASE}/api/users/${userId}/shopping-list/${itemId}`,
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
  const res = await fetch(
    `${API_BASE}/api/users/${userId}/ingredients/catalog`,
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as IngredientCategoryCatalogDto[];
}
