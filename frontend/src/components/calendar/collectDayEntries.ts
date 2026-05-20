import type { CalendarRangeDayDto, CalendarEntryDto } from "../../types/calendar";

/** All planned recipes for a day, in meal order then recipe order. */
export function collectDayEntries(day: CalendarRangeDayDto | undefined): CalendarEntryDto[] {
  if (!day) return [];
  const blocks = [...day.mealBlocks].sort((a, b) => a.mealSortOrder - b.mealSortOrder);
  const out: CalendarEntryDto[] = [];
  for (const block of blocks) {
    const entries = [...block.entries].sort((a, b) => a.recipeSortOrder - b.recipeSortOrder);
    out.push(...entries);
  }
  return out;
}
