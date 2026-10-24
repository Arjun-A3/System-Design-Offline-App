import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateBackup } from '../src/backup/validate.ts';
import { sessionsById } from '../src/curriculum/index.ts';
import { CURRICULUM_VERSION } from '../src/curriculum/types.ts';
import { MIGRATIONS } from '../src/db/migrations.ts';
import { migrate } from '../src/db/migrate.ts';
import {
  applyAssessment,
  exportBackup,
  importBackup,
  loadSnapshot,
  resetProgress,
  saveDraft,
  seedDefaults,
  updateCurriculumMeta,
} from '../src/db/repository.ts';
import { planAssessment } from '../src/engine/effects.ts';
import type { FullSession } from '../src/curriculum/types.ts';
import { openMemoryDatabase } from './helpers/nodeDb.ts';

const now = '2026-04-02T04:00:00.000Z';

test('migrations add columns without deleting an in-progress answer', async () => {
  const skipped = openMemoryDatabase();
  await assert.rejects(migrate(skipped, [MIGRATIONS[1]]), /before 1/);

  const db = openMemoryDatabase();
  await migrate(db, [MIGRATIONS[0]]);
  await db.run(
    `INSERT INTO learning_sessions (
      session_id, status, answer_draft, hints_revealed, reference_revealed, notes, bookmarked, started_at, postpone_count, updated_at
    ) VALUES ('day.001.morning', 'in_progress', 'kept answer text', 0, 0, 'note', 1, ?, 2, ?)`,
    [now, now],
  );
  const version = await migrate(db);
  assert.equal(version, 2);
  const row = await db.get<{ answer_draft: string; last_confidence: number | null; notes: string }>(
    'SELECT answer_draft, last_confidence, notes FROM learning_sessions WHERE session_id = ?',
    ['day.001.morning'],
  );
  assert.equal(row?.answer_draft, 'kept answer text');
  assert.equal(row?.notes, 'note');
  assert.equal(row?.last_confidence, null);
  const userVersion = await db.get<{ user_version: number }>('PRAGMA user_version');
  assert.equal(Number(userVersion?.user_version), 2);
});

test('a recorded migration is rebuilt when learner_state is missing', async () => {
  const db = openMemoryDatabase();
  await migrate(db);
  await db.run(
    `INSERT INTO daily_activity (local_date, completed_sessions, completed_revisions, rest_day, updated_at)
     VALUES ('2026-04-02', 1, 0, 0, ?)`,
    [now],
  );
  await db.exec('DROP TABLE learner_state');
  const version = await migrate(db);
  const table = await db.get<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'learner_state'");
  const activity = await db.get<{ completed_sessions: number }>(
    'SELECT completed_sessions FROM daily_activity WHERE local_date = ?',
    ['2026-04-02'],
  );
  assert.equal(version, 2);
  assert.equal(table?.name, 'learner_state');
  assert.equal(activity?.completed_sessions, 1);
});

test('a second migration keeps an existing daily activity table', async () => {
  const db = openMemoryDatabase();
  await migrate(db);
  await db.run(
    `INSERT INTO daily_activity (local_date, completed_sessions, completed_revisions, rest_day, updated_at)
     VALUES ('2026-04-02', 1, 0, 0, ?)`,
    [now],
  );
  await db.exec('DELETE FROM schema_migrations');
  const version = await migrate(db);
  const row = await db.get<{ completed_sessions: number }>(
    'SELECT completed_sessions FROM daily_activity WHERE local_date = ?',
    ['2026-04-02'],
  );
  assert.equal(version, 2);
  assert.equal(row?.completed_sessions, 1);
});

