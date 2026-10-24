import type { SQLiteDatabase } from 'expo-sqlite';

import type { DbAdapter, SqlParams } from './adapter';

export function createExpoAdapter(db: SQLiteDatabase): DbAdapter {
  return {
    exec: (sql) => db.execAsync(sql),
    async run(sql, params: SqlParams = []) {
      const result = params.length > 0 ? await db.runAsync(sql, params) : await db.runAsync(sql);
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowId) };
    },
    async get<T extends Record<string, unknown>>(sql: string, params: SqlParams = []) {
      const row = params.length > 0 ? await db.getFirstAsync<T>(sql, params) : await db.getFirstAsync<T>(sql);
      return row ?? null;
    },
    async all<T extends Record<string, unknown>>(sql: string, params: SqlParams = []) {
      const rows = params.length > 0 ? await db.getAllAsync<T>(sql, params) : await db.getAllAsync<T>(sql);
      return rows;
    },
    async withTransaction(fn) {
      let result!: Awaited<ReturnType<typeof fn>>;
      await db.withTransactionAsync(async () => {
        result = await fn();
      });
      return result;
    },
  };
}
