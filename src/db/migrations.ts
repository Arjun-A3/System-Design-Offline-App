export type Migration = {
  version: number;
  name: string;
  statements: string[];
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_learning_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS learner_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        morning_enabled INTEGER NOT NULL DEFAULT 1,
        morning_hour INTEGER NOT NULL DEFAULT 8,
        morning_minute INTEGER NOT NULL DEFAULT 0,
        evening_enabled INTEGER NOT NULL DEFAULT 1,
        evening_hour INTEGER NOT NULL DEFAULT 20,
        evening_minute INTEGER NOT NULL DEFAULT 0,
        permission_status TEXT NOT NULL DEFAULT 'undetermined',
        last_reconciled_at TEXT,
        timezone TEXT,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        theme TEXT NOT NULL DEFAULT 'system',
        font_scale TEXT NOT NULL DEFAULT 'default',
        reduce_motion INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS curriculum_meta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        bundled_version TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS learning_sessions (
        session_id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'postponed')),
        answer_draft TEXT NOT NULL DEFAULT '',
        hints_revealed INTEGER NOT NULL DEFAULT 0,
        reference_revealed INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        bookmarked INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        postponed_at TEXT,
        postpone_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        rubric_json TEXT NOT NULL,
        rubric_score REAL NOT NULL,
        confidence INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 5),
        hints_used INTEGER NOT NULL,
        reference_revealed INTEGER NOT NULL,
        grade TEXT NOT NULL CHECK (grade IN ('struggle', 'shaky', 'solid')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES learning_sessions(session_id)
      )`,
      `CREATE TABLE IF NOT EXISTS concept_mastery (
        concept_id TEXT PRIMARY KEY,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_rubric_score REAL,
        last_confidence INTEGER,
        hint_usage_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        last_successful_at TEXT,
        next_review_at TEXT,
        interval_days INTEGER NOT NULL DEFAULT 0,
        interval_index INTEGER NOT NULL DEFAULT 0,
        mastery_status TEXT NOT NULL DEFAULT 'unseen',
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS revision_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        concept_id TEXT NOT NULL,
        session_id TEXT,
        due_on TEXT NOT NULL,
        reason TEXT NOT NULL CHECK (reason IN ('struggle', 'prerequisite', 'interval')),
        status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'dismissed')),
        created_at TEXT NOT NULL,
        completed_at TEXT
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_revision_open
        ON revision_items(concept_id, due_on, reason)
        WHERE status = 'scheduled'`,
      `CREATE TABLE IF NOT EXISTS daily_activity (
        local_date TEXT PRIMARY KEY,
        completed_sessions INTEGER NOT NULL DEFAULT 0,
        completed_revisions INTEGER NOT NULL DEFAULT 0,
        rest_day INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS activity_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_date TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('session_completed', 'revision_completed', 'rest_marked')),
        ref_id TEXT,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS noted_misconceptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        concept_id TEXT NOT NULL,
        misconception_id TEXT NOT NULL,
        statement TEXT NOT NULL,
        noted_on TEXT NOT NULL,
        resolved_on TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_assessments_session ON assessments(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_revision_due ON revision_items(status, due_on)`,
      `CREATE INDEX IF NOT EXISTS idx_events_date ON activity_events(local_date)`,
      `CREATE INDEX IF NOT EXISTS idx_mastery_review ON concept_mastery(next_review_at)`,
    ],
  },
  {
    version: 2,
    name: 'session_last_confidence',
    statements: [`ALTER TABLE learning_sessions ADD COLUMN last_confidence INTEGER`],
  },
];
