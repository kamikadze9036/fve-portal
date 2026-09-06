'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BatteryCharging, CircleDollarSign, Droplets, Gauge, Plus, Sun, TrendingDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ElectricityReading = {
  id: number; period: string; meterNtKwh: number | null; meterVtKwh: number | null;
  pndExportKwh: number | null; gridImportKwh: number | null; pvGenerationKwh: number | null;
  pvSelfUseReportedKwh: number | null; gridExportKwh: number | null; pvPurchaseKwh: number | null;
  saleRevenueCzk: number | null; flexibilityRevenueCzk: number | null; purchaseCostCzk: number | null;
  avoidedCostCzk: number | null; sourceSheet: string; sourceDate: string | null; qualityNote: string | null;
};
type WaterReading = { id: number; measuredAt: string; mainMeterM3: number | null; gardenMeterM3: number | null; mainConsumptionM3: number | null; gardenConsumptionM3: number | null; householdConsumptionM3: number | null; };
type HeatPumpReading = { id: number; period: string; heatOutputKwh: number | null; hotWaterOutputKwh: number | null; heatInputKwh: number | null; hotWaterInputKwh: number | null; heatCop: number | null; hotWaterCop: number | null; sourceDate: string | null; intervalEnd: string | null; intervalDays: number | null; qualityNote: string | null; };
export type DashboardData = { electricity: ElectricityReading[]; water: WaterReading[]; heatPump: HeatPumpReading[] };
type Section = 'electricity' | 'water' | 'heat';

