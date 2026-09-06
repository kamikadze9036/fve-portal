import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb, serializeWrite } from '@/db';
import { electricityMeterReadings } from '@/db/schema';

export async function GET() { return NextResponse.json(await getDb().select().from(electricityMeterReadings).orderBy(asc(electricityMeterReadings.readingDate))); }
export async function POST(request: Request) {
  try { const input = await request.json() as Record<string, unknown>;
    if (typeof input.readingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.readingDate)) throw new Error('Datum musí být ISO.');
    for (const key of ['meterNtKwh', 'meterVtKwh']) if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0) throw new Error(`${key} musí být nezáporné číslo.`);
    const [created] = await serializeWrite(() => getDb().insert(electricityMeterReadings).values({ readingDate: input.readingDate as string, meterNtKwh: input.meterNtKwh as number, meterVtKwh: input.meterVtKwh as number, note: typeof input.note === 'string' ? input.note : null }).returning()); return NextResponse.json(created, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Odečet se nepodařilo uložit.' }, { status: 400 }); }
}
