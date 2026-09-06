# Úkol: koláčový graf kumulativní úspory FVE

Malá navazující úprava na `MEASUREMENT_WORKFLOW_SPEC.md` / `MEASUREMENT_IMPLEMENTATION_PLAN.md`
(oba už implementované a nasazené). Nemění schéma, jen přidává jeden výpočet
a jednu vizualizaci do existující sekce **Roční ekonomika**.

## Cíl

FVE byla pořízena **v březnu 2022 za 250 000 Kč** (`economics_settings` už má
řádek `effectiveFrom: '2022-03-01', investmentCzk: 250000` — tohle je hotové,
není potřeba nic měnit v datech).

Chybí ale ukázat **kumulativní finanční přínos FVE od pořízení dodnes**,
rozdělený na dvě části:

1. hodnota vlastní spotřeby (kolik by stálo tohle množství energie koupit,
   kdyby FVE nebyla — tedy "kolik jsme ušetřili tím, že jsme si to
   nemuseli koupit"),
2. tržby z prodeje přebytků do sítě (skutečná přijatá částka, ne odhad).

Vizualizovat jako malý koláčový graf (`recharts`, už je závislost projektu,
zatím nikde nepoužitá) se dvěma výsečemi + celkovou částkou a % pořizovací
investice, které se tím pokrylo.

## Výpočet

Nová čistá funkce, např. `lib/economics-calc.ts` (doplnit vedle stávajících
`grossPriceCzkPerKwh` atd.):

```ts
export function cumulativeSavings(
  intervals: { intervalStart: string; pvGenerationKwh: number | null; inverterExportKwh: number | null; pvSelfUseReportedKwh: number | null; saleRevenueCzk: number | null }[],
  settings: { effectiveFrom: string; referencePriceCzkPerKwh: number; investmentCzk: number; subsidyCzk: number }[],
  installDate: string,
) {
  let selfUseValueCzk = 0;
  let saleRevenueCzk = 0;
  let monthsIncluded = 0;

  for (const row of intervals) {
    if (row.intervalStart < installDate) continue;
    const applicable = settings.filter((s) => s.effectiveFrom <= row.intervalStart).at(-1);
    const used = ownUse(row); // reuž stávající fn z lib/electricity-calc.ts
    if (applicable && used != null) {
      selfUseValueCzk += used * applicable.referencePriceCzkPerKwh;
      monthsIncluded += 1;
    }
    saleRevenueCzk += row.saleRevenueCzk ?? 0;
  }

  const totalCzk = selfUseValueCzk + saleRevenueCzk;
  const latest = settings.filter((s) => s.effectiveFrom <= installDate).at(-1) ?? settings.at(-1);
  const investmentCzk = latest ? latest.investmentCzk - latest.subsidyCzk : null;
  const recoveredPercent = investmentCzk ? (totalCzk / investmentCzk) * 100 : null;

  return { selfUseValueCzk, saleRevenueCzk, totalCzk, monthsIncluded, investmentCzk, recoveredPercent };
}
```

Poznámky k výpočtu:
- `installDate` = `'2022-03-01'` — buď natvrdo, nebo (lépe) odvodit jako
  `effectiveFrom` prvního `economics_settings` řádku s `note` obsahující
  "Pořízení" — ať to není napevno v kódu, kdyby se data ještě upravovala.
  Jednodušší a stačí i natvrdo, není to kritické.
- Chybí-li pro nějaký interval odpovídající nastavení ceny (`applicable`
  je `undefined`), ten interval se do `selfUseValueCzk`/`monthsIncluded`
  nezapočítá (žádné nahrazování nulou/odhadem — stejný princip jako zbytek
  specu).
- `saleRevenueCzk` je skutečná přijatá částka z DeltaGreen, ne odhad —
  sčítá se vždy, i bez `applicable` nastavení ceny.

## UI

V `EconomicsView` (`components/fve-dashboard.tsx`) přidat novou kartu **vedle**
existujících (ne místo nich) — použít `electricityIntervals` (celou historii,
ne jen filtrovanou na `year` jako zbytek téhle view) a `economicsSettings`:

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
```

- Malý koláč (~160–200 px), dvě výseče: „Vlastní spotřeba" a „Prodej do sítě"
  (barvy sladit se stávající paletou — `sun`/`mint` accenty už appka používá
  jinde v `Kpi` komponentě).
- Vedle/pod grafem: celková částka (`money.format(totalCzk)`), a
  `Investice: {money.format(investmentCzk)} · pokryto {decimal.format(recoveredPercent)} %`.
- Pokud `monthsIncluded === 0` (typicky žádná data), zobrazit `N/A` / prázdný
  stav místo grafu s nulami — stejný princip jako zbytek appky.

Umístění: nová karta na začátek `economics-layout` (nebo nad něj, ať je vidět
hned po příchodu do sekce — uživatel chce "aby bylo vidět rovnou").

## Ověření

- `npm run build` prochází.
- Ruční kontrola čísel: srovnat součet `totalCzk` s tím, co ukazuje součet
  `saleRevenueCzk` přes všechny intervaly (dá se ověřit přes `GET /api/data`)
  plus hrubý odhad vlastní spotřeby × 5,50 Kč/kWh (současná referenční cena).
- Graf se vykreslí i s částečnou historií (jen pár měsíců dat) bez pádu.
