import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { electricityIntervalRecords, intervalFieldSources } from '@/db/schema';

export const intervalFields = ['pndImportKwh', 'pndExportKwh', 'inverterImportKwh', 'inverterExportKwh', 'pvGenerationKwh', 'houseConsumptionKwh', 'pvSelfUseReportedKwh', 'purchaseCostCzk', 'saleRevenueCzk', 'gridBalancingCzk'] as const;
export type IntervalField = typeof intervalFields[number];
export type IntervalValues = Partial<Record<IntervalField, number | null>>;

export async function upsertIntervalRecord(input: { intervalStart: string; intervalEnd: string; source: string; fields: IntervalValues; sourceSheet?: string }) {
  const db = getDb();
  const fields = Object.fromEntries(Object.entries(input.fields).filter(([key]) => intervalFields.includes(key as IntervalField))) as IntervalValues;
  const [existing] = await db.select().from(electricityIntervalRecords).where(and(eq(electricityIntervalRecords.intervalStart, input.intervalStart), eq(electricityIntervalRecords.intervalEnd, input.intervalEnd))).limit(1);
  const record = existing
    ? (await db.update(electricityIntervalRecords).set({ ...fields, updatedAt: new Date().toISOString() }).where(eq(electricityIntervalRecords.id, existing.id)).returning())[0]
    : (await db.insert(electricityIntervalRecords).values({ intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, sourceSheet: input.sourceSheet ?? 'Ruční záznam', ...fields }).returning())[0];
  for (const fieldName of Object.keys(fields)) {
    await db.insert(intervalFieldSources).values({ recordId: record.id, fieldName, source: input.source })
      .onConflictDoUpdate({ target: [intervalFieldSources.recordId, intervalFieldSources.fieldName], set: { source: input.source, capturedAt: new Date().toISOString() } });
  }
  return record;
}

export function lastDayOfMonth(period: string) {
  const [year, month] = period.slice(0, 7).split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
