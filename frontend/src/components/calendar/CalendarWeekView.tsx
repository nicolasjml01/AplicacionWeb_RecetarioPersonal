import type { CalendarRangeDto, MealBlockDto } from "../../types/calendar";
import { WeekDayRecipePreviews } from "./WeekDayRecipePreviews";
import { toIsoDate, WEEKDAY_LABELS, weekdayDates } from "../../utils/calendarDates";

type Props = {
  range: CalendarRangeDto | null;
  weekMonday: Date;
  loading: boolean;
  onSelectDay: (isoDate: string) => void;
};

export function CalendarWeekView({ range, weekMonday, loading, onSelectDay }: Props) {
  const days = weekdayDates(weekMonday);
  const dayMap = new Map(range?.days.map((d) => [d.date, d]) ?? []);

  if (loading && !range) {
    return <p className="cal-hint">Cargando semana…</p>;
  }

  return (
    <div className="cal-week-wrap">
      <div className="cal-week-grid" role="list">
        {days.map((d) => {
          const iso = toIsoDate(d);
          const isToday = iso === toIsoDate(new Date());
          const dayData = dayMap.get(iso);
          const dowIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
          const mealBlocks = dayData?.mealBlocks ?? [];

          return (
            <WeekDayColumn
              key={iso}
              iso={iso}
              dowLabel={WEEKDAY_LABELS[dowIndex]}
              dayNum={d.getDate()}
              isToday={isToday}
              mealBlocks={mealBlocks}
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
  mealBlocks,
  onSelectDay,
}: {
  iso: string;
  dowLabel: string;
  dayNum: number;
  isToday: boolean;
  mealBlocks: MealBlockDto[];
  onSelectDay: (iso: string) => void;
}) {
  const hasEntries = mealBlocks.some((b) => b.entries.length > 0);
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
        {!hasEntries ? (
          <div className="cal-week-column__empty" aria-hidden>
            <span className="cal-week-column__add-icon">+</span>
          </div>
        ) : (
          <WeekDayRecipePreviews mealBlocks={mealBlocks} />
        )}
      </div>
    </button>
  );
}
