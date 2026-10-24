import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_BACKUP_BYTES, validateBackup, type BackupFile } from '../src/backup/validate.ts';

const now = '2026-04-02T04:00:00.000Z';

function backup(overrides: Partial<BackupFile> = {}): BackupFile {
  return {
    format: 'sysdapp.backup',
    formatVersion: 1,
    exportedAt: now,
    curriculumVersion: '2026.10.1',
    tables: {
      learner_state: [{ id: 1, created_at: now }],
      learning_sessions: [
        {
          session_id: 'day.001.morning',
          status: 'in_progress',
          answer_draft: 'A process isolates memory.',
          hints_revealed: 1,
          reference_revealed: 0,
          notes: '',
          bookmarked: 1,
          started_at: now,
          completed_at: null,
          postponed_at: null,
          postpone_count: 0,
          last_confidence: null,
          updated_at: now,
        },
      ],
      assessments: [],
      concept_mastery: [],
      revision_items: [],
      daily_activity: [],
      activity_events: [],
      noted_misconceptions: [],
      notification_preferences: [
        {
          id: 1,
          morning_enabled: 1,
          morning_hour: 8,
          morning_minute: 0,
          evening_enabled: 1,
          evening_hour: 20,
          evening_minute: 0,
          permission_status: 'undetermined',
          last_reconciled_at: null,
          timezone: 'Asia/Kolkata',
          updated_at: now,
        },
      ],
      app_settings: [{ id: 1, theme: 'system', font_scale: 'default', reduce_motion: 0, updated_at: now }],
      curriculum_meta: [{ id: 1, bundled_version: '2026.10.1', content_hash: '29ef46ce', updated_at: now }],
    },
    ...overrides,
  };
}

test('a well-formed backup is accepted and tampering is rejected', () => {
  const valid = validateBackup(backup());
  assert.equal(valid.ok, true);
  const extra = backup() as BackupFile & { token: string };
  extra.token = 'nope';
  assert.equal(validateBackup(extra).ok, false);
  const injected = backup();
  injected.tables.learning_sessions[0] = {
    ...injected.tables.learning_sessions[0],
    session_id: "day.001.morning'); DROP TABLE learning_sessions;--",
  };
  assert.equal(validateBackup(injected).ok, false);
  assert.equal(validateBackup('{', 1).ok, false);
  const oversized = validateBackup(backup(), MAX_BACKUP_BYTES + 1);
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.match(oversized.error, /8 MB/);
});
