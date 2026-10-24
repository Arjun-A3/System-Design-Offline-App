import { DatabaseSync } from 'node:sqlite';

import type { DbAdapter, SqlParams } from '../../src/db/adapter.ts';

export function openMemoryDatabase(): DbAdapter {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params: SqlParams = []) {
      const info = db.prepare(sql).run(...params);
      return { changes: Number(info.changes), lastInsertRowId: Number(info.lastInsertRowid) };
    },
    async get(sql, params: SqlParams = []) {
      const row = db.prepare(sql).get(...params);
      return (row as Record<string, unknown> | undefined) ?? null;
    },
    async all(sql, params: SqlParams = []) {
      return db.prepare(sql).all(...params) as Record<string, unknown>[];
    },
    async withTransaction(fn) {
      db.exec('BEGIN');
      try {
        const result = await fn();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
