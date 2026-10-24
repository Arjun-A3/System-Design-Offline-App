import type { BackupFile } from '../backup/validate';
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from '../backup/validate';
import type { AssessmentPlan } from '../engine/effects';
import type { DbAdapter } from './adapter';
import type {
  ActivityEventRecord,
  ActivityRecord,
  AssessmentRecord,
  LearningSnapshot,
  MasteryRecord,
  MisconceptionRecord,
  NotificationRecord,
  RevisionRecord,
  SessionRecord,
  SettingsRecord,
} from './records';

type SessionRow = {
  session_id: string;
  status: SessionRecord['status'];
  answer_draft: string;
  hints_revealed: number;
  reference_revealed: number;
  notes: string;
  bookmarked: number;
  started_at: string | null;
  completed_at: string | null;
  postponed_at: string | null;
  postpone_count: number;
  last_confidence: number | null;
  updated_at: string;
};

function flag(value: boolean): number {
  return value ? 1 : 0;
}

function asBool(value: unknown): boolean {
  return value === 1 || value === true;
}

function mapSession(row: SessionRow): SessionRecord {
  return {
    sessionId: row.session_id,
    status: row.status,
    answerDraft: row.answer_draft,
    hintsRevealed: Number(row.hints_revealed),
    referenceRevealed: asBool(row.reference_revealed),
    notes: row.notes,
    bookmarked: asBool(row.bookmarked),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    postponedAt: row.postponed_at,
    postponeCount: Number(row.postpone_count),
    lastConfidence: row.last_confidence === null ? null : Number(row.last_confidence),
    updatedAt: row.updated_at,
  };
}

export async function seedDefaults(db: DbAdapter, nowIso: string): Promise<void> {
  await db.run('INSERT OR IGNORE INTO learner_state (id, created_at) VALUES (1, ?)', [nowIso]);
  await db.run(
    `INSERT OR IGNORE INTO notification_preferences (
      id, morning_enabled, morning_hour, morning_minute, evening_enabled, evening_hour, evening_minute,
      permission_status, updated_at
    ) VALUES (1, 1, 8, 0, 1, 20, 0, 'undetermined', ?)`,
    [nowIso],
  );
  await db.run(
    `INSERT OR IGNORE INTO app_settings (id, theme, font_scale, reduce_motion, updated_at)
     VALUES (1, 'system', 'default', 0, ?)`,
    [nowIso],
  );
}

export async function updateCurriculumMeta(
  db: DbAdapter,
  version: string,
  contentHash: string,
  nowIso: string,
): Promise<void> {
  await db.run(
    `INSERT INTO curriculum_meta (id, bundled_version, content_hash, updated_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       bundled_version = excluded.bundled_version,
       content_hash = excluded.content_hash,
       updated_at = excluded.updated_at`,
    [version, contentHash, nowIso],
  );
}

export async function loadSnapshot(db: DbAdapter): Promise<LearningSnapshot> {
  const sessions = await db.all<SessionRow>('SELECT * FROM learning_sessions');
  const assessments = await db.all<Record<string, unknown>>(
    'SELECT * FROM assessments ORDER BY id DESC LIMIT 40',
  );
  const mastery = await db.all<Record<string, unknown>>('SELECT * FROM concept_mastery');
  const revisions = await db.all<Record<string, unknown>>('SELECT * FROM revision_items ORDER BY due_on, id');
  const activity = await db.all<Record<string, unknown>>('SELECT * FROM daily_activity');
  const events = await db.all<Record<string, unknown>>('SELECT * FROM activity_events ORDER BY id');
  const misconceptions = await db.all<Record<string, unknown>>('SELECT * FROM noted_misconceptions ORDER BY id');
  const notifications = await db.get<Record<string, unknown>>('SELECT * FROM notification_preferences WHERE id = 1');
  const settings = await db.get<Record<string, unknown>>('SELECT * FROM app_settings WHERE id = 1');
  const meta = await db.get<Record<string, unknown>>('SELECT * FROM curriculum_meta WHERE id = 1');
  if (!notifications || !settings) throw new Error('Local settings were not initialized.');

  return {
    sessions: sessions.map(mapSession),
    assessments: assessments.map(mapAssessment),
    mastery: mastery.map(mapMastery),
    revisions: revisions.map(mapRevision),
    activity: activity.map(mapActivity),
    events: events.map(mapEvent),
    misconceptions: misconceptions.map(mapMisconception),
    notifications: mapNotifications(notifications),
    settings: mapSettings(settings),
    curriculumVersion: String(meta?.bundled_version ?? ''),
    contentHash: String(meta?.content_hash ?? ''),
  };
}

