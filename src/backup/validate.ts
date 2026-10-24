import type { MasteryStatus, PerformanceGrade } from '../curriculum/types';

export const BACKUP_FORMAT = 'sysdapp.backup';
export const BACKUP_FORMAT_VERSION = 1;
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;

const SESSION_ID = /^day\.\d{3}\.(morning|evening)$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  curriculumVersion: string;
  tables: BackupTables;
};

export type BackupTables = {
  learner_state: LearnerRow[];
  learning_sessions: SessionRow[];
  assessments: AssessmentRow[];
  concept_mastery: MasteryRow[];
  revision_items: RevisionRow[];
  daily_activity: ActivityRow[];
  activity_events: EventRow[];
  noted_misconceptions: MisconceptionRow[];
  notification_preferences: NotificationRow[];
  app_settings: SettingsRow[];
  curriculum_meta: MetaRow[];
};

export type LearnerRow = { id: number; created_at: string };
export type SessionRow = {
  session_id: string;
  status: 'in_progress' | 'completed' | 'postponed';
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
export type AssessmentRow = {
  id: number;
  session_id: string;
  rubric_json: string;
  rubric_score: number;
  confidence: number;
  hints_used: number;
  reference_revealed: number;
  grade: PerformanceGrade;
  created_at: string;
};
export type MasteryRow = {
  concept_id: string;
  attempt_count: number;
  last_rubric_score: number | null;
  last_confidence: number | null;
  hint_usage_count: number;
  last_attempt_at: string | null;
  last_successful_at: string | null;
  next_review_at: string | null;
  interval_days: number;
  interval_index: number;
  mastery_status: MasteryStatus;
  updated_at: string;
};
export type RevisionRow = {
  id: number;
  concept_id: string;
  session_id: string | null;
  due_on: string;
  reason: 'struggle' | 'prerequisite' | 'interval';
  status: 'scheduled' | 'completed' | 'dismissed';
  created_at: string;
  completed_at: string | null;
};
export type ActivityRow = {
  local_date: string;
  completed_sessions: number;
  completed_revisions: number;
  rest_day: number;
  updated_at: string;
};
export type EventRow = {
  id: number;
  local_date: string;
  kind: 'session_completed' | 'revision_completed' | 'rest_marked';
  ref_id: string | null;
  title: string;
  created_at: string;
};
export type MisconceptionRow = {
  id: number;
  session_id: string;
  concept_id: string;
  misconception_id: string;
  statement: string;
  noted_on: string;
  resolved_on: string | null;
};
export type NotificationRow = {
  id: number;
  morning_enabled: number;
  morning_hour: number;
  morning_minute: number;
  evening_enabled: number;
  evening_hour: number;
  evening_minute: number;
  permission_status: string;
  last_reconciled_at: string | null;
  timezone: string | null;
  updated_at: string;
};
export type SettingsRow = {
  id: number;
  theme: 'system' | 'light' | 'dark';
  font_scale: 'compact' | 'default' | 'large';
  reduce_motion: number;
  updated_at: string;
};
export type MetaRow = {
  id: number;
  bundled_version: string;
  content_hash: string;
  updated_at: string;
};

export type BackupResult = { ok: true; value: BackupFile } | { ok: false; error: string };

const TABLE_KEYS: (keyof BackupTables)[] = [
  'learner_state',
  'learning_sessions',
  'assessments',
  'concept_mastery',
  'revision_items',
  'daily_activity',
  'activity_events',
  'noted_misconceptions',
  'notification_preferences',
  'app_settings',
  'curriculum_meta',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);
}

function text(value: unknown, max = 20000): value is string {
  return typeof value === 'string' && value.length <= max;
}

