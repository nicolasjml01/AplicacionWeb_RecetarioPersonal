import type { CalendarRangeDto } from "../../types/calendar";
import { DayRecipePreviews } from "./DayRecipePreviews";
import { collectDayEntries } from "./collectDayEntries";
import { monthGridCells, toIsoDate, WEEKDAY_LABELS } from "../../utils/calendarDates";

type Props = {
  range: CalendarRangeDto | null;
  monthAnchor: Date;
  loading: boolean;
  selectedIso: string;
  onSelectDay: (isoDate: string) => void;
};

export function CalendarMonthView({ range, monthAnchor, loading, selectedIso, onSelectDay }: Props) {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const cells = monthGridCells(year, month);
  const todayIso = toIsoDate(new Date());
  const dayMap = new Map(range?.days.map((d) => [d.date, d]) ?? []);

  if (loading) {
    return <p className="cal-hint">Cargando mes…</p>;
  }

  return (
    <div className="cal-month">
      <div className="cal-month__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="cal-month__weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="cal-month__grid" role="list">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`pad-${idx}`} className="cal-month__cell cal-month__cell--pad" />;
          }
          const iso = toIsoDate(cell);
          const entries = collectDayEntries(dayMap.get(iso));
          const isToday = iso === todayIso;
          const isSelected = iso === selectedIso;

          return (
            <button
              key={iso}
              type="button"
              className={[
                "cal-month__cell",
                isToday ? "cal-month__cell--today" : "",
                isSelected ? "cal-month__cell--selected" : "",
                entries.length > 0 ? "cal-month__cell--has-plan" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="listitem"
              aria-label={`Ver día ${cell.getDate()}`}
              onClick={() => onSelectDay(iso)}
            >
              <span className="cal-month__day-num">{cell.getDate()}</span>
              {entries.length === 0 ? (
                <span className="cal-month__add-icon" aria-hidden>
                  +
                </span>
              ) : (
                <DayRecipePreviews entries={entries} />
              )}
            </button>
          );
        })}
      </div>
      <p className="cal-month-hint cal-hint">Pulsa un día para ver el detalle y editar el menú.</p>
    </div>
  );
}
