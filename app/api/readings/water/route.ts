import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb, serializeWrite } from '@/db';
import { waterMeterReadings } from '@/db/schema';

export async function GET() { return NextResponse.json(await getDb().select().from(waterMeterReadings).orderBy(asc(waterMeterReadings.measuredAt))); }
export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    if (typeof input.measuredAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.measuredAt)) throw new Error('Datum musí být ISO.');
    for (const key of ['mainMeterM3', 'gardenMeterM3']) if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0) throw new Error(`${key} musí být nezáporné číslo.`);
    const [created] = await serializeWrite(() => getDb().insert(waterMeterReadings).values({ measuredAt: input.measuredAt as string, mainMeterM3: input.mainMeterM3 as number, gardenMeterM3: input.gardenMeterM3 as number, note: typeof input.note === 'string' ? input.note : null }).returning());
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Odečet se nepodařilo uložit.' }, { status: 400 }); }
}