test('answers, reviews, and activity survive restart and a validated round trip', async () => {
  const db = openMemoryDatabase();
  await migrate(db);
  await seedDefaults(db, now);
  await updateCurriculumMeta(db, CURRICULUM_VERSION, '29ef46ce', now);
  await saveDraft(db, 'day.001.morning', 'Draft that must still be here after reopening.', now);
  let snapshot = await loadSnapshot(db);
  assert.equal(snapshot.sessions[0]?.answerDraft, 'Draft that must still be here after reopening.');

  const session = sessionsById.get('day.001.morning');
  if (!session || session.depth !== 'full') throw new Error('missing lesson');
  const marks = Object.fromEntries(session.rubric.map((criterion) => [criterion.id, 'understood_independently']));
  const plan = planAssessment({
    session,
    marks,
    confidence: 5,
    answer: 'A crashed process loses its address space. Restarting does not finish the request.',
    hintsRevealed: 0,
    referenceRevealed: false,
    today: '2026-04-02',
    nowIso: now,
    existing: {
      status: 'in_progress',
      notes: '',
      bookmarked: false,
      startedAt: now,
      completedAt: null,
      postponedAt: null,
      postponeCount: 0,
    },
    mastery: [],
    prerequisiteConceptIds: [],
    incompletePrerequisiteIds: [],
  });
  await applyAssessment(db, plan, '2026-04-02');
  snapshot = await loadSnapshot(db);
  assert.equal(snapshot.sessions[0]?.status, 'completed');
  assert.equal(snapshot.mastery[0]?.masteryStatus, 'reviewing');
  assert.equal(snapshot.activity[0]?.completedSessions, 1);
  assert.equal(snapshot.revisions[0]?.reason, 'interval');
  assert.ok(snapshot.assessments[0]?.rubricScore);

  const exported = await exportBackup(db, CURRICULUM_VERSION, now);
  const validated = validateBackup(exported);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const restored = openMemoryDatabase();
  await migrate(restored);
  await importBackup(restored, validated.value);
  const again = await loadSnapshot(restored);
  assert.equal(again.sessions[0]?.answerDraft.includes('address space'), true);
  assert.equal(again.activity[0]?.localDate, '2026-04-02');
  assert.equal(again.settings.theme, 'system');
});

test('reset deletes learning history and keeps reminder preferences', async () => {
  const db = openMemoryDatabase();
  await migrate(db);
  await seedDefaults(db, now);
  await updateCurriculumMeta(db, CURRICULUM_VERSION, '29ef46ce', now);
  await saveDraft(db, 'day.001.morning', 'This draft should be deleted by reset.', now);
  await resetProgress(db, now);
  const snapshot = await loadSnapshot(db);
  assert.equal(snapshot.sessions.length, 0);
  assert.equal(snapshot.notifications.morningHour, 8);
  assert.equal(snapshot.settings.fontScale, 'default');
});

test('a second assessment counts as review activity rather than another first completion', async () => {
  const db = openMemoryDatabase();
  await migrate(db);
  await seedDefaults(db, now);
  const session = sessionsById.get('day.001.evening');
  if (!session || session.depth !== 'full') throw new Error('missing');
  const full: FullSession = session;
  const marks = Object.fromEntries(full.rubric.map((criterion) => [criterion.id, 'understood_with_hint']));
  const first = planAssessment({
    session: full,
    marks,
    confidence: 4,
    answer: 'Put the renderer in a separate process and do not share the billing credentials.',
    hintsRevealed: 1,
    referenceRevealed: false,
    today: '2026-04-02',
    nowIso: now,
    existing: null,
    mastery: [],
    prerequisiteConceptIds: [],
    incompletePrerequisiteIds: [],
  });
  await applyAssessment(db, first, '2026-04-02');
  const second = planAssessment({
    session: full,
    marks,
    confidence: 4,
    answer: 'The separate process is the boundary. A try/catch is not enough for a fatal crash.',
    hintsRevealed: 1,
    referenceRevealed: true,
    today: '2026-04-03',
    nowIso: '2026-04-03T04:00:00.000Z',
    existing: {
      status: 'completed',
      notes: '',
      bookmarked: false,
      startedAt: now,
      completedAt: now,
      postponedAt: null,
      postponeCount: 0,
    },
    mastery: [{ conceptId: 'concept.process', attemptCount: 1, hintUsageCount: 1, intervalIndex: 1, lastSuccessfulAt: null }],
    prerequisiteConceptIds: [],
    incompletePrerequisiteIds: [],
  });
  assert.equal(second.activityKind, 'revision_completed');
  await applyAssessment(db, second, '2026-04-03');
  const snapshot = await loadSnapshot(db);
  const reviewDay = snapshot.activity.find((row) => row.localDate === '2026-04-03');
  assert.equal(reviewDay?.completedRevisions, 1);
  assert.equal(reviewDay?.completedSessions, 0);
});