async function ensureMutableSession(db: DbAdapter, sessionId: string, nowIso: string): Promise<void> {
  await db.run(
    `INSERT INTO learning_sessions (
      session_id, status, answer_draft, hints_revealed, reference_revealed, notes, bookmarked,
      started_at, postpone_count, updated_at
    ) VALUES (?, 'in_progress', '', 0, 0, '', 0, ?, 0, ?)
    ON CONFLICT(session_id) DO NOTHING`,
    [sessionId, nowIso, nowIso],
  );
}

export async function saveDraft(db: DbAdapter, sessionId: string, answer: string, nowIso: string): Promise<void> {
  await ensureMutableSession(db, sessionId, nowIso);
  await db.run(
    `UPDATE learning_sessions
     SET answer_draft = ?,
         status = CASE WHEN status = 'completed' THEN 'completed' ELSE 'in_progress' END,
         started_at = COALESCE(started_at, ?),
         updated_at = ?
     WHERE session_id = ?`,
    [answer, nowIso, nowIso, sessionId],
  );
}

export async function saveHints(db: DbAdapter, sessionId: string, hintsRevealed: number, nowIso: string): Promise<void> {
  await ensureMutableSession(db, sessionId, nowIso);
  await db.run(
    `UPDATE learning_sessions
     SET hints_revealed = ?, started_at = COALESCE(started_at, ?), updated_at = ?
     WHERE session_id = ?`,
    [hintsRevealed, nowIso, nowIso, sessionId],
  );
}

export async function revealReference(db: DbAdapter, sessionId: string, nowIso: string): Promise<void> {
  await ensureMutableSession(db, sessionId, nowIso);
  await db.run(
    `UPDATE learning_sessions
     SET reference_revealed = 1, started_at = COALESCE(started_at, ?), updated_at = ?
     WHERE session_id = ?`,
    [nowIso, nowIso, sessionId],
  );
}

export async function saveNotes(db: DbAdapter, sessionId: string, notes: string, nowIso: string): Promise<void> {
  await ensureMutableSession(db, sessionId, nowIso);
  await db.run('UPDATE learning_sessions SET notes = ?, updated_at = ? WHERE session_id = ?', [
    notes,
    nowIso,
    sessionId,
  ]);
}

export async function setBookmark(db: DbAdapter, sessionId: string, bookmarked: boolean, nowIso: string): Promise<void> {
  await ensureMutableSession(db, sessionId, nowIso);
  await db.run('UPDATE learning_sessions SET bookmarked = ?, updated_at = ? WHERE session_id = ?', [
    flag(bookmarked),
    nowIso,
    sessionId,
  ]);
}

export async function postponeSession(db: DbAdapter, sessionId: string, nowIso: string): Promise<void> {
  await ensureMutableSession(db, sessionId, nowIso);
  await db.run(
    `UPDATE learning_sessions
     SET status = 'postponed',
         postponed_at = ?,
         postpone_count = postpone_count + 1,
         updated_at = ?
     WHERE session_id = ? AND status != 'completed'`,
    [nowIso, nowIso, sessionId],
  );
}

