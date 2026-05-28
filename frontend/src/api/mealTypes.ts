import type {
  CreateMealTypeRequest,
  DeleteMealTypeResponse,
  MealTypeDto,
  UpdateMealTypeRequest,
} from "../types/calendar";

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

export async function getMealTypes(userId: number): Promise<MealTypeDto[]> {
  const res = await apiFetch(`/api/users/${userId}/meal-types`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as MealTypeDto[];
}

export async function searchMealTypes(userId: number, q?: string): Promise<MealTypeDto[]> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  const res = await apiFetch(
    `/api/users/${userId}/meal-types/search${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as MealTypeDto[];
}

export async function createMealType(
  userId: number,
  payload: CreateMealTypeRequest,
): Promise<MealTypeDto> {
  const res = await apiFetch(`/api/users/${userId}/meal-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as MealTypeDto;
}

export async function updateMealType(
  userId: number,
  mealTypeId: number,
  payload: UpdateMealTypeRequest,
): Promise<MealTypeDto> {
  const res = await apiFetch(`/api/users/${userId}/meal-types/${mealTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as MealTypeDto;
}

export async function deleteMealType(
  userId: number,
  mealTypeId: number,
): Promise<DeleteMealTypeResponse> {
  const res = await apiFetch(`/api/users/${userId}/meal-types/${mealTypeId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as DeleteMealTypeResponse;
}
