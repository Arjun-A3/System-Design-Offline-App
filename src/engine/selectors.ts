import { conceptsById, curriculumDays, phasesById, sessionsById } from '../curriculum';
import type { LessonSession } from '../curriculum/types';
import { CURRICULUM_VERSION } from '../curriculum/types';
import type { LearningSnapshot, SessionRecord } from '../db/records';
import { addDays, startOfMonth } from './dates';
import { activityCount, buildHeatmap, type ActivityCounts } from './heatmap';
import { incompletePrerequisites, nextCurriculumSession } from './progression';
import { computeStreaks } from './streaks';

export type SessionStatus = 'not_started' | 'in_progress' | 'postponed' | 'completed' | 'planned';

export type SessionCard = {
  id: string;
  title: string;
  slot: 'morning' | 'evening';
  status: SessionStatus;
  durationMinutes: number;
  dayNumber: number;
  phaseTitle: string;
};

export type HomeSummary = {
  curriculumVersion: string;
  finishedAuthored: boolean;
  dayNumber: number;
  dayTitle: string;
  phaseTitle: string;
  morning: SessionCard;
  evening: SessionCard;
  nextSession: SessionCard | null;
  upcomingTitle: string | null;
  revisionsDue: number;
  streakCurrent: number;
  streakLongest: number;
  completedSessions: number;
  nextDuration: number | null;
};

export type RevisionView = {
  due: { id: number; conceptTitle: string; reason: string; dueOn: string; sessionId: string | null }[];
  weak: { conceptId: string; title: string; score: number | null; status: string }[];
  bookmarks: { sessionId: string; title: string }[];
  unfinished: { sessionId: string; title: string; status: SessionStatus }[];
  misconceptions: { id: number; statement: string; conceptTitle: string; resolved: boolean }[];
};

export type ProgressView = {
  heatmap: ReturnType<typeof buildHeatmap>;
  streaks: { current: number; longest: number };
  completedSessions: number;
  morningCompleted: number;
  eveningCompleted: number;
  mastered: number;
  weak: number;
  weekCount: number;
  monthCount: number;
  phases: { id: string; title: string; completed: number; authored: number; planned: number }[];
};

export function recordsById(snapshot: LearningSnapshot): Map<string, SessionRecord> {
  return new Map(snapshot.sessions.map((session) => [session.sessionId, session]));
}

export function activityByDate(snapshot: LearningSnapshot): Map<string, ActivityCounts> {
  return new Map(
    snapshot.activity.map((row) => [
      row.localDate,
      {
        completedSessions: row.completedSessions,
        completedRevisions: row.completedRevisions,
        restDay: row.restDay,
      },
    ]),
  );
}

export function sessionCard(session: LessonSession, record: SessionRecord | undefined): SessionCard {
  const phaseTitle = phasesById.get(session.phaseId)?.title ?? session.phaseId;
  const status: SessionStatus = session.depth === 'planned' ? 'planned' : (record?.status ?? 'not_started');
  return {
    id: session.id,
    title: session.title,
    slot: session.slot,
    status,
    durationMinutes: session.durationMinutes,
    dayNumber: session.dayNumber,
    phaseTitle,
  };
}

export function selectHome(snapshot: LearningSnapshot, today: string): HomeSummary {
  const records = recordsById(snapshot);
  const completed = new Set(
    snapshot.sessions.filter((session) => session.status === 'completed').map((session) => session.sessionId),
  );
  const next = nextCurriculumSession(curriculumDays, completed);
  const focusDay =
    curriculumDays.find((day) => day.number === (next?.dayNumber ?? 14)) ?? curriculumDays[0];
  const streaks = computeStreaks(activityByDate(snapshot), today);
  const due = snapshot.revisions.filter((item) => item.status === 'scheduled' && item.dueOn <= today);
  const upcoming = next ? null : curriculumDays.find((day) => day.number === 15);
  return {
    curriculumVersion: CURRICULUM_VERSION,
    finishedAuthored: next === null,
    dayNumber: focusDay.number,
    dayTitle: focusDay.title,
    phaseTitle: phasesById.get(focusDay.phaseId)?.title ?? focusDay.phaseId,
    morning: sessionCard(focusDay.morning, records.get(focusDay.morning.id)),
    evening: sessionCard(focusDay.evening, records.get(focusDay.evening.id)),
    nextSession: next ? sessionCard(next, records.get(next.id)) : null,
    upcomingTitle: upcoming ? `Day ${upcoming.number}: ${upcoming.title}` : null,
    revisionsDue: due.length,
    streakCurrent: streaks.current,
    streakLongest: streaks.longest,
    completedSessions: completed.size,
    nextDuration: next?.durationMinutes ?? null,
  };
}

