import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, serializeWrite } from '@/db';
import { heatPumpMeterReadings } from '@/db/schema';
import { dateValue, nonNegative, optionalText } from '@/lib/readings-validation';
export async function GET() { return NextResponse.json(await getDb().select().from(heatPumpMeterReadings).orderBy(asc(heatPumpMeterReadings.measuredAt))); }
export async function POST(request: Request) { try { const input = await request.json() as Record<string, unknown>; const values = { measuredAt: dateValue(input.measuredAt), heatOutputKwh: nonNegative(input.heatOutputKwh, 'Dodané teplo'), hotWaterOutputKwh: nonNegative(input.hotWaterOutputKwh, 'Dodané teplo TUV'), heatInputKwh: nonNegative(input.heatInputKwh, 'Příkon topení'), hotWaterInputKwh: nonNegative(input.hotWaterInputKwh, 'Příkon TUV'), note: optionalText(input.note) }; if ([values.heatOutputKwh, values.hotWaterOutputKwh, values.heatInputKwh, values.hotWaterInputKwh].every((value) => value == null)) throw new Error('Zadejte alespoň jeden kumulativní stav.'); const [row] = await serializeWrite(() => getDb().insert(heatPumpMeterReadings).values(values).returning()); return NextResponse.json(row, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Odečet se nepodařilo uložit.' }, { status: 400 }); } }
