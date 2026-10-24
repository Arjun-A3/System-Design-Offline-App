import * as SQLite from 'expo-sqlite';

import type { DbAdapter } from './adapter';
import { createExpoAdapter } from './expoAdapter';
import { migrate } from './migrate';

const DB_KEY = '__sysdappDb';

type DbGlobal = typeof globalThis & { [DB_KEY]?: Promise<DbAdapter> };

export function openAppDatabase(): Promise<DbAdapter> {
  const g = globalThis as DbGlobal;
  if (!g[DB_KEY]) {
    g[DB_KEY] = openAndMigrate().catch((error) => {
      g[DB_KEY] = undefined;
      throw error;
    });
  }
  return g[DB_KEY];
}

async function openAndMigrate(): Promise<DbAdapter> {
  const sqlite = await SQLite.openDatabaseAsync('sysdapp.db');
  const db = createExpoAdapter(sqlite);
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec('PRAGMA journal_mode = WAL');
  await migrate(db);
  return db;
}
