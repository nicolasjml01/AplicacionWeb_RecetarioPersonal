import type { CalendarEntryDto, CalendarRangeDto } from "../../types/calendar";
import { DayRecipePreviews } from "./DayRecipePreviews";
import { collectDayEntries } from "./collectDayEntries";
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
          const dowIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
          const entries = collectDayEntries(dayData);

          return (
            <WeekDayColumn
              key={iso}
              iso={iso}
              dowLabel={WEEKDAY_LABELS[dowIndex]}
              dayNum={d.getDate()}
              isToday={isToday}
              entries={entries}
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
  entries,
  onSelectDay,
}: {
  iso: string;
  dowLabel: string;
  dayNum: number;
  isToday: boolean;
  entries: CalendarEntryDto[];
  onSelectDay: (iso: string) => void;
}) {
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
        {entries.length === 0 ? (
          <div className="cal-week-column__empty" aria-hidden>
            <span className="cal-week-column__add-icon">+</span>
          </div>
        ) : (
          <DayRecipePreviews entries={entries} />
        )}
      </div>
    </button>
  );
}
