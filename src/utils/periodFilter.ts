export type PeriodFilterType = 'all' | 'day' | 'week' | 'month' | 'year';

export const MONTH_OPTIONS = [
  { index: 0, name: 'Enero', short: 'Ene' },
  { index: 1, name: 'Febrero', short: 'Feb' },
  { index: 2, name: 'Marzo', short: 'Mar' },
  { index: 3, name: 'Abril', short: 'Abr' },
  { index: 4, name: 'Mayo', short: 'May' },
  { index: 5, name: 'Junio', short: 'Jun' },
  { index: 6, name: 'Julio', short: 'Jul' },
  { index: 7, name: 'Agosto', short: 'Ago' },
  { index: 8, name: 'Septiembre', short: 'Sep' },
  { index: 9, name: 'Octubre', short: 'Oct' },
  { index: 10, name: 'Noviembre', short: 'Nov' },
  { index: 11, name: 'Diciembre', short: 'Dic' },
] as const;

/**
 * Checks whether a date string falls inside the requested period filter.
 * Day and week use the current local calendar date; month and year use explicit targets.
 */
export function isDateInPeriod(
  dateStr: string,
  period: PeriodFilterType,
  targetMonth: number,
  targetYear: number,
  now = new Date()
): boolean {
  if (period === 'all') return true;
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return false;

  if (period === 'day') {
    return (
      dateObj.getDate() === now.getDate() &&
      dateObj.getMonth() === now.getMonth() &&
      dateObj.getFullYear() === now.getFullYear()
    );
  }

  if (period === 'week') {
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return dateObj >= startOfWeek && dateObj <= endOfToday;
  }

  if (period === 'month') {
    return dateObj.getMonth() === targetMonth && dateObj.getFullYear() === targetYear;
  }

  return dateObj.getFullYear() === targetYear;
}

/**
 * Collects a descending list of selectable years covering the last 5 years plus any record years.
 */
export function getAvailableYears(
  timestamps: Array<string | undefined | null>,
  baseYear = new Date().getFullYear()
): number[] {
  const yearSet = new Set<number>([baseYear, baseYear - 1, baseYear - 2, baseYear - 3, baseYear - 4]);
  timestamps.forEach((ts) => {
    if (!ts) return;
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) {
      yearSet.add(parsed.getFullYear());
    }
  });
  return Array.from(yearSet).sort((a, b) => b - a);
}

/**
 * Returns a human-readable Spanish label describing the active period selection.
 */
export function getPeriodDisplayLabel(
  period: PeriodFilterType,
  selectedMonth: number,
  selectedYear: number
): string {
  if (period === 'all') return 'Histórico Completo';
  if (period === 'day') return 'Hoy';
  if (period === 'week') return 'Últimos 7 días';
  if (period === 'month') {
    const monthName = MONTH_OPTIONS[selectedMonth]?.name || 'Mes';
    return `${monthName} ${selectedYear}`;
  }
  return `Año ${selectedYear}`;
}