export async function applyAssessment(db: DbAdapter, plan: AssessmentPlan, today: string): Promise<void> {
  const session = plan.session;
  await db.withTransaction(async () => {
    await db.run(
      `INSERT INTO learning_sessions (
        session_id, status, answer_draft, hints_revealed, reference_revealed, notes, bookmarked,
        started_at, completed_at, postponed_at, postpone_count, last_confidence, updated_at
      ) VALUES (?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        status = 'completed',
        answer_draft = excluded.answer_draft,
        hints_revealed = excluded.hints_revealed,
        reference_revealed = excluded.reference_revealed,
        notes = learning_sessions.notes,
        bookmarked = learning_sessions.bookmarked,
        started_at = COALESCE(learning_sessions.started_at, excluded.started_at),
        completed_at = COALESCE(learning_sessions.completed_at, excluded.completed_at),
        postponed_at = learning_sessions.postponed_at,
        postpone_count = learning_sessions.postpone_count,
        last_confidence = excluded.last_confidence,
        updated_at = excluded.updated_at`,
      [
        session.sessionId,
        session.answerDraft,
        session.hintsRevealed,
        flag(session.referenceRevealed),
        session.notes,
        flag(session.bookmarked),
        session.startedAt,
        session.completedAt,
        session.postponedAt,
        session.postponeCount,
        session.lastConfidence,
        session.updatedAt,
      ],
    );

    await db.run(
      `INSERT INTO assessments (
        session_id, rubric_json, rubric_score, confidence, hints_used, reference_revealed, grade, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.sessionId,
        plan.assessment.rubricJson,
        plan.assessment.rubricScore,
        plan.assessment.confidence,
        plan.assessment.hintsUsed,
        flag(plan.assessment.referenceRevealed),
        plan.assessment.grade,
        plan.assessment.createdAt,
      ],
    );

    for (const row of plan.mastery) {
      await db.run(
        `INSERT INTO concept_mastery (
          concept_id, attempt_count, last_rubric_score, last_confidence, hint_usage_count,
          last_attempt_at, last_successful_at, next_review_at, interval_days, interval_index,
          mastery_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(concept_id) DO UPDATE SET
          attempt_count = excluded.attempt_count,
          last_rubric_score = excluded.last_rubric_score,
          last_confidence = excluded.last_confidence,
          hint_usage_count = excluded.hint_usage_count,
          last_attempt_at = excluded.last_attempt_at,
          last_successful_at = excluded.last_successful_at,
          next_review_at = excluded.next_review_at,
          interval_days = excluded.interval_days,
          interval_index = excluded.interval_index,
          mastery_status = excluded.mastery_status,
          updated_at = excluded.updated_at`,
        [
          row.conceptId,
          row.attemptCount,
          row.lastRubricScore,
          row.lastConfidence,
          row.hintUsageCount,
          row.lastAttemptAt,
          row.lastSuccessfulAt,
          row.nextReviewAt,
          row.intervalDays,
          row.intervalIndex,
          row.masteryStatus,
          row.updatedAt,
        ],
      );
    }

    for (const conceptId of plan.completeRevisionConceptIds) {
      await db.run(
        `UPDATE revision_items
         SET status = 'completed', completed_at = ?
         WHERE concept_id = ? AND status = 'scheduled' AND due_on <= ?`,
        [session.updatedAt, conceptId, today],
      );
    }

    for (const revision of plan.revisions) {
      await db.run(
        `INSERT INTO revision_items (concept_id, session_id, due_on, reason, status, created_at)
         SELECT ?, ?, ?, ?, 'scheduled', ?
         WHERE NOT EXISTS (
           SELECT 1 FROM revision_items
           WHERE concept_id = ? AND due_on = ? AND reason = ? AND status = 'scheduled'
         )`,
        [
          revision.conceptId,
          revision.sessionId,
          revision.dueOn,
          revision.reason,
          session.updatedAt,
          revision.conceptId,
          revision.dueOn,
          revision.reason,
        ],
      );
    }

    const sessionDelta = plan.activityKind === 'session_completed' ? 1 : 0;
    const revisionDelta = plan.activityKind === 'revision_completed' ? 1 : 0;
    await db.run(
      `INSERT INTO daily_activity (local_date, completed_sessions, completed_revisions, rest_day, updated_at)
       VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(local_date) DO UPDATE SET
         completed_sessions = completed_sessions + excluded.completed_sessions,
         completed_revisions = completed_revisions + excluded.completed_revisions,
         updated_at = excluded.updated_at`,
      [today, sessionDelta, revisionDelta, session.updatedAt],
    );
    await db.run(
      `INSERT INTO activity_events (local_date, kind, ref_id, title, created_at) VALUES (?, ?, ?, ?, ?)`,
      [today, plan.activityKind, session.sessionId, plan.activityTitle, session.updatedAt],
    );

    for (const item of plan.misconceptions) {
      await db.run(
        `INSERT INTO noted_misconceptions (
          session_id, concept_id, misconception_id, statement, noted_on
        ) VALUES (?, ?, ?, ?, ?)`,
        [session.sessionId, item.conceptId, item.misconceptionId, item.statement, today],
      );
    }
    for (const conceptId of plan.resolveConceptIds) {
      await db.run(
        `UPDATE noted_misconceptions SET resolved_on = ? WHERE concept_id = ? AND resolved_on IS NULL`,
        [today, conceptId],
      );
    }
  });
}

export async function setRestDay(db: DbAdapter, localDate: string, resting: boolean, nowIso: string): Promise<void> {
  await db.withTransaction(async () => {
    await db.run(
      `INSERT INTO daily_activity (local_date, completed_sessions, completed_revisions, rest_day, updated_at)
       VALUES (?, 0, 0, ?, ?)
       ON CONFLICT(local_date) DO UPDATE SET rest_day = excluded.rest_day, updated_at = excluded.updated_at`,
      [localDate, flag(resting), nowIso],
    );
    await db.run(`DELETE FROM activity_events WHERE local_date = ? AND kind = 'rest_marked'`, [localDate]);
    if (resting) {
      await db.run(
        `INSERT INTO activity_events (local_date, kind, ref_id, title, created_at) VALUES (?, 'rest_marked', NULL, ?, ?)`,
        [localDate, 'Rest day', nowIso],
      );
    }
  });
}

export async function saveSettings(
  db: DbAdapter,
  settings: Pick<SettingsRecord, 'theme' | 'fontScale' | 'reduceMotion'>,
  nowIso: string,
): Promise<void> {
  await db.run(
    `UPDATE app_settings SET theme = ?, font_scale = ?, reduce_motion = ?, updated_at = ? WHERE id = 1`,
    [settings.theme, settings.fontScale, flag(settings.reduceMotion), nowIso],
  );
}

export async function saveNotificationPreferences(
  db: DbAdapter,
  prefs: NotificationRecord,
  nowIso: string,
): Promise<void> {
  await db.run(
    `UPDATE notification_preferences SET
      morning_enabled = ?, morning_hour = ?, morning_minute = ?,
      evening_enabled = ?, evening_hour = ?, evening_minute = ?,
      permission_status = ?, last_reconciled_at = ?, timezone = ?, updated_at = ?
     WHERE id = 1`,
    [
      flag(prefs.morningEnabled),
      prefs.morningHour,
      prefs.morningMinute,
      flag(prefs.eveningEnabled),
      prefs.eveningHour,
      prefs.eveningMinute,
      prefs.permissionStatus,
      prefs.lastReconciledAt,
      prefs.timezone,
      nowIso,
    ],
  );
}

export async function resetProgress(db: DbAdapter, nowIso: string): Promise<void> {
  await db.withTransaction(async () => {
    await db.exec('DELETE FROM assessments');
    await db.exec('DELETE FROM noted_misconceptions');
    await db.exec('DELETE FROM revision_items');
    await db.exec('DELETE FROM activity_events');
    await db.exec('DELETE FROM daily_activity');
    await db.exec('DELETE FROM concept_mastery');
    await db.exec('DELETE FROM learning_sessions');
    await db.exec('DELETE FROM learner_state');
    await db.run('INSERT INTO learner_state (id, created_at) VALUES (1, ?)', [nowIso]);
  });
}

export async function exportBackup(db: DbAdapter, curriculumVersion: string, nowIso: string): Promise<BackupFile> {
  const snapshot = await loadSnapshot(db);
  const learner = await db.get<{ created_at: string }>('SELECT created_at FROM learner_state WHERE id = 1');
  const allAssessments = await db.all<Record<string, unknown>>('SELECT * FROM assessments ORDER BY id');
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: nowIso,
    curriculumVersion,
    tables: {
      learner_state: [{ id: 1, created_at: learner?.created_at ?? nowIso }],
      learning_sessions: snapshot.sessions.map((session) => ({
        session_id: session.sessionId,
        status: session.status,
        answer_draft: session.answerDraft,
        hints_revealed: session.hintsRevealed,
        reference_revealed: flag(session.referenceRevealed),
        notes: session.notes,
        bookmarked: flag(session.bookmarked),
        started_at: session.startedAt,
        completed_at: session.completedAt,
        postponed_at: session.postponedAt,
        postpone_count: session.postponeCount,
        last_confidence: session.lastConfidence,
        updated_at: session.updatedAt,
      })),
      assessments: allAssessments.map(mapAssessment).map((row) => ({
        id: row.id,
        session_id: row.sessionId,
        rubric_json: row.rubricJson,
        rubric_score: row.rubricScore,
        confidence: row.confidence,
        hints_used: row.hintsUsed,
        reference_revealed: flag(row.referenceRevealed),
        grade: row.grade,
        created_at: row.createdAt,
      })),
      concept_mastery: snapshot.mastery.map((row) => ({
        concept_id: row.conceptId,
        attempt_count: row.attemptCount,
        last_rubric_score: row.lastRubricScore,
        last_confidence: row.lastConfidence,
        hint_usage_count: row.hintUsageCount,
        last_attempt_at: row.lastAttemptAt,
        last_successful_at: row.lastSuccessfulAt,
        next_review_at: row.nextReviewAt,
        interval_days: row.intervalDays,
        interval_index: row.intervalIndex,
        mastery_status: row.masteryStatus,
        updated_at: row.updatedAt,
      })),
      revision_items: snapshot.revisions.map((row) => ({
        id: row.id,
        concept_id: row.conceptId,
        session_id: row.sessionId,
        due_on: row.dueOn,
        reason: row.reason,
        status: row.status,
        created_at: row.createdAt,
        completed_at: row.completedAt,
      })),
      daily_activity: snapshot.activity.map((row) => ({
        local_date: row.localDate,
        completed_sessions: row.completedSessions,
        completed_revisions: row.completedRevisions,
        rest_day: flag(row.restDay),
        updated_at: row.updatedAt,
      })),
      activity_events: snapshot.events.map((row) => ({
        id: row.id,
        local_date: row.localDate,
        kind: row.kind,
        ref_id: row.refId,
        title: row.title,
        created_at: row.createdAt,
      })),
      noted_misconceptions: snapshot.misconceptions.map((row) => ({
        id: row.id,
        session_id: row.sessionId,
        concept_id: row.conceptId,
        misconception_id: row.misconceptionId,
        statement: row.statement,
        noted_on: row.notedOn,
        resolved_on: row.resolvedOn,
      })),
      notification_preferences: [
        {
          id: 1 as const,
          morning_enabled: flag(snapshot.notifications.morningEnabled),
          morning_hour: snapshot.notifications.morningHour,
          morning_minute: snapshot.notifications.morningMinute,
          evening_enabled: flag(snapshot.notifications.eveningEnabled),
          evening_hour: snapshot.notifications.eveningHour,
          evening_minute: snapshot.notifications.eveningMinute,
          permission_status: snapshot.notifications.permissionStatus,
          last_reconciled_at: snapshot.notifications.lastReconciledAt,
          timezone: snapshot.notifications.timezone,
          updated_at: snapshot.notifications.updatedAt,
        },
      ],
      app_settings: [
        {
          id: 1 as const,
          theme: snapshot.settings.theme,
          font_scale: snapshot.settings.fontScale,
          reduce_motion: flag(snapshot.settings.reduceMotion),
          updated_at: snapshot.settings.updatedAt,
        },
      ],
      curriculum_meta: [
        {
          id: 1 as const,
          bundled_version: snapshot.curriculumVersion,
          content_hash: snapshot.contentHash,
          updated_at: nowIso,
        },
      ],
    },
  };
}

export async function importBackup(db: DbAdapter, backup: BackupFile): Promise<void> {
  await db.withTransaction(async () => {
    await db.exec('DELETE FROM assessments');
    await db.exec('DELETE FROM noted_misconceptions');
    await db.exec('DELETE FROM revision_items');
    await db.exec('DELETE FROM activity_events');
    await db.exec('DELETE FROM daily_activity');
    await db.exec('DELETE FROM concept_mastery');
    await db.exec('DELETE FROM learning_sessions');
    await db.exec('DELETE FROM learner_state');
    await db.exec('DELETE FROM notification_preferences');
    await db.exec('DELETE FROM app_settings');
    await db.exec('DELETE FROM curriculum_meta');

    for (const row of backup.tables.learner_state) {
      await db.run('INSERT INTO learner_state (id, created_at) VALUES (?, ?)', [row.id, row.created_at]);
    }
    for (const row of backup.tables.learning_sessions) {
      await db.run(
        `INSERT INTO learning_sessions (
          session_id, status, answer_draft, hints_revealed, reference_revealed, notes, bookmarked,
          started_at, completed_at, postponed_at, postpone_count, last_confidence, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.session_id,
          row.status,
          row.answer_draft,
          row.hints_revealed,
          row.reference_revealed,
          row.notes,
          row.bookmarked,
          row.started_at,
          row.completed_at,
          row.postponed_at,
          row.postpone_count,
          row.last_confidence,
          row.updated_at,
        ],
      );
    }
    for (const row of backup.tables.assessments) {
      await db.run(
        `INSERT INTO assessments (
          id, session_id, rubric_json, rubric_score, confidence, hints_used, reference_revealed, grade, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.session_id,
          row.rubric_json,
          row.rubric_score,
          row.confidence,
          row.hints_used,
          row.reference_revealed,
          row.grade,
          row.created_at,
        ],
      );
    }
    for (const row of backup.tables.concept_mastery) {
      await db.run(
        `INSERT INTO concept_mastery (
          concept_id, attempt_count, last_rubric_score, last_confidence, hint_usage_count,
          last_attempt_at, last_successful_at, next_review_at, interval_days, interval_index,
          mastery_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.concept_id,
          row.attempt_count,
          row.last_rubric_score,
          row.last_confidence,
          row.hint_usage_count,
          row.last_attempt_at,
          row.last_successful_at,
          row.next_review_at,
          row.interval_days,
          row.interval_index,
          row.mastery_status,
          row.updated_at,
        ],
      );
    }
    for (const row of backup.tables.revision_items) {
      await db.run(
        `INSERT INTO revision_items (
          id, concept_id, session_id, due_on, reason, status, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.concept_id, row.session_id, row.due_on, row.reason, row.status, row.created_at, row.completed_at],
      );
    }
    for (const row of backup.tables.daily_activity) {
      await db.run(
        `INSERT INTO daily_activity (
          local_date, completed_sessions, completed_revisions, rest_day, updated_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [row.local_date, row.completed_sessions, row.completed_revisions, row.rest_day, row.updated_at],
      );
    }
    for (const row of backup.tables.activity_events) {
      await db.run(
        `INSERT INTO activity_events (id, local_date, kind, ref_id, title, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [row.id, row.local_date, row.kind, row.ref_id, row.title, row.created_at],
      );
    }
    for (const row of backup.tables.noted_misconceptions) {
      await db.run(
        `INSERT INTO noted_misconceptions (
          id, session_id, concept_id, misconception_id, statement, noted_on, resolved_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.session_id, row.concept_id, row.misconception_id, row.statement, row.noted_on, row.resolved_on],
      );
    }
    for (const row of backup.tables.notification_preferences) {
      await db.run(
        `INSERT INTO notification_preferences (
          id, morning_enabled, morning_hour, morning_minute, evening_enabled, evening_hour, evening_minute,
          permission_status, last_reconciled_at, timezone, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.morning_enabled,
          row.morning_hour,
          row.morning_minute,
          row.evening_enabled,
          row.evening_hour,
          row.evening_minute,
          row.permission_status,
          row.last_reconciled_at,
          row.timezone,
          row.updated_at,
        ],
      );
    }
    for (const row of backup.tables.app_settings) {
      await db.run(
        `INSERT INTO app_settings (id, theme, font_scale, reduce_motion, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [row.id, row.theme, row.font_scale, row.reduce_motion, row.updated_at],
      );
    }
    for (const row of backup.tables.curriculum_meta) {
      await db.run(
        `INSERT INTO curriculum_meta (id, bundled_version, content_hash, updated_at) VALUES (?, ?, ?, ?)`,
        [row.id, row.bundled_version, row.content_hash, row.updated_at],
      );
    }
  });
}

function mapAssessment(row: Record<string, unknown>): AssessmentRecord {
  return {
    id: Number(row.id),
    sessionId: String(row.session_id),
    rubricJson: String(row.rubric_json),
    rubricScore: Number(row.rubric_score),
    confidence: Number(row.confidence),
    hintsUsed: Number(row.hints_used),
    referenceRevealed: asBool(row.reference_revealed),
    grade: row.grade as AssessmentRecord['grade'],
    createdAt: String(row.created_at),
  };
}

function mapMastery(row: Record<string, unknown>): MasteryRecord {
  return {
    conceptId: String(row.concept_id),
    attemptCount: Number(row.attempt_count),
    lastRubricScore: row.last_rubric_score === null ? null : Number(row.last_rubric_score),
    lastConfidence: row.last_confidence === null ? null : Number(row.last_confidence),
    hintUsageCount: Number(row.hint_usage_count),
    lastAttemptAt: row.last_attempt_at === null ? null : String(row.last_attempt_at),
    lastSuccessfulAt: row.last_successful_at === null ? null : String(row.last_successful_at),
    nextReviewAt: row.next_review_at === null ? null : String(row.next_review_at),
    intervalDays: Number(row.interval_days),
    intervalIndex: Number(row.interval_index),
    masteryStatus: row.mastery_status as MasteryRecord['masteryStatus'],
    updatedAt: String(row.updated_at),
  };
}

function mapRevision(row: Record<string, unknown>): RevisionRecord {
  return {
    id: Number(row.id),
    conceptId: String(row.concept_id),
    sessionId: row.session_id === null ? null : String(row.session_id),
    dueOn: String(row.due_on),
    reason: row.reason as RevisionRecord['reason'],
    status: row.status as RevisionRecord['status'],
    createdAt: String(row.created_at),
    completedAt: row.completed_at === null ? null : String(row.completed_at),
  };
}

function mapActivity(row: Record<string, unknown>): ActivityRecord {
  return {
    localDate: String(row.local_date),
    completedSessions: Number(row.completed_sessions),
    completedRevisions: Number(row.completed_revisions),
    restDay: asBool(row.rest_day),
    updatedAt: String(row.updated_at),
  };
}

function mapEvent(row: Record<string, unknown>): ActivityEventRecord {
  return {
    id: Number(row.id),
    localDate: String(row.local_date),
    kind: row.kind as ActivityEventRecord['kind'],
    refId: row.ref_id === null ? null : String(row.ref_id),
    title: String(row.title),
    createdAt: String(row.created_at),
  };
}

function mapMisconception(row: Record<string, unknown>): MisconceptionRecord {
  return {
    id: Number(row.id),
    sessionId: String(row.session_id),
    conceptId: String(row.concept_id),
    misconceptionId: String(row.misconception_id),
    statement: String(row.statement),
    notedOn: String(row.noted_on),
    resolvedOn: row.resolved_on === null ? null : String(row.resolved_on),
  };
}

function mapNotifications(row: Record<string, unknown>): NotificationRecord {
  return {
    morningEnabled: asBool(row.morning_enabled),
    morningHour: Number(row.morning_hour),
    morningMinute: Number(row.morning_minute),
    eveningEnabled: asBool(row.evening_enabled),
    eveningHour: Number(row.evening_hour),
    eveningMinute: Number(row.evening_minute),
    permissionStatus: row.permission_status as NotificationRecord['permissionStatus'],
    lastReconciledAt: row.last_reconciled_at === null ? null : String(row.last_reconciled_at),
    timezone: row.timezone === null ? null : String(row.timezone),
    updatedAt: String(row.updated_at),
  };
}

function mapSettings(row: Record<string, unknown>): SettingsRecord {
  return {
    theme: row.theme as SettingsRecord['theme'],
    fontScale: row.font_scale as SettingsRecord['fontScale'],
    reduceMotion: asBool(row.reduce_motion),
    updatedAt: String(row.updated_at),
  };
}
