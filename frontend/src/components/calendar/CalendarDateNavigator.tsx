import type { CalendarViewMode } from "../../types/calendar";
import {
  endOfWeekSunday,
  formatDayTitle,
  formatMonthYear,
  formatRangeLabel,
  isoFromParts,
  MONTH_NAMES,
  daysInMonth,
  parseIsoDate,
  startOfWeekMonday,
  toIsoDate,
  todayIso,
  yearOptions,
} from "../../utils/calendarDates";

type Props = {
  viewMode: CalendarViewMode;
  selectedIso: string;
  onSelectIso: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

export function CalendarDateNavigator({
  viewMode,
  selectedIso,
  onSelectIso,
  onPrev,
  onNext,
}: Props) {
  const date = parseIsoDate(selectedIso);
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const isToday = selectedIso === todayIso();

  const weekMonday = startOfWeekMonday(date);
  const weekSunday = endOfWeekSunday(weekMonday);

  const maxDay = daysInMonth(year, monthIndex);
  const years = yearOptions(year, 6);

  const setParts = (y: number, m: number, d: number) => {
    onSelectIso(isoFromParts(y, m, d));
  };

  const title =
    viewMode === "day"
      ? formatDayTitle(date)
      : viewMode === "week"
        ? formatRangeLabel(weekMonday, weekSunday)
        : formatMonthYear(date);

  return (
    <div className="cal-date-nav">
      <div className="cal-date-nav__center">
      <p className="cal-date-nav__title">
        {title}
        {isToday && viewMode === "day" && (
          <span className="cal-date-nav__today-badge">Hoy</span>
        )}
      </p>

      <div className="cal-date-nav__controls">
        <button type="button" className="cal-date-nav__arrow" onClick={onPrev} aria-label="Anterior">
          ‹
        </button>

        <div className="cal-date-nav__pickers">
          {viewMode === "day" && (
            <>
              <select
                className="cal-date-nav__select cal-date-nav__select--day"
                value={day}
                aria-label="Día"
                onChange={(e) => setParts(year, monthIndex, Number(e.target.value))}
              >
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                className="cal-date-nav__select cal-date-nav__select--month"
                value={monthIndex}
                aria-label="Mes"
                onChange={(e) => setParts(year, Number(e.target.value), day)}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="cal-date-nav__select cal-date-nav__select--year"
                value={year}
                aria-label="Año"
                onChange={(e) => setParts(Number(e.target.value), monthIndex, day)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}

          {viewMode === "week" && (
            <>
              <select
                className="cal-date-nav__select cal-date-nav__select--month"
                value={monthIndex}
                aria-label="Mes"
                onChange={(e) => {
                  const m = Number(e.target.value);
                  onSelectIso(toIsoDate(new Date(year, m, Math.min(day, daysInMonth(year, m)))));
                }}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="cal-date-nav__select cal-date-nav__select--year"
                value={year}
                aria-label="Año"
                onChange={(e) => {
                  const y = Number(e.target.value);
                  onSelectIso(
                    toIsoDate(new Date(y, monthIndex, Math.min(day, daysInMonth(y, monthIndex)))),
                  );
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}

          {viewMode === "month" && (
            <>
              <select
                className="cal-date-nav__select cal-date-nav__select--month"
                value={monthIndex}
                aria-label="Mes"
                onChange={(e) => setParts(year, Number(e.target.value), 1)}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="cal-date-nav__select cal-date-nav__select--year"
                value={year}
                aria-label="Año"
                onChange={(e) => setParts(Number(e.target.value), monthIndex, 1)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <button type="button" className="cal-date-nav__arrow" onClick={onNext} aria-label="Siguiente">
          ›
        </button>
      </div>
      </div>
    </div>
  );
}
