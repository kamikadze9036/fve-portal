import { NextResponse } from 'next/server';
import { intervalFields, upsertIntervalRecord } from '@/lib/interval-records';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
export async function POST(request: Request) {
  try {
    const input = await request.json() as { intervalStart?: string; intervalEnd?: string; source?: string; fields?: Record<string, unknown> };
    if (!input.intervalStart || !isoDate.test(input.intervalStart) || !input.intervalEnd || !isoDate.test(input.intervalEnd) || !input.source || !input.fields) return NextResponse.json({ error: 'Vyžaduji platný interval, zdroj a alespoň jedno pole.' }, { status: 400 });
    const fields: Record<string, number | null> = {};
    for (const [key, value] of Object.entries(input.fields)) {
      if (!intervalFields.includes(key as typeof intervalFields[number])) return NextResponse.json({ error: `Neznámé pole ${key}.` }, { status: 400 });
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) return NextResponse.json({ error: `Pole ${key} musí být číslo nebo null.` }, { status: 400 });
      fields[key] = value as number | null;
    }
    if (!Object.keys(fields).length) return NextResponse.json({ error: 'Vyžaduji alespoň jednu hodnotu.' }, { status: 400 });
    return NextResponse.json(await upsertIntervalRecord({ intervalStart: input.intervalStart, intervalEnd: input.intervalEnd, source: input.source, fields }), { status: 201 });
  } catch { return NextResponse.json({ error: 'Interval se nepodařilo uložit.' }, { status: 400 }); }
}
