import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const databasePath = process.env.DATABASE_PATH ?? '/data/fve.db';
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

try {
  const appTables = sqlite
    .prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('electricity_readings', 'water_readings', 'heat_pump_readings')
  `)
    .all();
  const drizzleJournal = sqlite
    .prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = '__drizzle_migrations'
  `)
    .get();

  if (appTables.length > 0 && !drizzleJournal) {
    throw new Error(
      `Databáze ${databasePath} už obsahuje data z původního D1/Miniflare provozu. ` +
        'Nelze na ni bezpečně spustit Drizzle migrace bez jednorázového baseline importu. ' +
        'Použijte novou cestu /data/fve.db, nebo nejdřív proveďte řízený import.',
    );
  }

  migrate(drizzle(sqlite), { migrationsFolder: './drizzle' });
} finally {
  sqlite.close();
}
