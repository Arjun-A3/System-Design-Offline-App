import type { CurriculumDay, LessonSession } from '../curriculum/types';
import { sessionSortKey } from '../curriculum/ids';

export function orderedSessions(days: readonly CurriculumDay[]): LessonSession[] {
  return [...days]
    .sort((left, right) => left.number - right.number)
    .flatMap((day) => [day.morning, day.evening]);
}

export function authoredSessions(days: readonly CurriculumDay[]): LessonSession[] {
  return orderedSessions(days).filter((session) => session.depth === 'full');
}

/** The next lesson is the earliest unfinished authored session. Calendar gaps do not skip it. */
export function nextCurriculumSession(
  days: readonly CurriculumDay[],
  completedSessionIds: ReadonlySet<string>,
): LessonSession | null {
  return authoredSessions(days).find((session) => !completedSessionIds.has(session.id)) ?? null;
}

export function incompletePrerequisites(
  session: LessonSession,
  sessionsById: ReadonlyMap<string, LessonSession>,
  completedSessionIds: ReadonlySet<string>,
): string[] {
  return session.prerequisiteSessionIds.filter((id) => {
    const prerequisite = sessionsById.get(id);
    if (!prerequisite || prerequisite.depth !== 'full') return false;
    return !completedSessionIds.has(id);
  });
}

export function isEarlierSession(left: LessonSession, right: LessonSession): boolean {
  return sessionSortKey(left.dayNumber, left.slot) < sessionSortKey(right.dayNumber, right.slot);
}
