import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sessionsById } from '../src/curriculum/index.ts';
import type { CriterionMark, FullSession } from '../src/curriculum/types.ts';
import { classifyPerformance, rubricScore } from '../src/engine/assessment.ts';
import { addDays } from '../src/engine/dates.ts';
import { planAssessment } from '../src/engine/effects.ts';
import { activityLevel, buildHeatmap } from '../src/engine/heatmap.ts';
import { incompletePrerequisites, nextCurriculumSession } from '../src/engine/progression.ts';
import { REVIEW_INTERVALS, scheduleNext } from '../src/engine/repetition.ts';
import { computeStreaks } from '../src/engine/streaks.ts';
import { curriculumDays } from '../src/curriculum/index.ts';

const morning = sessionsById.get('day.001.morning');
if (!morning || morning.depth !== 'full') throw new Error('Day 1 morning is missing.');
const fullMorning: FullSession = morning;

test('rubric scores distinguish independent, assisted, and missing understanding', () => {
  assert.equal(rubricScore(['understood_independently', 'understood_independently']), 100);
  assert.equal(rubricScore(['understood_with_hint', 'not_understood']), 30);
  const assisted = classifyPerformance({
    marks: ['understood_independently', 'understood_independently', 'understood_independently'],
    confidence: 5,
    hintsUsed: 1,
    referenceRevealed: false,
  });
  assert.equal(assisted.grade, 'shaky');
  const gap = classifyPerformance({
    marks: ['not_understood'],
    confidence: 5,
    hintsUsed: 0,
    referenceRevealed: false,
  });
  assert.equal(gap.grade, 'struggle');
});

test('review intervals advance, hold, and reset', () => {
  assert.deepEqual(REVIEW_INTERVALS, [0, 1, 3, 7, 14, 30]);
  assert.equal(scheduleNext(0, 'solid', '2026-01-01').nextReviewDate, '2026-01-02');
  assert.equal(scheduleNext(1, 'solid', '2026-01-01').intervalDays, 3);
  assert.equal(scheduleNext(4, 'solid', '2026-01-01').status, 'mastered');
  assert.equal(scheduleNext(5, 'solid', '2026-03-01').nextReviewDate, addDays('2026-03-01', 30));
  assert.equal(scheduleNext(3, 'shaky', '2026-01-01').intervalDays, 7);
  assert.equal(scheduleNext(4, 'struggle', '2026-01-01').nextReviewDate, '2026-01-01');
  assert.equal(scheduleNext(4, 'struggle', '2026-01-01').status, 'weak');
});

test('assessment requires an answer, a complete rubric, and finished prerequisites', () => {
  const marks = Object.fromEntries(fullMorning.rubric.map((criterion) => [criterion.id, 'understood_independently' as CriterionMark]));
  assert.throws(() => basePlan({ marks, answer: 'too short', confidence: 5 }), /short answer/);
  assert.throws(() => basePlan({ marks: {}, answer: 'A process crash drops only that address space.', confidence: 4 }), /rubric/);
  const plan = basePlan({
    marks,
    answer: 'The crash drops that process address space. A restart does not resume the request.',
    confidence: 5,
  });
  assert.equal(plan.grade, 'solid');
  assert.equal(plan.firstCompletion, true);
  assert.equal(plan.activityKind, 'session_completed');
  assert.equal(plan.mastery[0]?.masteryStatus, 'reviewing');
  const blocked = sessionsById.get('day.001.evening');
  if (!blocked || blocked.depth !== 'full') throw new Error('missing evening');
  assert.throws(
    () =>
      planAssessment({
        ...baseInput(blocked, marksFor(blocked), 'The renderer moves to another process so a crash stays there and credentials do not.'),
        incompletePrerequisiteIds: ['day.001.morning'],
      }),
    /prerequisite/i,
  );
});

