import assert from 'node:assert/strict';
import { test } from 'node:test';

import { curriculumDays, curriculumSessions, sessionsById } from '../src/curriculum/index.ts';
import { validateCurriculum } from '../src/curriculum/validate.ts';
import { curriculumConcepts, curriculumPhases, curriculumResources } from '../src/curriculum/index.ts';
import { nextCurriculumSession } from '../src/engine/progression.ts';

test('the bundled path is ordered, authored for 14 days, and planned through day 210', () => {
  const errors = validateCurriculum({
    phases: curriculumPhases,
    days: curriculumDays,
    concepts: curriculumConcepts,
    resources: curriculumResources,
  });
  assert.deepEqual(errors, []);
  assert.equal(curriculumDays.length, 210);
  assert.equal(curriculumSessions.length, 420);
  assert.equal(curriculumDays.filter((day) => day.morning.depth === 'full').length, 14);
  assert.equal(sessionsById.get('day.014.evening')?.depth, 'full');
  assert.equal(sessionsById.get('day.015.morning')?.depth, 'planned');
});

test('missing days do not skip the next authored lesson', () => {
  const completed = new Set(['day.001.morning', 'day.001.evening']);
  assert.equal(nextCurriculumSession(curriculumDays, completed)?.id, 'day.002.morning');
  assert.equal(nextCurriculumSession(curriculumDays, new Set())?.id, 'day.001.morning');
  const allAuthored = curriculumSessions.filter((session) => session.depth === 'full').map((session) => session.id);
  assert.equal(nextCurriculumSession(curriculumDays, new Set(allAuthored)), null);
});

test('evening sessions depend on the same morning, and mornings depend on the previous evening', () => {
  const day = curriculumDays[4];
  assert.ok(day.evening.prerequisiteSessionIds.includes(day.morning.id));
  assert.ok(day.morning.prerequisiteSessionIds.includes('day.004.evening'));
});
