import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, serializeWrite } from '@/db';
import { auditLog, electricityMeterReadings } from '@/db/schema';
import { dateValue, nonNegative, optionalText } from '@/lib/readings-validation';

const idOf = (value: string) => { const id = Number(value); if (!Number.isInteger(id) || id < 1) throw new Error('Neplatné ID odečtu.'); return id; };
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = idOf((await params).id); const input = await request.json() as Record<string, unknown>;
    const [current] = await getDb().select().from(electricityMeterReadings).where(eq(electricityMeterReadings.id, id));
    if (!current) return NextResponse.json({ error: 'Odečet nebyl nalezen.' }, { status: 404 });
    const updates = { readingDate: input.readingDate === undefined ? current.readingDate : dateValue(input.readingDate), meterNtKwh: input.meterNtKwh === undefined ? current.meterNtKwh : nonNegative(input.meterNtKwh, 'NT', true)!, meterVtKwh: input.meterVtKwh === undefined ? current.meterVtKwh : nonNegative(input.meterVtKwh, 'VT', true)!, note: input.note === undefined ? current.note : optionalText(input.note), updatedAt: new Date().toISOString() };
    const updated = await serializeWrite(async () => { const row = (await getDb().update(electricityMeterReadings).set(updates).where(eq(electricityMeterReadings.id, id)).returning())[0]; for (const key of ['readingDate', 'meterNtKwh', 'meterVtKwh', 'note'] as const) if (String(current[key] ?? '') !== String(updates[key] ?? '')) await getDb().insert(auditLog).values({ tableName: 'electricity_meter_readings', recordId: id, fieldName: key, oldValue: current[key] == null ? null : String(current[key]), newValue: updates[key] == null ? null : String(updates[key]) }); return row; });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Odečet se nepodařilo upravit.' }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const id = idOf((await params).id); const [row] = await serializeWrite(() => getDb().update(electricityMeterReadings).set({ qualityStatus: 'nahrazené', updatedAt: new Date().toISOString() }).where(eq(electricityMeterReadings.id, id)).returning()); return row ? NextResponse.json(row) : NextResponse.json({ error: 'Odečet nebyl nalezen.' }, { status: 404 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Odečet se nepodařilo archivovat.' }, { status: 400 }); } }
