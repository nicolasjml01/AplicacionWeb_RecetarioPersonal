import { useEffect, useMemo, useRef, useState } from "react";
import { RecipeMiniTilePreview } from "../recipe/RecipeMiniTile";
import type { MealBlockDto } from "../../types/calendar";
import { selectWeekPreviewEntries, countDayEntries } from "../../utils/selectWeekPreviewEntries";

const TILE_MIN_PX = 68;
const TILE_GAP_PX = 5;

type Props = {
  mealBlocks: MealBlockDto[];
};

/** Week row: fills horizontal space with a balanced sample per meal type. */
export function WeekDayRecipePreviews({ mealBlocks }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = useState(4);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      const cols = Math.max(1, Math.floor((width + TILE_GAP_PX) / (TILE_MIN_PX + TILE_GAP_PX)));
      setCapacity(cols);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = useMemo(
    () => selectWeekPreviewEntries(mealBlocks, capacity),
    [mealBlocks, capacity],
  );
  const total = countDayEntries(mealBlocks);
  const hiddenCount = total - visible.length;

  return (
    <div
      ref={bodyRef}
      className="cal-day-previews cal-day-previews--week"
      style={{ gridTemplateColumns: `repeat(${capacity}, minmax(0, 1fr))` }}
    >
      {visible.map((entry) => (
        <RecipeMiniTilePreview
          key={entry.calendarEntryId}
          title={entry.recipeTitle}
          coverImageUrl={entry.coverImageUrl}
          layout="month"
        />
      ))}
      {hiddenCount > 0 && <span className="cal-day-previews__more">+{hiddenCount}</span>}
    </div>
  );
}
