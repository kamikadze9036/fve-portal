import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let sqlite: Database.Database | undefined;

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
