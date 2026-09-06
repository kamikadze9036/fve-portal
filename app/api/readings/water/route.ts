import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, serializeWrite } from '@/db';
import { waterMeterReadings } from '@/db/schema';
import { dateValue, nonNegative, optionalText } from '@/lib/readings-validation';

export async function GET() { return NextResponse.json(await getDb().select().from(waterMeterReadings).orderBy(asc(waterMeterReadings.measuredAt))); }
export async function POST(request: Request) { try { const input = await request.json() as Record<string, unknown>; const [row] = await serializeWrite(() => getDb().insert(waterMeterReadings).values({ measuredAt: dateValue(input.measuredAt), mainMeterM3: nonNegative(input.mainMeterM3, 'Hlavní vodoměr', true)!, gardenMeterM3: nonNegative(input.gardenMeterM3, 'Zálivkový vodoměr', true)!, note: optionalText(input.note) }).returning()); return NextResponse.json(row, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Odečet se nepodařilo uložit.' }, { status: 400 }); } }