const number = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
const monthLabel = (period: string) => new Date(`${period.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('cs-CZ', { month: 'short' });
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('cs-CZ');
const ownUse = (row: ElectricityReading) => row.pvGenerationKwh != null && row.gridExportKwh != null
  ? Math.max(0, row.pvGenerationKwh - row.gridExportKwh)
  : (row.pvSelfUseReportedKwh ?? 0);
const distributorConsumption = (row: ElectricityReading) => row.pvGenerationKwh != null && row.pndExportKwh != null && row.gridImportKwh != null
  ? row.pvGenerationKwh - row.pndExportKwh + row.gridImportKwh : null;
const inverterConsumption = (row: ElectricityReading) => row.pvGenerationKwh != null && row.gridExportKwh != null && row.pvPurchaseKwh != null
  ? row.pvGenerationKwh - row.gridExportKwh + row.pvPurchaseKwh : null;
const netCost = (row: ElectricityReading) => (row.purchaseCostCzk ?? 0) - (row.saleRevenueCzk ?? 0) - (row.flexibilityRevenueCzk ?? 0);
const initialForm = { period: '2026-09', meterNtKwh: '', meterVtKwh: '', pndExportKwh: '', gridImportKwh: '', pvGenerationKwh: '', gridExportKwh: '', pvPurchaseKwh: '', saleRevenueCzk: '', flexibilityRevenueCzk: '', purchaseCostCzk: '' };

export function FveDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [section, setSection] = useState<Section>('electricity');
  const [year, setYear] = useState('2025');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Databázi se nepodařilo načíst.');
    setData(await response.json() as DashboardData);
  }, []);

  useEffect(() => { refresh().catch(() => setMessage('Zobrazuji importovanou kopii dat. Databáze se připojí po publikování.')); }, [refresh]);

  const addReading = useCallback(async (input: Record<string, unknown>) => {
    const response = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const result = await response.json() as { error?: string; period?: string };
    if (!response.ok) throw new Error(result.error ?? 'Záznam se nepodařilo uložit.');
    await refresh();
    return result;
  }, [refresh]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'add_monthly_energy_reading',
      title: 'Přidat měsíční odečet',
      description: 'Uloží nový měsíční odečet elektřiny a FVE a obnoví přehled.',
      inputSchema: { type: 'object', properties: {
        period: { type: 'string', pattern: '^\\d{4}-\\d{2}-01$' }, gridImportKwh: { type: 'number', minimum: 0 },
        pvGenerationKwh: { type: 'number', minimum: 0 }, gridExportKwh: { type: 'number', minimum: 0 }, purchaseCostCzk: { type: 'number', minimum: 0 },
      }, required: ['period'], additionalProperties: true },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: unknown) => addReading(input as Record<string, unknown>),
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [addReading]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const payload: Record<string, unknown> = { period: `${form.period}-01` };
    for (const [key, value] of Object.entries(form)) if (key !== 'period') payload[key] = value === '' ? null : Number(value);
    try {
      await addReading(payload); setDialogOpen(false); setForm(initialForm); setYear(form.period.slice(0, 4)); setMessage('Odečet byl uložen.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Záznam se nepodařilo uložit.'); }
    finally { setSaving(false); }
  }

  const years = useMemo(() => Array.from(new Set(data.electricity.map((row) => row.period.slice(0, 4)))).sort(), [data.electricity]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="topbar">
        <div className="brandmark"><Sun aria-hidden="true" /></div>
        <div><p className="eyebrow">Zruč · energetika domu</p><h1>Přehled spotřeb</h1></div>
        <div className="topbar-actions">
          <NativeSelect value={year} onChange={(event) => setYear(event.target.value)} aria-label="Vyberte rok">
            {years.map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}
          </NativeSelect>
          {section === 'electricity' && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}><Plus /> Přidat odečet</DialogTrigger>
            <DialogContent className="reading-dialog">
              <form onSubmit={submit}>
                <DialogHeader><DialogTitle>Nový měsíční odečet</DialogTitle><DialogDescription>Zadejte zdrojové hodnoty. Přehled dopočítá spotřebu, soběstačnost a čisté náklady.</DialogDescription></DialogHeader>
                <div className="form-grid">
                  <FormField label="Období" name="period" type="month" value={form.period} onChange={(value) => setForm({ ...form, period: value })} required />
                  <FormField label="Odběr — distributor (kWh)" name="gridImportKwh" value={form.gridImportKwh} onChange={(value) => setForm({ ...form, gridImportKwh: value })} />
                  <FormField label="Nákup — měnič SEMS (kWh)" name="pvPurchaseKwh" value={form.pvPurchaseKwh} onChange={(value) => setForm({ ...form, pvPurchaseKwh: value })} />
                  <FormField label="Výroba FVE (kWh)" name="pvGenerationKwh" value={form.pvGenerationKwh} onChange={(value) => setForm({ ...form, pvGenerationKwh: value })} />
                  <FormField label="Přetok — měnič SEMS (kWh)" name="gridExportKwh" value={form.gridExportKwh} onChange={(value) => setForm({ ...form, gridExportKwh: value })} />
                  <FormField label="Dodávka — distributor PND (kWh)" name="pndExportKwh" value={form.pndExportKwh} onChange={(value) => setForm({ ...form, pndExportKwh: value })} />
                  <FormField label="Náklady na nákup (Kč)" name="purchaseCostCzk" value={form.purchaseCostCzk} onChange={(value) => setForm({ ...form, purchaseCostCzk: value })} />
                  <FormField label="Příjem z prodeje (Kč)" name="saleRevenueCzk" value={form.saleRevenueCzk} onChange={(value) => setForm({ ...form, saleRevenueCzk: value })} />
                  <FormField label="Příjem z flexibility (Kč)" name="flexibilityRevenueCzk" value={form.flexibilityRevenueCzk} onChange={(value) => setForm({ ...form, flexibilityRevenueCzk: value })} />
                </div>
                <DialogFooter><Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : 'Uložit odečet'}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>}
        </div>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          <p>Spotřeby</p>
          <NavButton active={section === 'electricity'} onClick={() => setSection('electricity')} icon={<Zap />}>Elektřina &amp; FVE</NavButton>
          <NavButton active={section === 'water'} onClick={() => setSection('water')} icon={<Droplets />}>Voda</NavButton>
          <NavButton active={section === 'heat'} onClick={() => setSection('heat')} icon={<BatteryCharging />}>Tepelné čerpadlo</NavButton>
          <div className="sidebar-note"><span>Datový model</span><strong>{data.electricity.length + data.water.length + data.heatPump.length} záznamů</strong><small>Elektřina, voda a tepelné čerpadlo v jedné databázi</small></div>
        </aside>
        <section className="workspace">
          {message && <div className="message" role="status">{message}</div>}
          {section === 'electricity' && <ElectricityView rows={data.electricity.filter((row) => row.period.startsWith(year))} year={year} />}
          {section === 'water' && <WaterView rows={data.water} />}
          {section === 'heat' && <HeatView rows={data.heatPump.filter((row) => row.period.startsWith(year))} year={year} />}
        </section>
      </div>
    </main>
  );
}

function ElectricityView({ rows, year }: { rows: ElectricityReading[]; year: string }) {
  const stats = rows.reduce((acc, row) => { const production = row.pvGenerationKwh ?? 0; const used = ownUse(row); acc.production += production; acc.ownUse += used; acc.distributorImport += row.gridImportKwh ?? 0; acc.inverterImport += row.pvPurchaseKwh ?? 0; acc.distributorExport += row.pndExportKwh ?? 0; acc.inverterExport += row.gridExportKwh ?? 0; acc.cost += netCost(row); return acc; }, { production: 0, ownUse: 0, distributorImport: 0, inverterImport: 0, distributorExport: 0, inverterExport: 0, cost: 0 });
  const exportComparison = compareSources(rows, (row) => row.pndExportKwh, (row) => row.gridExportKwh);
  const importComparison = compareSources(rows, (row) => row.gridImportKwh, (row) => row.pvPurchaseKwh);
  const max = Math.max(1, ...rows.map((row) => Math.max(row.pvGenerationKwh ?? 0, row.gridImportKwh ?? 0)));
  const qualityCount = rows.filter((row) => row.qualityNote).length;
  return <>
    <div className="section-heading"><div><p className="eyebrow">Roční souhrn</p><h2>Výroba a spotřeba {year}</h2></div><p>Distributor (PND) a měnič (SEMS) zůstávají oddělené. Shoda se počítá jen v měsících, kde existují obě hodnoty.</p></div>
    {qualityCount > 0 && <div className="quality-note"><AlertTriangle /> {qualityCount} záznam má opravené období podle pořadí v původním listu; původní datum zůstává uložené pro audit.</div>}
    <div className="kpi-grid">
      <Kpi icon={<Sun />} label="Výroba FVE" value={`${number.format(stats.production)} kWh`} accent="sun" />
      <Kpi icon={<BatteryCharging />} label="Vlastní využití" value={`${number.format(stats.ownUse)} kWh`} detail={`${stats.production ? Math.round(stats.ownUse / stats.production * 100) : 0} % výroby · podle měniče`} accent="mint" />
      <Kpi icon={<Zap />} label="Odběr · distributor" value={`${number.format(stats.distributorImport)} kWh`} detail={`Měnič ${number.format(stats.inverterImport)} kWh`} accent="blue" />
      <Kpi icon={<CircleDollarSign />} label="Čisté náklady" value={money.format(stats.cost)} detail={`Dodávka PND ${number.format(stats.distributorExport)} kWh`} accent="navy" />
    </div>
    <div className="dashboard-grid">
      <Card className="trend-card"><CardHeader><CardTitle>Měsíční profil</CardTitle><div className="legend"><span className="solar-dot" /> Výroba FVE <span className="grid-dot" /> Odběr ze sítě</div></CardHeader><CardContent><BarChart rows={rows} max={max} /></CardContent></Card>
      <Card className="flow-card comparison-card"><CardHeader><CardTitle>Shoda měření</CardTitle></CardHeader><CardContent>
        <SourceComparison label="Dodávka do distribuce" result={exportComparison} />
        <SourceComparison label="Nákup ze sítě" result={importComparison} />
        <p className="comparison-help">Odchylka měniče je vztažená k měření distributora. Součty obsahují pouze společné měsíce.</p>
      </CardContent></Card>
    </div>
    <Card className="table-card"><CardHeader><CardTitle>Porovnání po měsících</CardTitle><span>{rows.length} období</span></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Měsíc</TableHead><TableHead className="num">Výroba</TableHead><TableHead className="num">Dodávka PND / SEMS</TableHead><TableHead className="num">Δ dodávky</TableHead><TableHead className="num">Nákup PND / SEMS</TableHead><TableHead className="num">Δ nákupu</TableHead><TableHead className="num">Spotřeba PND / SEMS</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="month-cell">{monthLabel(row.period)} {year}</TableCell><TableCell className="num">{formatKwh(row.pvGenerationKwh)}</TableCell><TableCell className="num">{formatPair(row.pndExportKwh, row.gridExportKwh)}</TableCell><TableCell className="num">{formatDelta(row.pndExportKwh, row.gridExportKwh)}</TableCell><TableCell className="num">{formatPair(row.gridImportKwh, row.pvPurchaseKwh)}</TableCell><TableCell className="num">{formatDelta(row.gridImportKwh, row.pvPurchaseKwh)}</TableCell><TableCell className="num strong">{formatPair(distributorConsumption(row), inverterConsumption(row))}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  </>;
}

type ComparisonResult = { distributor: number; inverter: number; difference: number; differencePercent: number | null; matchingMonths: number };
function compareSources(rows: ElectricityReading[], distributorValue: (row: ElectricityReading) => number | null, inverterValue: (row: ElectricityReading) => number | null): ComparisonResult {
  return rows.reduce((acc, row) => {
    const distributor = distributorValue(row); const inverter = inverterValue(row);
    if (distributor == null || inverter == null) return acc;
    acc.distributor += distributor; acc.inverter += inverter; acc.matchingMonths += 1;
    acc.difference = acc.inverter - acc.distributor;
    acc.differencePercent = acc.distributor ? acc.difference / acc.distributor * 100 : null;
    return acc;
  }, { distributor: 0, inverter: 0, difference: 0, differencePercent: null, matchingMonths: 0 } as ComparisonResult);
}

function SourceComparison({ label, result }: { label: string; result: ComparisonResult }) {
  return <div className="source-comparison"><div className="comparison-title"><strong>{label}</strong><span>{result.matchingMonths} společných měsíců</span></div><div className="comparison-values"><div><span>Distributor</span><strong>{result.matchingMonths ? formatKwh(result.distributor) : '–'}</strong></div><div><span>Měnič</span><strong>{result.matchingMonths ? formatKwh(result.inverter) : '–'}</strong></div></div><div className={`comparison-delta ${Math.abs(result.differencePercent ?? 0) <= 2 ? 'good' : ''}`}><span>Odchylka měniče</span><strong>{result.matchingMonths ? `${signedNumber(result.difference)} kWh · ${signedDecimal(result.differencePercent)} %` : 'nelze porovnat'}</strong></div></div>;
}

function WaterView({ rows }: { rows: WaterReading[] }) {
  const latest = rows.at(-1); const previous = rows.at(-2); const change = latest && previous && latest.mainMeterM3 != null && previous.mainMeterM3 != null ? latest.mainMeterM3 - previous.mainMeterM3 : null;
  return <><div className="section-heading"><div><p className="eyebrow">Odečty</p><h2>Voda</h2></div><p>Oddělený hlavní a zálivkový vodoměr, včetně spotřeby domu bez závlahy.</p></div><div className="kpi-grid three"><Kpi icon={<Droplets />} label="Hlavní vodoměr" value={latest?.mainMeterM3 != null ? `${number.format(latest.mainMeterM3)} m³` : '–'} accent="blue" /><Kpi icon={<Gauge />} label="Zálivkový vodoměr" value={latest?.gardenMeterM3 != null ? `${number.format(latest.gardenMeterM3)} m³` : '–'} accent="mint" /><Kpi icon={<TrendingDown />} label="Změna od minula" value={change != null ? `${number.format(change)} m³` : '–'} detail={latest ? `Odečet ${dateLabel(latest.measuredAt)}` : undefined} accent="navy" /></div><Card className="table-card"><CardHeader><CardTitle>Historie odečtů</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Datum</TableHead><TableHead className="num">Hlavní stav</TableHead><TableHead className="num">Zálivka</TableHead><TableHead className="num">Bez zálivky</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{dateLabel(row.measuredAt)}</TableCell><TableCell className="num">{formatM3(row.mainMeterM3)}</TableCell><TableCell className="num">{formatM3(row.gardenMeterM3)}</TableCell><TableCell className="num strong">{formatM3(row.householdConsumptionM3)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>;
}

function HeatView({ rows, year }: { rows: HeatPumpReading[]; year: string }) {
  const stats = rows.reduce((acc, row) => { acc.output += (row.heatOutputKwh ?? 0) + (row.hotWaterOutputKwh ?? 0); acc.input += (row.heatInputKwh ?? 0) + (row.hotWaterInputKwh ?? 0); acc.heat += row.heatOutputKwh ?? 0; acc.water += row.hotWaterOutputKwh ?? 0; return acc; }, { output: 0, input: 0, heat: 0, water: 0 });
  return <><div className="section-heading"><div><p className="eyebrow">Srovnatelné intervaly</p><h2>Tepelné čerpadlo {year}</h2></div><p>Hodnoty jsou nově přepočtené z kumulativních stavů. Započítávají se jen nezáporné intervaly dlouhé 20–45 dní s realistickým topným faktorem.</p></div><div className="quality-note heat-quality"><AlertTriangle /> Vyřazené jsou rozbité vzorce, krátké dílčí odečty, nestandardní TF a mezery přes více měsíců; nejsou uměle rozpočítané.</div><div className="kpi-grid three"><Kpi icon={<BatteryCharging />} label="Dodané teplo" value={`${number.format(stats.output)} kWh`} detail={`${rows.length} spolehlivých intervalů`} accent="sun" /><Kpi icon={<Zap />} label="Elektrický příkon" value={`${number.format(stats.input)} kWh`} accent="blue" /><Kpi icon={<Gauge />} label="Topný faktor" value={stats.input ? decimal.format(stats.output / stats.input) : '–'} detail="Poměr součtů dodané a spotřebované energie" accent="mint" /></div><Card className="table-card"><CardHeader><CardTitle>Provozní intervaly</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Interval</TableHead><TableHead className="num">Dní</TableHead><TableHead className="num">Teplo</TableHead><TableHead className="num">TUV</TableHead><TableHead className="num">Příkon topení</TableHead><TableHead className="num">Příkon TUV</TableHead><TableHead className="num">TF topení</TableHead><TableHead className="num">TF TUV</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="interval-cell">{formatInterval(row)}</TableCell><TableCell className="num">{row.intervalDays ?? '–'}</TableCell><TableCell className="num">{formatKwh(row.heatOutputKwh)}</TableCell><TableCell className="num">{formatKwh(row.hotWaterOutputKwh)}</TableCell><TableCell className="num">{formatKwh(row.heatInputKwh)}</TableCell><TableCell className="num">{formatKwh(row.hotWaterInputKwh)}</TableCell><TableCell className="num">{formatDecimal(row.heatCop)}</TableCell><TableCell className="num">{formatDecimal(row.hotWaterCop)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>;
}

function BarChart({ rows, max }: { rows: ElectricityReading[]; max: number }) { return <div className="bar-chart" role="img" aria-label="Měsíční výroba FVE a odběr ze sítě">{rows.map((row) => <div className="bar-month" key={row.period}><div className="bars"><span className="bar solar" title={`Výroba ${formatKwh(row.pvGenerationKwh)}`} style={{ height: `${Math.max(3, (row.pvGenerationKwh ?? 0) / max * 100)}%` }} /><span className="bar grid" title={`Odběr ${formatKwh(row.gridImportKwh)}`} style={{ height: `${Math.max(3, (row.gridImportKwh ?? 0) / max * 100)}%` }} /></div><span>{monthLabel(row.period)}</span></div>)}</div>; }
function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}{children}</button>; }
function Kpi({ icon, label, value, detail, accent }: { icon: React.ReactNode; label: string; value: string; detail?: string; accent: string }) { return <Card className={`kpi ${accent}`}><CardHeader><div className="kpi-icon">{icon}</div><p>{label}</p></CardHeader><CardContent><strong>{value}</strong>{detail && <small>{detail}</small>}</CardContent></Card>; }
function FormField({ label, name, value, onChange, type = 'number', required = false }: { label: string; name: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <div className="field"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>; }
function formatKwh(value: number | null) { return value == null ? '–' : `${number.format(value)} kWh`; }
function formatM3(value: number | null) { return value == null ? '–' : `${decimal.format(value)} m³`; }
function formatDecimal(value: number | null) { return value == null ? '–' : decimal.format(value); }
function formatPair(distributor: number | null, inverter: number | null) { return `${distributor == null ? '–' : number.format(distributor)} / ${inverter == null ? '–' : number.format(inverter)} kWh`; }
function formatDelta(distributor: number | null, inverter: number | null) { return distributor == null || inverter == null ? '–' : `${signedNumber(inverter - distributor)} kWh · ${signedDecimal(distributor ? (inverter - distributor) / distributor * 100 : null)} %`; }
function signedNumber(value: number) { return `${value > 0 ? '+' : ''}${number.format(value)}`; }
function signedDecimal(value: number | null) { return value == null ? '–' : `${value > 0 ? '+' : ''}${decimal.format(value)}`; }
function formatInterval(row: HeatPumpReading) { return row.sourceDate && row.intervalEnd ? `${dateLabel(row.sourceDate)} – ${dateLabel(row.intervalEnd)}` : `${monthLabel(row.period)} ${row.period.slice(0, 4)}`; }
