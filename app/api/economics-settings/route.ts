import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, serializeWrite } from '@/db';
import { economicsSettings } from '@/db/schema';
import { dateValue, nonNegative, optionalText } from '@/lib/readings-validation';

export async function GET() { return NextResponse.json(await getDb().select().from(economicsSettings).orderBy(asc(economicsSettings.effectiveFrom))); }
export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const values = { effectiveFrom: dateValue(input.effectiveFrom, 'Platnost od'), referencePriceCzkPerKwh: nonNegative(input.referencePriceCzkPerKwh, 'Referenční cena', true)!, investmentCzk: nonNegative(input.investmentCzk, 'Investice', true)!, subsidyCzk: nonNegative(input.subsidyCzk, 'Dotace') ?? 0, note: optionalText(input.note) };
    const [row] = await serializeWrite(() => getDb().insert(economicsSettings).values(values).onConflictDoUpdate({ target: economicsSettings.effectiveFrom, set: values }).returning());
    return NextResponse.json(row, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Nastavení se nepodařilo uložit.' }, { status: 400 }); }
}
