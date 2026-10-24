import { addDays, addMonths, startOfMonth, weekdayIndex } from './dates';

export type ActivityLevel = 0 | 1 | 2 | 3;

export type ActivityCounts = {
  completedSessions: number;
  completedRevisions: number;
  restDay: boolean;
};

/**
 * Activity comes only from completed learning work.
 * Level 0: none. Level 1: one. Level 2: two. Level 3: three or more.
 * Rest days and app opens do not raise the level.
 */
export function activityCount(row: Pick<ActivityCounts, 'completedSessions' | 'completedRevisions'>): number {
  return row.completedSessions + row.completedRevisions;
}

export function activityLevel(count: number): ActivityLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

export type HeatCell = {
  date: string;
  count: number;
  level: ActivityLevel;
  rest: boolean;
  future: boolean;
};

export function heatmapStart(today: string): string {
  const monthStart = startOfMonth(addMonths(today, -11));
  return addDays(monthStart, -weekdayIndex(monthStart));
}

export function buildHeatmap(
  today: string,
  activity: ReadonlyMap<string, ActivityCounts>,
): { weeks: HeatCell[][]; monthLabels: { column: number; label: string }[] } {
  const start = heatmapStart(today);
  const weeks: HeatCell[][] = [];
  const monthLabels: { column: number; label: string }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let cursor = start;
  let column = 0;
  let guard = 0;

  while (cursor <= today || weekdayIndex(cursor) !== 0) {
    const week: HeatCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const row = activity.get(cursor);
      const count = row ? activityCount(row) : 0;
      const future = cursor > today;
      if (!future && cursor.endsWith('-01') && monthLabels.at(-1)?.label !== monthNames[Number(cursor.slice(5, 7)) - 1]) {
        monthLabels.push({
          column,
          label: monthNames[Number(cursor.slice(5, 7)) - 1] ?? '',
        });
      }
      week.push({
        date: cursor,
        count: future ? 0 : count,
        level: future ? 0 : activityLevel(count),
        rest: future ? false : Boolean(row?.restDay),
        future,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    column += 1;
    guard += 1;
    if (guard > 60) break;
  }

  return { weeks, monthLabels };
}
