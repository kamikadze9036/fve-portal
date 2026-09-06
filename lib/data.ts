import { asc, eq, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { appMetadata, electricityIntervalRecords, electricityMeterReadings, electricityReadings, heatPumpMeterReadings, heatPumpReadings, waterMeterReadings, waterReadings } from '@/db/schema';
import { electricitySeed, heatPumpSeed, waterSeed } from '@/lib/seed-data';

const DATASET_VERSION = '2026-09-05-v2';
let importInFlight: Promise<void> | undefined;

async function insertChunks<T>(items: readonly T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let index = 0; index < items.length; index += 5) {
    await insert(items.slice(index, index + 5) as T[]);
  }
}

export async function ensureImportedData() {
  if (importInFlight) return importInFlight;
  importInFlight = ensureImportedDataOnce().finally(() => { importInFlight = undefined; });
  return importInFlight;
}

async function ensureImportedDataOnce() {
  const db = getDb();
  const [version] = await db.select().from(appMetadata).where(eq(appMetadata.key, 'dataset_version')).limit(1);
  if (version?.value === DATASET_VERSION) return;

  // Refresh workbook imports while preserving any readings entered manually in the app.
  await db.delete(electricityReadings).where(ne(electricityReadings.sourceSheet, 'Ruční záznam'));
  await db.delete(waterReadings);
  await db.delete(heatPumpReadings);
  await insertChunks(electricitySeed, (chunk) => db.insert(electricityReadings).values(chunk.map((row) => ({ ...row }))).onConflictDoNothing());
  await insertChunks(waterSeed, (chunk) => db.insert(waterReadings).values(chunk.map((row) => ({ ...row }))).onConflictDoNothing());
  await insertChunks(heatPumpSeed, (chunk) => db.insert(heatPumpReadings).values(chunk.map((row) => ({ ...row }))).onConflictDoNothing());
  await db.insert(appMetadata).values({ key: 'dataset_version', value: DATASET_VERSION })
    .onConflictDoUpdate({ target: appMetadata.key, set: { value: DATASET_VERSION } });
}

export async function getAllData() {
  await ensureImportedData();
  const db = getDb();
  const [electricity, water, heatPump, electricityMeters, electricityIntervals, waterMeters, heatPumpMeters] = await Promise.all([
    db.select().from(electricityReadings).orderBy(asc(electricityReadings.period)),
    db.select().from(waterReadings).orderBy(asc(waterReadings.measuredAt)),
    db.select().from(heatPumpReadings).orderBy(asc(heatPumpReadings.period)),
    db.select().from(electricityMeterReadings).orderBy(asc(electricityMeterReadings.readingDate)),
    db.select().from(electricityIntervalRecords).orderBy(asc(electricityIntervalRecords.intervalStart)),
    db.select().from(waterMeterReadings).orderBy(asc(waterMeterReadings.measuredAt)),
    db.select().from(heatPumpMeterReadings).orderBy(asc(heatPumpMeterReadings.measuredAt)),
  ]);
  return { electricity, water, heatPump, electricityMeters, electricityIntervals, waterMeters, heatPumpMeters };
}
