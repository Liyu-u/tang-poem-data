export type JournalDay = { date: string; count: number | undefined; week: number; weekday: number };

/** UTC avoids daylight-saving offsets; missing dates are unknown, never zero. */
export function getJournalDays(year: number, counts: Record<string, number>): JournalDay[] {
  const start = Date.UTC(year, 0, 1);
  const firstWeekday = (new Date(start).getUTCDay() + 6) % 7;
  const length = (Date.UTC(year + 1, 0, 1) - start) / 86400000;
  return Array.from({ length }, (_, index) => {
    const date = new Date(start + index * 86400000).toISOString().slice(0, 10);
    return { date, count: counts[date], week: Math.floor((index + firstWeekday) / 7), weekday: (index + firstWeekday) % 7 };
  });
}
