import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb, serializeWrite } from '@/db';
import { heatPumpMeterReadings } from '@/db/schema';

const fields = ['heatOutputKwh', 'hotWaterOutputKwh', 'heatInputKwh', 'hotWaterInputKwh'] as const;
export async function GET() { return NextResponse.json(await getDb().select().from(heatPumpMeterReadings).orderBy(asc(heatPumpMeterReadings.measuredAt))); }
export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    if (typeof input.measuredAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.measuredAt)) throw new Error('Datum musí být ISO.');
    const values: Record<string, number | null> = {};
    for (const field of fields) { const value = input[field]; if (value == null || value === '') values[field] = null; else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${field} musí být nezáporné číslo.`); else values[field] = value; }
    const [created] = await serializeWrite(() => getDb().insert(heatPumpMeterReadings).values({ measuredAt: input.measuredAt as string, ...values, note: typeof input.note === 'string' ? input.note : null }).returning());
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Odečet se nepodařilo uložit.' }, { status: 400 }); }
}
