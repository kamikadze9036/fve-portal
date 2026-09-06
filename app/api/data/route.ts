import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, serializeWrite } from '@/db';
import { electricityReadings } from '@/db/schema';
import { getAllData } from '@/lib/data';
import { lastDayOfMonth, upsertIntervalRecord } from '@/lib/interval-records';

const numericKeys = [
  'meterNtKwh', 'meterVtKwh', 'pndExportKwh', 'gridImportKwh', 'pvGenerationKwh',
  'pvSelfUseReportedKwh', 'gridExportKwh', 'pvPurchaseKwh', 'saleRevenueCzk',
  'flexibilityRevenueCzk', 'purchaseCostCzk',
] as const;

export async function GET() {
  try {
    return NextResponse.json(await getAllData());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Data se nepodařilo načíst.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    if (typeof input.period !== 'string' || !/^\d{4}-\d{2}-01$/.test(input.period)) {
      return NextResponse.json({ error: 'Období musí být první den měsíce.' }, { status: 400 });
    }
    const values: Record<string, string | number | null> = {
      period: input.period,
      sourceSheet: 'Ruční záznam',
      sourceDate: input.period,
    };
    for (const key of numericKeys) {
      const value = input[key];
      if (value == null || value === '') values[key] = null;
      else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: `Pole ${key} musí být nezáporné číslo.` }, { status: 400 });
      } else values[key] = value;
    }
    const intervalFields = {
      pndImportKwh: values.gridImportKwh as number | null,
      pndExportKwh: values.pndExportKwh as number | null,
      inverterImportKwh: values.pvPurchaseKwh as number | null,
      inverterExportKwh: values.gridExportKwh as number | null,
      pvGenerationKwh: values.pvGenerationKwh as number | null,
      pvSelfUseReportedKwh: values.pvSelfUseReportedKwh as number | null,
      purchaseCostCzk: values.purchaseCostCzk as number | null,
      saleRevenueCzk: values.saleRevenueCzk as number | null,
      gridBalancingCzk: values.flexibilityRevenueCzk as number | null,
    };
    const created = await serializeWrite(async () => {
      await upsertIntervalRecord({ intervalStart: input.period as string, intervalEnd: lastDayOfMonth(input.period as string), source: 'DeltaGreen', sourceSheet: 'fve-collector / ruční zápis', fields: intervalFields });
      // Keep the legacy table current until the dashboard is switched to the new API shape.
      const [legacy] = await getDb().insert(electricityReadings).values(values as typeof electricityReadings.$inferInsert)
        .onConflictDoUpdate({ target: electricityReadings.period, set: values as typeof electricityReadings.$inferInsert }).returning();
      const [verified] = await getDb().select().from(electricityReadings).where(eq(electricityReadings.period, input.period as string)).limit(1);
      if (!verified || verified.id !== legacy.id) throw new Error('Zápis se po uložení nepodařilo ověřit.');
      return legacy;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/data failed', error);
    const message = error instanceof Error && error.message.includes('UNIQUE')
      ? 'Pro zvolené období už záznam existuje.'
      : 'Záznam se nepodařilo uložit.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
