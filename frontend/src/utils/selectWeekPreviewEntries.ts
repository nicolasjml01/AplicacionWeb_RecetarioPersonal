import type { CalendarEntryDto, MealBlockDto } from "../types/calendar";

function sortedMealBlocks(mealBlocks: MealBlockDto[]): MealBlockDto[] {
  return [...mealBlocks]
    .sort((a, b) => a.mealSortOrder - b.mealSortOrder)
    .map((block) => ({
      ...block,
      entries: [...block.entries].sort((a, b) => a.recipeSortOrder - b.recipeSortOrder),
    }))
    .filter((block) => block.entries.length > 0);
}

/**
 * Picks up to `limit` recipes for the week row preview: proportional share per meal type
 * (largest remainder), preserving meal order then recipe order left-to-right.
 */
export function selectWeekPreviewEntries(
  mealBlocks: MealBlockDto[],
  limit: number,
): CalendarEntryDto[] {
  if (limit <= 0) return [];

  const blocks = sortedMealBlocks(mealBlocks);
  const pools = blocks.map((b) => b.entries);
  const total = pools.reduce((sum, pool) => sum + pool.length, 0);
  if (total <= limit) return pools.flat();

  const counts = pools.map((pool) => pool.length);
  const quotas = counts.map((count) => {
    const exact = (limit * count) / total;
    return { n: Math.floor(exact), frac: exact - Math.floor(exact) };
  });

  let assigned = quotas.reduce((sum, q) => sum + q.n, 0);
  let remainder = limit - assigned;
  const byFrac = quotas
    .map((q, index) => ({ index, frac: q.frac }))
    .sort((a, b) => b.frac - a.frac);
  for (let i = 0; remainder > 0; i++, remainder--) {
    quotas[byFrac[i % byFrac.length].index].n++;
  }

  const out: CalendarEntryDto[] = [];
  for (let i = 0; i < pools.length; i++) {
    out.push(...pools[i].slice(0, quotas[i].n));
  }
  return out;
}

export function countDayEntries(mealBlocks: MealBlockDto[]): number {
  return mealBlocks.reduce((sum, block) => sum + block.entries.length, 0);
}
