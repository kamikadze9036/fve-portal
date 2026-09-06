import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, serializeWrite } from '@/db';
import { electricityMeterReadings } from '@/db/schema';
import { dateValue, nonNegative, optionalText } from '@/lib/readings-validation';

export async function GET() { return NextResponse.json(await getDb().select().from(electricityMeterReadings).orderBy(asc(electricityMeterReadings.readingDate))); }
export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const readingDate = dateValue(input.readingDate);
    const meterNtKwh = nonNegative(input.meterNtKwh, 'NT', true)!;
    const meterVtKwh = nonNegative(input.meterVtKwh, 'VT', true)!;
    const [created] = await serializeWrite(() => getDb().insert(electricityMeterReadings).values({ readingDate, meterNtKwh, meterVtKwh, note: optionalText(input.note) }).returning());
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Odečet se nepodařilo uložit.' }, { status: 400 }); }
}