function optionalText(value: unknown, max = 20000): value is string | null {
  return value === null || text(value, max);
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function flag(value: unknown): value is number {
  return value === 0 || value === 1;
}

function score(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function dateOnly(value: unknown): value is string {
  return text(value, 10) && DATE_ONLY.test(value);
}

function timestamp(value: unknown): value is string {
  return text(value, 40) && ISO_TIME.test(value);
}

function optionalTimestamp(value: unknown): value is string | null {
  return value === null || timestamp(value);
}

export function validateBackup(input: unknown, byteLength = 0): BackupResult {
  if (byteLength > MAX_BACKUP_BYTES) {
    return { ok: false, error: 'The backup is larger than 8 MB.' };
  }
  if (!isRecord(input)) return { ok: false, error: 'The backup must be a JSON object.' };
  if (!onlyKeys(input, ['format', 'formatVersion', 'exportedAt', 'curriculumVersion', 'tables'])) {
    return { ok: false, error: 'The backup contains unexpected fields.' };
  }
  if (input.format !== BACKUP_FORMAT || input.formatVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, error: 'This file is not a System Design Academy backup.' };
  }
  if (!timestamp(input.exportedAt) || !text(input.curriculumVersion, 40)) {
    return { ok: false, error: 'The backup header is invalid.' };
  }
  if (!isRecord(input.tables) || !onlyKeys(input.tables, TABLE_KEYS)) {
    return { ok: false, error: 'The backup tables are missing or unexpected.' };
  }

  const tables = input.tables;
  const limits: Record<keyof BackupTables, number> = {
    learner_state: 1,
    learning_sessions: 2000,
    assessments: 20000,
    concept_mastery: 2000,
    revision_items: 20000,
    daily_activity: 5000,
    activity_events: 50000,
    noted_misconceptions: 20000,
    notification_preferences: 1,
    app_settings: 1,
    curriculum_meta: 1,
  };

  for (const key of TABLE_KEYS) {
    const rows = tables[key];
    if (!Array.isArray(rows) || rows.length > limits[key]) {
      return { ok: false, error: `The ${key} table is invalid.` };
    }
  }

  try {
    const value: BackupFile = {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: input.exportedAt,
      curriculumVersion: input.curriculumVersion,
      tables: {
        learner_state: (tables.learner_state as unknown[]).map(parseLearner),
        learning_sessions: (tables.learning_sessions as unknown[]).map(parseSession),
        assessments: (tables.assessments as unknown[]).map(parseAssessment),
        concept_mastery: (tables.concept_mastery as unknown[]).map(parseMastery),
        revision_items: (tables.revision_items as unknown[]).map(parseRevision),
        daily_activity: (tables.daily_activity as unknown[]).map(parseActivity),
        activity_events: (tables.activity_events as unknown[]).map(parseEvent),
        noted_misconceptions: (tables.noted_misconceptions as unknown[]).map(parseMisconception),
        notification_preferences: (tables.notification_preferences as unknown[]).map(parseNotification),
        app_settings: (tables.app_settings as unknown[]).map(parseSettings),
        curriculum_meta: (tables.curriculum_meta as unknown[]).map(parseMeta),
      },
    };
    const sessionIds = new Set(value.tables.learning_sessions.map((row) => row.session_id));
    if (value.tables.assessments.some((row) => !sessionIds.has(row.session_id))) {
      return { ok: false, error: 'An assessment refers to a missing session.' };
    }
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'The backup could not be validated.' };
  }
}

function row(value: unknown, keys: string[]): Record<string, unknown> {
  if (!isRecord(value) || !onlyKeys(value, keys)) {
    throw new Error('A backup row has missing or unexpected fields.');
  }
  return value;
}

function parseLearner(value: unknown): LearnerRow {
  const record = row(value, ['id', 'created_at']);
  if (record.id !== 1 || !timestamp(record.created_at)) throw new Error('Learner state is invalid.');
  return { id: 1, created_at: record.created_at };
}

function parseSession(value: unknown): SessionRow {
  const record = row(value, [
    'session_id',
    'status',
    'answer_draft',
    'hints_revealed',
    'reference_revealed',
    'notes',
    'bookmarked',
    'started_at',
    'completed_at',
    'postponed_at',
    'postpone_count',
    'last_confidence',
    'updated_at',
  ]);
  if (!text(record.session_id, 40) || !SESSION_ID.test(record.session_id)) {
    throw new Error('A session id is invalid.');
  }
  if (!oneOf(record.status, ['in_progress', 'completed', 'postponed'] as const)) {
    throw new Error('A session status is invalid.');
  }
  if (!text(record.answer_draft, 20000) || !text(record.notes, 20000) || !timestamp(record.updated_at)) {
    throw new Error('A session row is invalid.');
  }
  if (!integer(record.hints_revealed, 0, 20) || !flag(record.reference_revealed) || !flag(record.bookmarked)) {
    throw new Error('A session row is invalid.');
  }
  if (!optionalTimestamp(record.started_at) || !optionalTimestamp(record.completed_at) || !optionalTimestamp(record.postponed_at)) {
    throw new Error('A session timestamp is invalid.');
  }
  if (!integer(record.postpone_count, 0, 10000)) throw new Error('A postpone count is invalid.');
  if (!(record.last_confidence === null || integer(record.last_confidence, 1, 5))) {
    throw new Error('A confidence value is invalid.');
  }
  return record as SessionRow;
}

