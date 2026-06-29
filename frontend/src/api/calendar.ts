import type {
  AssignCalendarEntryRequest,
  CalendarEntryDto,
  CalendarEntryOrderItemRequest,
  CalendarRangeDto,
  DayPlanDto,
  DayShoppingImportPreviewDto,
  ImportDayShoppingItemRequest,
  ImportDayShoppingListResponse,
  MealOrderItemRequest,
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

export async function getDayPlan(userId: number, date: string): Promise<DayPlanDto> {
  const res = await apiFetch(`/api/users/${userId}/calendar/days/${date}`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as DayPlanDto;
}

export async function getCalendarRange(
  userId: number,
  from: string,
  to: string,
): Promise<CalendarRangeDto> {
  const params = new URLSearchParams({ from, to });
  const res = await apiFetch(`/api/users/${userId}/calendar?${params}`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as CalendarRangeDto;
}

export async function assignCalendarEntry(
  userId: number,
  payload: AssignCalendarEntryRequest,
): Promise<CalendarEntryDto> {
  const res = await apiFetch(`/api/users/${userId}/calendar/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as CalendarEntryDto;
}

export async function removeCalendarEntry(
  userId: number,
  calendarEntryId: number,
): Promise<void> {
  const res = await apiFetch(
    `/api/users/${userId}/calendar/entries/${calendarEntryId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

export async function reorderDayMeals(
  userId: number,
  date: string,
  items: MealOrderItemRequest[],
): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}/calendar/days/${date}/meal-order`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

export async function reorderCalendarEntries(
  userId: number,
  date: string,
  items: CalendarEntryOrderItemRequest[],
): Promise<void> {
  const params = new URLSearchParams({ date });
  const res = await apiFetch(
    `/api/users/${userId}/calendar/entries/reorder?${params}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

export async function dayShoppingImportPreview(
  userId: number,
  date: string,
  calendarEntryIds: number[],
): Promise<DayShoppingImportPreviewDto> {
  const res = await apiFetch(
    `/api/users/${userId}/calendar/days/${date}/shopping-import-preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarEntryIds }),
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as DayShoppingImportPreviewDto;
}

export async function importDayToShoppingList(
  userId: number,
  date: string,
  calendarEntryIds: number[],
  items: ImportDayShoppingItemRequest[],
): Promise<ImportDayShoppingListResponse> {
  const res = await apiFetch(
    `/api/users/${userId}/calendar/days/${date}/import-to-shopping-list`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarEntryIds, items }),
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as ImportDayShoppingListResponse;
}
