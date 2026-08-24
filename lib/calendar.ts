export const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

/** Column headings, Saturday-first as the working week runs here. */
export const WEEKDAYS = [
  "السبت",
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
] as const;

/**
 * Local calendar date as `YYYY-MM-DD`.
 *
 * Everything the calendar compares travels as this string rather than a Date:
 * the server and the browser can sit in different time zones, and an ISO
 * timestamp round-tripped through either end can land on the wrong day. A plain
 * date string has no such trap.
 */
export function ymd(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Index of a date in a Saturday-first week: Sat→0, Sun→1, … Fri→6. */
function saturdayFirstIndex(date: Date): number {
  return (date.getDay() + 1) % 7;
}

export type MonthGrid = {
  year: number;
  month: number;
  label: string;
  /** 42 slots (6 rows); leading and trailing slots outside the month are null. */
  cells: (string | null)[];
};

export function buildMonthGrid(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = saturdayFirstIndex(first);

  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(ymd(new Date(year, month, d)));
  }
  while (cells.length < 42) cells.push(null);

  return { year, month, label: `${AR_MONTHS[month]} ${year}`, cells };
}

/** "١٢ سبتمبر" — the short form the tables and cards print. */
export function formatShortDate(day: string | null): string {
  if (!day) return "بلا تاريخ";
  const [, m, d] = day.split("-").map(Number);
  return `${d} ${AR_MONTHS[m - 1]}`;
}

/** "٢٤ أغسطس · الأحد" — the calendar side-panel heading. */
export function formatDayTitle(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const weekday = WEEKDAYS[saturdayFirstIndex(new Date(y, m - 1, d))];
  return `${d} ${AR_MONTHS[m - 1]} · ${weekday}`;
}