function parseAssessment(value: unknown): AssessmentRow {
  const record = row(value, [
    'id',
    'session_id',
    'rubric_json',
    'rubric_score',
    'confidence',
    'hints_used',
    'reference_revealed',
    'grade',
    'created_at',
  ]);
  if (!integer(record.id, 1, 1_000_000_000) || !text(record.session_id, 40) || !SESSION_ID.test(record.session_id)) {
    throw new Error('An assessment id is invalid.');
  }
  if (!text(record.rubric_json, 20000) || !score(record.rubric_score) || !integer(record.confidence, 1, 5)) {
    throw new Error('An assessment score is invalid.');
  }
  if (!integer(record.hints_used, 0, 20) || !flag(record.reference_revealed)) {
    throw new Error('An assessment row is invalid.');
  }
  if (!oneOf(record.grade, ['struggle', 'shaky', 'solid'] as const) || !timestamp(record.created_at)) {
    throw new Error('An assessment row is invalid.');
  }
  const parsed: unknown = JSON.parse(record.rubric_json);
  if (!isRecord(parsed)) throw new Error('Rubric JSON is invalid.');
  for (const mark of Object.values(parsed)) {
    if (!oneOf(mark, ['understood_independently', 'understood_with_hint', 'not_understood'] as const)) {
      throw new Error('A rubric mark is invalid.');
    }
  }
  return record as AssessmentRow;
}

function parseMastery(value: unknown): MasteryRow {
  const record = row(value, [
    'concept_id',
    'attempt_count',
    'last_rubric_score',
    'last_confidence',
    'hint_usage_count',
    'last_attempt_at',
    'last_successful_at',
    'next_review_at',
    'interval_days',
    'interval_index',
    'mastery_status',
    'updated_at',
  ]);
  if (!text(record.concept_id, 80) || !record.concept_id.startsWith('concept.')) {
    throw new Error('A concept id is invalid.');
  }
  if (!integer(record.attempt_count, 0, 100000) || !integer(record.hint_usage_count, 0, 100000)) {
    throw new Error('A mastery count is invalid.');
  }
  if (!(record.last_rubric_score === null || score(record.last_rubric_score))) {
    throw new Error('A mastery score is invalid.');
  }
  if (!(record.last_confidence === null || integer(record.last_confidence, 1, 5))) {
    throw new Error('A mastery confidence is invalid.');
  }
  if (!optionalTimestamp(record.last_attempt_at) || !optionalTimestamp(record.last_successful_at)) {
    throw new Error('A mastery timestamp is invalid.');
  }
  if (!(record.next_review_at === null || dateOnly(record.next_review_at))) {
    throw new Error('A review date is invalid.');
  }
  if (!integer(record.interval_days, 0, 3650) || !integer(record.interval_index, 0, 5)) {
    throw new Error('A review interval is invalid.');
  }
  if (!oneOf(record.mastery_status, ['unseen', 'learning', 'weak', 'reviewing', 'mastered'] as const)) {
    throw new Error('A mastery status is invalid.');
  }
  if (!timestamp(record.updated_at)) throw new Error('A mastery timestamp is invalid.');
  return record as MasteryRow;
}

function parseRevision(value: unknown): RevisionRow {
  const record = row(value, ['id', 'concept_id', 'session_id', 'due_on', 'reason', 'status', 'created_at', 'completed_at']);
  if (!integer(record.id, 1, 1_000_000_000) || !text(record.concept_id, 80) || !record.concept_id.startsWith('concept.')) {
    throw new Error('A revision row is invalid.');
  }
  if (!(record.session_id === null || (text(record.session_id, 40) && SESSION_ID.test(record.session_id)))) {
    throw new Error('A revision session id is invalid.');
  }
  if (!dateOnly(record.due_on) || !timestamp(record.created_at) || !optionalTimestamp(record.completed_at)) {
    throw new Error('A revision date is invalid.');
  }
  if (!oneOf(record.reason, ['struggle', 'prerequisite', 'interval'] as const)) {
    throw new Error('A revision reason is invalid.');
  }
  if (!oneOf(record.status, ['scheduled', 'completed', 'dismissed'] as const)) {
    throw new Error('A revision status is invalid.');
  }
  return record as RevisionRow;
}

