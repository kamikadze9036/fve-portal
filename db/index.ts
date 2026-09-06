import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let sqlite: Database.Database | undefined;
let writeQueue: Promise<void> = Promise.resolve();

function getSqlite() {
  if (sqlite) return sqlite;

  const databasePath = process.env.DATABASE_PATH ?? '/data/fve.db';
  mkdirSync(dirname(databasePath), { recursive: true });
  sqlite = new Database(databasePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}

// A collector write spans several statements and must not race the initial
// workbook seed after a container restart.
export function serializeWrite<T>(operation: () => Promise<T>) {
  const task = writeQueue.then(operation, operation);
  writeQueue = task.then(() => undefined, () => undefined);
  return task;
}
