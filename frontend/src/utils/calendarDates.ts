/** Local calendar date as YYYY-MM-DD (no timezone shift). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Monday as first day of week (es-ES convention). */
export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + offset);
  return copy;
}

export function endOfWeekSunday(monday: Date): Date {
  const copy = new Date(monday);
  copy.setDate(copy.getDate() + 6);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

const LOCALE = "es-ES";

export function formatDayTitle(d: Date): string {
  const raw = d.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatMonthYear(d: Date): string {
  const raw = d.toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatRangeLabel(from: Date, to: Date): string {
  const sameMonth =
    from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonth) {
    return `${from.getDate()} – ${to.getDate()} ${to.toLocaleDateString(LOCALE, { month: "long", year: "numeric" })}`;
  }
  return `${from.toLocaleDateString(LOCALE, { day: "numeric", month: "short" })} – ${to.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" })}`;
}

export const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;

export function weekdayDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Grid cells for month view: leading blanks + days of month (6 rows max). */
export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function isoFromParts(year: number, monthIndex: number, day: number): string {
  const maxDay = daysInMonth(year, monthIndex);
  const safeDay = Math.min(Math.max(1, day), maxDay);
  return toIsoDate(new Date(year, monthIndex, safeDay));
}

export function yearOptions(anchorYear: number, span = 5): number[] {
  const years: number[] = [];
  for (let y = anchorYear - span; y <= anchorYear + span; y++) {
    years.push(y);
  }
  return years;
}

export function monthGridCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = endOfMonth(first);
  const startPad = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array.from({ length: startPad }, () => null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