function parseActivity(value: unknown): ActivityRow {
  const record = row(value, ['local_date', 'completed_sessions', 'completed_revisions', 'rest_day', 'updated_at']);
  if (!dateOnly(record.local_date) || !integer(record.completed_sessions, 0, 1000) || !integer(record.completed_revisions, 0, 1000)) {
    throw new Error('An activity row is invalid.');
  }
  if (!flag(record.rest_day) || !timestamp(record.updated_at)) throw new Error('An activity row is invalid.');
  return record as ActivityRow;
}

function parseEvent(value: unknown): EventRow {
  const record = row(value, ['id', 'local_date', 'kind', 'ref_id', 'title', 'created_at']);
  if (!integer(record.id, 1, 1_000_000_000) || !dateOnly(record.local_date) || !text(record.title, 200) || !timestamp(record.created_at)) {
    throw new Error('An activity event is invalid.');
  }
  if (!oneOf(record.kind, ['session_completed', 'revision_completed', 'rest_marked'] as const)) {
    throw new Error('An activity event is invalid.');
  }
  if (!optionalText(record.ref_id, 80)) throw new Error('An activity event is invalid.');
  return record as EventRow;
}

function parseMisconception(value: unknown): MisconceptionRow {
  const record = row(value, ['id', 'session_id', 'concept_id', 'misconception_id', 'statement', 'noted_on', 'resolved_on']);
  if (!integer(record.id, 1, 1_000_000_000) || !text(record.session_id, 40) || !SESSION_ID.test(record.session_id)) {
    throw new Error('A misconception row is invalid.');
  }
  if (!text(record.concept_id, 80) || !text(record.misconception_id, 80) || !text(record.statement, 1000)) {
    throw new Error('A misconception row is invalid.');
  }
  if (!dateOnly(record.noted_on) || !(record.resolved_on === null || dateOnly(record.resolved_on))) {
    throw new Error('A misconception date is invalid.');
  }
  return record as MisconceptionRow;
}

function parseNotification(value: unknown): NotificationRow {
  const record = row(value, [
    'id',
    'morning_enabled',
    'morning_hour',
    'morning_minute',
    'evening_enabled',
    'evening_hour',
    'evening_minute',
    'permission_status',
    'last_reconciled_at',
    'timezone',
    'updated_at',
  ]);
  if (record.id !== 1 || !flag(record.morning_enabled) || !flag(record.evening_enabled)) {
    throw new Error('Notification preferences are invalid.');
  }
  if (!integer(record.morning_hour, 0, 23) || !integer(record.evening_hour, 0, 23)) {
    throw new Error('A reminder hour is invalid.');
  }
  if (!integer(record.morning_minute, 0, 59) || !integer(record.evening_minute, 0, 59)) {
    throw new Error('A reminder minute is invalid.');
  }
  if (!oneOf(record.permission_status, ['granted', 'denied', 'undetermined', 'unsupported'] as const)) {
    throw new Error('A permission status is invalid.');
  }
  if (!optionalTimestamp(record.last_reconciled_at) || !optionalText(record.timezone, 80) || !timestamp(record.updated_at)) {
    throw new Error('Notification preferences are invalid.');
  }
  return record as NotificationRow;
}

function parseSettings(value: unknown): SettingsRow {
  const record = row(value, ['id', 'theme', 'font_scale', 'reduce_motion', 'updated_at']);
  if (record.id !== 1 || !flag(record.reduce_motion) || !timestamp(record.updated_at)) {
    throw new Error('Settings are invalid.');
  }
  if (!oneOf(record.theme, ['system', 'light', 'dark'] as const)) throw new Error('Theme is invalid.');
  if (!oneOf(record.font_scale, ['compact', 'default', 'large'] as const)) throw new Error('Text size is invalid.');
  return record as SettingsRow;
}

function parseMeta(value: unknown): MetaRow {
  const record = row(value, ['id', 'bundled_version', 'content_hash', 'updated_at']);
  if (record.id !== 1 || !text(record.bundled_version, 40) || !text(record.content_hash, 80) || !timestamp(record.updated_at)) {
    throw new Error('Curriculum metadata is invalid.');
  }
  return record as MetaRow;
}
