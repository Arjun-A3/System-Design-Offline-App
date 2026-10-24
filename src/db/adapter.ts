export type SqlParam = string | number | null;
export type SqlParams = SqlParam[];

export type RunResult = {
  changes: number;
  lastInsertRowId: number;
};

export interface DbAdapter {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<RunResult>;
  get<T extends Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T | null>;
  all<T extends Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T[]>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
