import type { UnitOfMeasureDto } from "../types/shopping";
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

export async function getUnits(userId: number): Promise<UnitOfMeasureDto[]> {
  const res = await apiFetch(`/api/users/${userId}/units-of-measure`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as UnitOfMeasureDto[];
}

export async function getOwnedUnits(userId: number): Promise<UnitOfMeasureDto[]> {
  const res = await apiFetch(`/api/users/${userId}/units-of-measure/owned`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as UnitOfMeasureDto[];
}

import type {
  DeleteOwnedUnitResponse,
  UpdateOwnedUnitRequest,
} from "../types/shopping";

export async function updateOwnedUnit(
  userId: number,
  unitId: number,
  payload: UpdateOwnedUnitRequest,
): Promise<UnitOfMeasureDto> {
  const res = await apiFetch(`/api/users/${userId}/units-of-measure/${unitId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      symbol: payload.symbol ?? "",
    }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as UnitOfMeasureDto;
}

export async function deleteOwnedUnit(
  userId: number,
  unitId: number,
): Promise<DeleteOwnedUnitResponse> {
  const res = await apiFetch(`/api/users/${userId}/units-of-measure/${unitId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as DeleteOwnedUnitResponse;
}
