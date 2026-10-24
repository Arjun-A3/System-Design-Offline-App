import type { DbAdapter } from './adapter';
import { MIGRATIONS } from './migrations';

const ADD_COLUMN = /^\s*ALTER\s+TABLE\s+([A-Za-z_][A-Za-z0-9_]*)\s+ADD\s+COLUMN\s+([A-Za-z_][A-Za-z0-9_]*)\b/i;
const CREATE_TABLE = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z_][A-Za-z0-9_]*)/i;

export async function migrate(db: DbAdapter, migrations = MIGRATIONS): Promise<number> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);

  // An interrupted launch can record a version and then roll the new tables back.
  // Forget that record so the statements run again. They use IF NOT EXISTS, so rows already stored are kept.
  if (await requiredTablesMissing(db, migrations)) {
    await db.exec('DELETE FROM schema_migrations');
  }

  for (const migration of migrations) {
    const appliedRows = await db.all<{ version: number }>('SELECT version FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => Number(row.version)));
    if (applied.has(migration.version)) continue;
    const latest = applied.size > 0 ? Math.max(...applied) : 0;
    if (migration.version !== latest + 1) {
      throw new Error(`Refusing to apply migration ${migration.version} before ${latest + 1}.`);
    }
    for (const statement of migration.statements) {
      if (await columnAlreadyAdded(db, statement)) continue;
      await db.exec(statement);
    }
    await db.run(
      'INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
      [migration.version, migration.name, new Date().toISOString()],
    );
  }

  const appliedRows = await db.all<{ version: number }>('SELECT version FROM schema_migrations');
  const latest = appliedRows.reduce((max, row) => Math.max(max, Number(row.version)), 0);
  await db.exec(`PRAGMA user_version = ${latest}`);
  return latest;
}

async function requiredTablesMissing(db: DbAdapter, migrations: typeof MIGRATIONS): Promise<boolean> {
  const required = migrations.flatMap((migration) =>
    migration.statements.flatMap((statement) => {
      const match = CREATE_TABLE.exec(statement);
      return match ? [match[1]] : [];
    }),
  );
  const existing = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
  const names = new Set(existing.map((row) => row.name));
  return required.some((table) => !names.has(table));
}

async function columnAlreadyAdded(db: DbAdapter, statement: string): Promise<boolean> {
  const match = ADD_COLUMN.exec(statement);
  if (!match) return false;
  const [, table, column] = match;
  const columns = await db.all<{ name: string }>(`PRAGMA table_info(${table})`);
  return columns.some((item) => item.name === column);
}