export function selectRevision(snapshot: LearningSnapshot, today: string): RevisionView {
  const records = recordsById(snapshot);
  return {
    due: snapshot.revisions
      .filter((item) => item.status === 'scheduled' && item.dueOn <= today)
      .map((item) => ({
        id: item.id,
        conceptTitle: conceptsById.get(item.conceptId)?.title ?? item.conceptId,
        reason: item.reason,
        dueOn: item.dueOn,
        sessionId: item.sessionId,
      })),
    weak: snapshot.mastery
      .filter((item) => item.masteryStatus === 'weak' || (item.lastRubricScore !== null && item.lastRubricScore < 70))
      .map((item) => ({
        conceptId: item.conceptId,
        title: conceptsById.get(item.conceptId)?.title ?? item.conceptId,
        score: item.lastRubricScore,
        status: item.masteryStatus,
      })),
    bookmarks: snapshot.sessions
      .filter((session) => session.bookmarked)
      .map((session) => ({
        sessionId: session.sessionId,
        title: sessionsById.get(session.sessionId)?.title ?? session.sessionId,
      })),
    unfinished: snapshot.sessions
      .filter((session) => session.status !== 'completed')
      .map((session) => ({
        sessionId: session.sessionId,
        title: sessionsById.get(session.sessionId)?.title ?? session.sessionId,
        status: session.status,
      })),
    misconceptions: snapshot.misconceptions.map((item) => ({
      id: item.id,
      statement: item.statement,
      conceptTitle: conceptsById.get(item.conceptId)?.title ?? item.conceptId,
      resolved: item.resolvedOn !== null,
    })),
  };
}

export function selectProgress(snapshot: LearningSnapshot, today: string): ProgressView {
  const activity = activityByDate(snapshot);
  const completed = snapshot.sessions.filter((session) => session.status === 'completed');
  const weekStart = addDays(today, -6);
  const monthStart = startOfMonth(today);
  let weekCount = 0;
  let monthCount = 0;
  for (const [date, row] of activity) {
    const count = activityCount(row);
    if (date >= weekStart && date <= today) weekCount += count;
    if (date >= monthStart && date <= today) monthCount += count;
  }
  return {
    heatmap: buildHeatmap(today, activity),
    streaks: computeStreaks(activity, today),
    completedSessions: completed.length,
    morningCompleted: completed.filter((session) => session.sessionId.endsWith('.morning')).length,
    eveningCompleted: completed.filter((session) => session.sessionId.endsWith('.evening')).length,
    mastered: snapshot.mastery.filter((item) => item.masteryStatus === 'mastered').length,
    weak: snapshot.mastery.filter((item) => item.masteryStatus === 'weak').length,
    weekCount,
    monthCount,
    phases: [...phasesById.values()].map((phase) => {
      const sessions = curriculumDays
        .filter((day) => day.phaseId === phase.id)
        .flatMap((day) => [day.morning, day.evening]);
      const authored = sessions.filter((session) => session.depth === 'full');
      return {
        id: phase.id,
        title: phase.title,
        completed: authored.filter((session) => completed.some((row) => row.sessionId === session.id)).length,
        authored: authored.length,
        planned: sessions.filter((session) => session.depth === 'planned').length,
      };
    }),
  };
}

export function prerequisiteBlock(session: LessonSession, snapshot: LearningSnapshot): string[] {
  const completed = new Set(
    snapshot.sessions.filter((row) => row.status === 'completed').map((row) => row.sessionId),
  );
  return incompletePrerequisites(session, sessionsById, completed);
}

export function eventsOn(snapshot: LearningSnapshot, date: string) {
  return snapshot.events.filter((event) => event.localDate === date);
}
