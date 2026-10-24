import type { MasteryStatus, PerformanceGrade } from '../curriculum/types';
import { addDays } from './dates';

/** Same day, then 1, 3, 7, 14, and 30 days. Index 0 means "review today". */
export const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30] as const;

export type ReviewSchedule = {
  intervalIndex: number;
  intervalDays: number;
  nextReviewDate: string;
  status: MasteryStatus;
};

export function scheduleNext(
  intervalIndex: number,
  grade: PerformanceGrade,
  today: string,
): ReviewSchedule {
  if (grade === 'struggle') {
    return {
      intervalIndex: 0,
      intervalDays: 0,
      nextReviewDate: today,
      status: 'weak',
    };
  }

  if (grade === 'shaky') {
    const nextIndex = intervalIndex <= 0 ? 1 : intervalIndex;
    const days = REVIEW_INTERVALS[Math.min(nextIndex, REVIEW_INTERVALS.length - 1)];
    return {
      intervalIndex: nextIndex,
      intervalDays: days,
      nextReviewDate: addDays(today, days),
      status: 'learning',
    };
  }

  const nextIndex = Math.min(REVIEW_INTERVALS.length - 1, intervalIndex + 1);
  const days = REVIEW_INTERVALS[nextIndex];
  return {
    intervalIndex: nextIndex,
    intervalDays: days,
    nextReviewDate: addDays(today, days),
    status: nextIndex >= 4 ? 'mastered' : 'reviewing',
  };
}
