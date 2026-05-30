import { RecipeMiniTilePreview } from "../recipe/RecipeMiniTile";
import type { CalendarEntryDto } from "../../types/calendar";
import { MONTH_RECIPE_LIMIT } from "./calendarPreviewLimits";

type Props = {
  entries: CalendarEntryDto[];
  limit?: number;
};

/** Small image-only tiles (month + week day cells). */
export function DayRecipePreviews({ entries, limit = MONTH_RECIPE_LIMIT }: Props) {
  const visible = entries.slice(0, limit);
  const hiddenCount = entries.length - visible.length;

  return (
    <div className="cal-day-previews">
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
