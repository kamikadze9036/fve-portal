import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { electricityReadings } from '@/db/schema';
import { getAllData } from '@/lib/data';

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
    const [created] = await getDb().insert(electricityReadings).values(values as typeof electricityReadings.$inferInsert).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('UNIQUE')
      ? 'Pro zvolené období už záznam existuje.'
      : 'Záznam se nepodařilo uložit.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
