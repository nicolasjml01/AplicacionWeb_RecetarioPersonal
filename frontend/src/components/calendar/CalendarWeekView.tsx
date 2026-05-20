import { RecipeMiniTilePreview } from "../recipe/RecipeMiniTile";
import type { CalendarRangeDto, MealBlockDto } from "../../types/calendar";
import { toIsoDate, WEEKDAY_LABELS, weekdayDates } from "../../utils/calendarDates";
import { WEEK_MEAL_LIMIT } from "./calendarPreviewLimits";

type Props = {
  range: CalendarRangeDto | null;
  weekMonday: Date;
  loading: boolean;
  onSelectDay: (isoDate: string) => void;
};

export function CalendarWeekView({ range, weekMonday, loading, onSelectDay }: Props) {
  const days = weekdayDates(weekMonday);
  const dayMap = new Map(range?.days.map((d) => [d.date, d]) ?? []);

  if (loading) {
    return <p className="cal-hint">Cargando semana…</p>;
  }

  return (
    <div className="cal-week-wrap">
      <div className="cal-week-grid" role="list">
        {days.map((d) => {
          const iso = toIsoDate(d);
          const isToday = iso === toIsoDate(new Date());
          const dayData = dayMap.get(iso);
          const blocks = [...(dayData?.mealBlocks ?? [])].sort(
            (a, b) => a.mealSortOrder - b.mealSortOrder,
          );
          const dowIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;

          return (
            <WeekDayColumn
              key={iso}
              iso={iso}
              dowLabel={WEEKDAY_LABELS[dowIndex]}
              dayNum={d.getDate()}
              isToday={isToday}
              blocks={blocks}
              maxMealBlocks={WEEK_MEAL_LIMIT}
              onSelectDay={onSelectDay}
            />
          );
        })}
      </div>
      <p className="cal-week-hint cal-hint">Pulsa un día para ver el detalle y editar el menú.</p>
    </div>
  );
}

function WeekDayColumn({
  iso,
  dowLabel,
  dayNum,
  isToday,
  blocks,
  maxMealBlocks,
  onSelectDay,
}: {
  iso: string;
  dowLabel: string;
  dayNum: number;
  isToday: boolean;
  blocks: MealBlockDto[];
  maxMealBlocks: number;
  onSelectDay: (iso: string) => void;
}) {
  const visibleBlocks = blocks.slice(0, maxMealBlocks);
  const hiddenBlockCount = Math.max(0, blocks.length - visibleBlocks.length);

  return (
    <button
      type="button"
      className={["cal-week-column", isToday ? "cal-week-column--today" : ""].filter(Boolean).join(" ")}
      role="listitem"
      aria-label={`Ver día ${dowLabel} ${dayNum}`}
      onClick={() => onSelectDay(iso)}
    >
      <header className="cal-week-column__head">
        <span className="cal-week-column__dow">{dowLabel}</span>
        <span className="cal-week-column__num">{dayNum}</span>
      </header>

      <div className="cal-week-column__body">
        {blocks.length === 0 ? (
          <div className="cal-week-column__empty" aria-hidden>
            <span className="cal-week-column__add-icon">+</span>
          </div>
        ) : (
          <>
            {visibleBlocks.map((block) => (
              <WeekMealPreview key={block.mealType.mealTypeId} block={block} />
            ))}
            {hiddenBlockCount > 0 && (
              <p className="cal-week-column__more">
                +{hiddenBlockCount} {hiddenBlockCount === 1 ? "comida más" : "comidas más"}
              </p>
            )}
          </>
        )}
      </div>
    </button>
  );
}

function WeekMealPreview({ block }: { block: MealBlockDto }) {
  const entries = [...block.entries].sort((a, b) => a.recipeSortOrder - b.recipeSortOrder);
  const first = entries[0];
  const extraRecipes = entries.length - 1;

  if (!first) return null;

  return (
    <section className="cal-week-meal-block" aria-label={block.mealType.name}>
      <h4 className="cal-week-meal-block__label">{block.mealType.name}</h4>
      <div className="cal-week-meal-block__tile">
        <RecipeMiniTilePreview
          title={first.recipeTitle}
          coverImageUrl={first.coverImageUrl}
          layout="week"
          moreLabel={extraRecipes > 0 ? `+${extraRecipes}` : undefined}
        />
      </div>
    </section>
  );
}
