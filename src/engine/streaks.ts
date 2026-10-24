import { addDays, compareDates } from './dates';
import { activityCount, type ActivityCounts } from './heatmap';

export type StreakSummary = {
  current: number;
  longest: number;
};

function isStudy(row: ActivityCounts | undefined): boolean {
  return row ? activityCount(row) > 0 : false;
}

function isRest(row: ActivityCounts | undefined): boolean {
  return Boolean(row?.restDay) && !isStudy(row);
}

/**
 * A study day adds to the streak. A marked rest day keeps the streak intact
 * and does not add to it. An empty day ends the run. Today does not end the
 * current streak until the local day is over, so an empty today still shows
 * yesterday's run.
 */
export function computeStreaks(
  activity: ReadonlyMap<string, ActivityCounts>,
  today: string,
): StreakSummary {
  const dates = [...activity.keys()].sort();
  const earliest = dates[0];
  let longest = 0;
  if (earliest && compareDates(earliest, today) <= 0) {
    let run = 0;
    let bridging = false;
    let cursor = earliest;
    while (compareDates(cursor, today) <= 0) {
      const row = activity.get(cursor);
      if (isStudy(row)) {
        run += 1;
        bridging = true;
        longest = Math.max(longest, run);
      } else if (isRest(row) && bridging) {
        // Rest preserves the run without counting as study.
      } else {
        run = 0;
        bridging = false;
      }
      cursor = addDays(cursor, 1);
    }
  }

  const todayRow = activity.get(today);
  let cursor = isStudy(todayRow) || isRest(todayRow) ? today : addDays(today, -1);
  let current = 0;
  let seenStudy = false;
  let steps = 0;
  while (steps < 4000) {
    const row = activity.get(cursor);
    if (!isStudy(row) && !isRest(row)) break;
    if (isStudy(row)) {
      current += 1;
      seenStudy = true;
    }
    cursor = addDays(cursor, -1);
    steps += 1;
  }

  return { current: seenStudy ? current : 0, longest };
}
