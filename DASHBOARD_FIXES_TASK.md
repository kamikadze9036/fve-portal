# Úkol: dvě drobné opravy dashboardu

Dvě malé, na sobě nezávislé opravy. Žádná změna schématu.

## 1. Výchozí rok — poslední dostupný, ne natvrdo 2025

`components/fve-dashboard.tsx`:

```ts
const [year, setYear] = useState('2025');
```

Natvrdo `'2025'` — v datech je ale už 2026 a dál poroste. Změnit na lazy
initializer, který vezme poslední (nejnovější) rok z `initialData.electricity`
stejným způsobem, jako se počítá `years` o pár řádků níž:

```ts
const [year, setYear] = useState(() => {
  const years = Array.from(new Set(initialData.electricity.map((row) => row.period.slice(0, 4)))).sort();
  return years.at(-1) ?? new Date().getFullYear().toString();
});
```

(Fallback na aktuální rok jen pro prázdnou databázi, neměl by v praxi nastat.)

## 2. Chybí „Spotřeba za období" v přehledu elektřiny

`ElectricityView` (`components/fve-dashboard.tsx`) má KPI dlaždice Výroba FVE,
Vlastní využití, Odběr — distributor, Čisté náklady — ale chybí celková
**spotřeba domu** za vybraný rok jako vlastní KPI (dopočet už appka umí,
jen se nikde nesčítá do ročního součtu/KPI).

Přidat KPI dlaždici „Spotřeba" do `stats` reduce (vedle `production`, `ownUse`
atd.) a do `kpi-grid`:

- primárně použít `consumptionByPnd(row)` (`lib/electricity-calc.ts`, už
  importováno v souboru) sečtené přes všechny měsíce roku,
- pokud je pro daný měsíc `null` (chybí PND import/export), zkusit
  `consumptionByInverter(row)` jako fallback pro ten konkrétní měsíc,
- pokud jsou obě `null`, měsíc do součtu nepřičítat (žádné nahrazování nulou —
  stejný princip jako zbytek appky) a v `detail` ukázat, kolik měsíců z roku
  je zahrnutých (podobně jako `monthsIncluded` v ekonomickém view).

Umístění dlaždice: první nebo druhá v `kpi-grid` (spotřeba je základní číslo,
mělo by být hned vidět, ne až za náklady).

## Ověření

- `npm run build` prochází.
- Po nasazení: dashboard se otevře rovnou na 2026 (aktuálně nejnovější rok),
  ne na 2025.
- KPI „Spotřeba" ukazuje rozumné číslo srovnatelné se součtem posledního
  sloupce tabulky „Porovnání po měsících" (Spotřeba PND/SEMS) za stejný rok.