test('a struggle schedules same-day review and names prerequisite concepts', () => {
  const evening = sessionsById.get('day.002.evening');
  if (!evening || evening.depth !== 'full') throw new Error('missing');
  const marks = Object.fromEntries(evening.rubric.map((criterion) => [criterion.id, 'not_understood' as CriterionMark]));
  const plan = planAssessment({
    ...baseInput(evening, marks, 'I am not sure how the shared map fails or what should replace it here.'),
    confidence: 2,
    prerequisiteConceptIds: [{ conceptId: 'concept.process', sessionId: 'day.001.morning' }],
  });
  assert.equal(plan.grade, 'struggle');
  assert.ok(plan.revisions.some((item) => item.reason === 'struggle' && item.dueOn === '2026-04-02'));
  assert.ok(plan.revisions.some((item) => item.reason === 'prerequisite'));
  assert.ok(plan.misconceptions.length > 0);
});

test('heatmap levels count completed work and ignore rest alone', () => {
  assert.equal(activityLevel(0), 0);
  assert.equal(activityLevel(1), 1);
  assert.equal(activityLevel(2), 2);
  assert.equal(activityLevel(3), 3);
  const today = '2026-01-15';
  const map = new Map([
    ['2025-12-31', { completedSessions: 1, completedRevisions: 0, restDay: false }],
    ['2026-01-01', { completedSessions: 1, completedRevisions: 1, restDay: false }],
    ['2026-01-02', { completedSessions: 0, completedRevisions: 0, restDay: true }],
  ]);
  const { weeks } = buildHeatmap(today, map);
  const cells = weeks.flat();
  const newYear = cells.find((cell) => cell.date === '2026-01-01');
  const rest = cells.find((cell) => cell.date === '2026-01-02');
  const prior = cells.find((cell) => cell.date === '2025-12-31');
  assert.equal(newYear?.level, 2);
  assert.equal(prior?.level, 1);
  assert.equal(rest?.level, 0);
  assert.equal(rest?.rest, true);
  assert.ok(cells.some((cell) => cell.date === today));
  assert.ok(weeks[0].every((cell) => cell.date <= today || cell.future));
});

test('streaks cross the year boundary and do not punish a marked rest day', () => {
  const activity = new Map([
    ['2025-12-31', { completedSessions: 1, completedRevisions: 0, restDay: false }],
    ['2026-01-01', { completedSessions: 0, completedRevisions: 0, restDay: true }],
    ['2026-01-02', { completedSessions: 2, completedRevisions: 0, restDay: false }],
  ]);
  assert.deepEqual(computeStreaks(activity, '2026-01-02'), { current: 2, longest: 2 });
  assert.equal(computeStreaks(activity, '2026-01-03').current, 2);
  const broken = new Map([
    ['2025-12-31', { completedSessions: 1, completedRevisions: 0, restDay: false }],
    ['2026-01-02', { completedSessions: 1, completedRevisions: 0, restDay: false }],
  ]);
  assert.equal(computeStreaks(broken, '2026-01-02').current, 1);
  assert.equal(computeStreaks(broken, '2026-01-02').longest, 1);
});

test('future lessons stay locked behind incomplete authored prerequisites', () => {
  const evening = sessionsById.get('day.003.evening');
  if (!evening) throw new Error('missing');
  const completed = new Set(['day.001.morning']);
  assert.ok(incompletePrerequisites(evening, sessionsById, completed).length > 0);
  assert.equal(nextCurriculumSession(curriculumDays, completed)?.id, 'day.001.evening');
});

function marksFor(session: FullSession): Record<string, CriterionMark> {
  return Object.fromEntries(session.rubric.map((criterion) => [criterion.id, 'understood_independently' as CriterionMark]));
}

function baseInput(session: FullSession, marks: Record<string, CriterionMark>, answer: string) {
  return {
    session,
    marks,
    confidence: 5,
    answer,
    hintsRevealed: 0,
    referenceRevealed: false,
    today: '2026-04-02',
    nowIso: '2026-04-02T04:00:00.000Z',
    existing: null,
    mastery: [],
    prerequisiteConceptIds: [],
    incompletePrerequisiteIds: [],
  };
}

function basePlan(input: { marks: Record<string, CriterionMark>; answer: string; confidence: number }) {
  return planAssessment({ ...baseInput(fullMorning, input.marks, input.answer), confidence: input.confidence });
}
