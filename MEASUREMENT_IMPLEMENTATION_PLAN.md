# Implementační plán k MEASUREMENT_WORKFLOW_SPEC.md

Tenhle dokument je **jak**, doplňující `MEASUREMENT_WORKFLOW_SPEC.md` (**co**).
Cílí na konkrétní schéma, API kontrakty a soubory — má být proveditelný přímo,
bez další architektonické rozvahy. Odkazy typu „spec 4.2.3“ míří na sekce
`MEASUREMENT_WORKFLOW_SPEC.md`.

**Rozsah:** stejné jako spec — plán, žádný kód appky se tímto dokumentem nemění.

## 0. Co už dnes existuje (výchozí stav)

- `db/schema.ts` — `electricityReadings`, `waterReadings`, `heatPumpReadings`,
  `appMetadata`. Ploché tabulky, jeden řádek = jedno období, žádné surové
  odečty, žádný audit, žádné sledování zdroje na úrovni pole.
- `app/api/data/route.ts` — `GET` vrací všechny tři tabulky najednou; `POST`
  dělá čistý `INSERT` do `electricityReadings` (žádný upsert; unique constraint
  na `period` = jediná ochrana proti duplicitě).
- `lib/data.ts` — `ensureImportedData()` (reseeduje ne-ruční řádky podle
  `DATASET_VERSION` z `lib/seed-data.ts`), `getAllData()`.
- `components/fve-dashboard.tsx` — jediný formulář (elektřina); odvozené
  hodnoty (`ownUse`, `distributorConsumption`, `inverterConsumption`,
  `netCost`, `compareSources`) se počítají **v komponentě z plochých řádků**
  — ne v API/DB. Tenhle vzor se zachovává i v novém modelu (spec: „neukládat
  jako ručně editovatelný zdroj pravdy“).
- **`fve-collector/` (Python, mimo tenhle repo, mimo tuhle git historii)** —
  běží jednou měsíčně jako Docker kontejner na Synology NASu, POSTuje na
  `/api/data` payload přesně tohoto tvaru:
  ```json
  {
    "period": "2026-08-01",
    "meterNtKwh": null, "meterVtKwh": null,
    "pndExportKwh": 303.31, "gridImportKwh": 250.17,
    "pvGenerationKwh": 809.2, "gridExportKwh": 303.55, "pvPurchaseKwh": 245.77,
    "pvSelfUseReportedKwh": null,
    "saleRevenueCzk": 888.52, "purchaseCostCzk": 1825.55, "flexibilityRevenueCzk": 59.69
  }
  ```
  **Tenhle kontrakt musí po implementaci dál fungovat beze změny na Python
  straně** (viz spec 8.1, a bod 4 níže).

## 1. Schéma (`db/schema.ts`)

Staré 3 tabulky **zůstávají nezměněné** (rollback, spec 7). Přidávají se:

```ts
// Surový odečet PND elektroměru (NT/VT stav) — ruční zápis, nepravidelná frekvence.
export const electricityMeterReadings = sqliteTable('electricity_meter_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  readingDate: text('reading_date').notNull(),
  meterNtKwh: real('meter_nt_kwh').notNull(),
  meterVtKwh: real('meter_vt_kwh').notNull(),
  source: text('source').notNull().default('PND'), // 'PND' | 'DIP' | 'ruční zápis'
  note: text('note'),
  qualityStatus: text('quality_status').notNull().default('platné'), // viz enum níže
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex('ux_electricity_meter_readings_date').on(t.readingDate)]);

// Nahrazuje electricityReadings jako cílový zápis pro intervalová data.
export const electricityIntervalRecords = sqliteTable('electricity_interval_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  intervalStart: text('interval_start').notNull(),
  intervalEnd: text('interval_end').notNull(),
  pndImportKwh: real('pnd_import_kwh'),          // odběr ze sítě (DeltaGreen nebo dopočet z NT/VT)
  pndExportKwh: real('pnd_export_kwh'),          // dodávka do sítě (DeltaGreen)
  inverterImportKwh: real('inverter_import_kwh'),// import měniče (Influx/HA) — kontrolní
  inverterExportKwh: real('inverter_export_kwh'),// export měniče (Influx/HA) — kontrolní
  pvGenerationKwh: real('pv_generation_kwh'),
  houseConsumptionKwh: real('house_consumption_kwh'), // NOVÉ pole (spec 4.2.2) — "Total Load" z Influx
  pvSelfUseReportedKwh: real('pv_self_use_reported_kwh'),
  purchaseCostCzk: real('purchase_cost_czk'),
  saleRevenueCzk: real('sale_revenue_czk'),
  gridBalancingCzk: real('grid_balancing_czk'),  // přejmenováno z "flexibilityRevenueCzk" (spec 3)
  sourceSheet: text('source_sheet').notNull().default('Ruční záznam'),
  qualityNote: text('quality_note'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex('ux_electricity_interval').on(t.intervalStart, t.intervalEnd)]);

// Provenience jednotlivých polí electricityIntervalRecords — jak spec žádá
// "zdroj musí být uložen u každé hodnoty", bez EAV modelu v hlavní tabulce.
export const intervalFieldSources = sqliteTable('interval_field_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recordId: integer('record_id').notNull().references(() => electricityIntervalRecords.id),
  fieldName: text('field_name').notNull(), // např. 'pndImportKwh'
  source: text('source').notNull(),        // 'PND' | 'DeltaGreen' | 'Home Assistant/InfluxDB' | 'ruční zápis'
  capturedAt: text('captured_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex('ux_interval_field_sources').on(t.recordId, t.fieldName)]);

export const waterMeterReadings = sqliteTable('water_meter_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  measuredAt: text('measured_at').notNull(),
  mainMeterM3: real('main_meter_m3').notNull(),
  gardenMeterM3: real('garden_meter_m3').notNull(),
  source: text('source').notNull().default('ruční zápis'),
  note: text('note'),
  qualityStatus: text('quality_status').notNull().default('platné'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex('ux_water_meter_readings_date').on(t.measuredAt)]);

export const heatPumpMeterReadings = sqliteTable('heat_pump_meter_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  measuredAt: text('measured_at').notNull(),
  heatOutputKwh: real('heat_output_kwh'),       // kumulativní, každá komponenta samostatně nullable
  hotWaterOutputKwh: real('hot_water_output_kwh'),
  heatInputKwh: real('heat_input_kwh'),
  hotWaterInputKwh: real('hot_water_input_kwh'),
  source: text('source').notNull().default('ruční zápis'),
  note: text('note'),
  qualityStatus: text('quality_status').notNull().default('platné'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex('ux_heat_pump_meter_readings_date').on(t.measuredAt)]);

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  recordId: integer('record_id').notNull(),
  fieldName: text('field_name').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedAt: text('changed_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  changedBy: text('changed_by').notNull().default('ruční úprava'),
});

export const economicsSettings = sqliteTable('economics_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  effectiveFrom: text('effective_from').notNull(), // ISO datum, "platné od"
  referencePriceCzkPerKwh: real('reference_price_czk_per_kwh').notNull(),
  investmentCzk: real('investment_czk').notNull(),
  subsidyCzk: real('subsidy_czk').notNull().default(0),
  note: text('note'),
}, (t) => [uniqueIndex('ux_economics_settings_effective_from').on(t.effectiveFrom)]);
```

`qualityStatus` enum (textově, SQLite nemá nativní enum): `'platné' | 'podezřelé' | 'neúplné' | 'nahrazené'`
— validovat v API vrstvě, ne v DB.

**Mazání (spec 4.1: „záznamy se fyzicky nemažou bez stopy“):** DELETE endpointy
nastaví `qualityStatus = 'nahrazené'` (soft delete). Fyzické `DELETE` z DB není
přes API vystavené vůbec.

## 2. Odvozené výpočty (nové soubory, čisté funkce)

`lib/electricity-calc.ts` — vzorce ze spec 4.2.3, plus PND odvození ze spec 4.2.1:

```ts
export function pndImportFromMeterReadings(prev: MeterReading | null, next: MeterReading): number | null {
  if (!prev) return null;
  return (next.meterNtKwh + next.meterVtKwh) - (prev.meterNtKwh + prev.meterVtKwh);
}

export function ownUse(row): number | null // = pvGenerationKwh - inverterExportKwh, fallback na pvSelfUseReportedKwh
export function consumptionByPnd(row): number | null   // = pvGenerationKwh - pndExportKwh + pndImportKwh
export function consumptionByInverter(row): number | null // = pvGenerationKwh - inverterExportKwh + inverterImportKwh
export function importDelta(row): number | null  // = inverterImportKwh - pndImportKwh
export function exportDelta(row): number | null   // = inverterExportKwh - pndExportKwh
```

Pravidlo z spec 4.2.3 platí doslovně: chybí-li vstup, výsledek je `null`
(zobrazeno jako `N/A`), nikdy `0`. `ownUse`/`netCost` jde znovupoužít téměř
beze změny z `components/fve-dashboard.tsx` (jen přejmenovat pole podle nového
schématu — `flexibilityRevenueCzk` → `gridBalancingCzk`).

`lib/water-calc.ts` (spec 4.3, **opravuje historickou chybu**):

```ts
export function waterInterval(prev: WaterMeterReading | null, next: WaterMeterReading) {
  if (!prev) return null;
  const total = next.mainMeterM3 - prev.mainMeterM3;
  const garden = next.gardenMeterM3 - prev.gardenMeterM3;
  const suspicious = garden < 0 || garden > total || total < 0;
  return {
    totalM3: total,
    gardenM3: garden,
    householdM3: total - garden, // ROZDÍL, ne součet — starý sloupec "Bez zálivky" sčítal (viz spec 2)
    qualityStatus: suspicious ? 'podezřelé' : 'platné',
  };
}
```

`lib/heatpump-calc.ts` (spec 4.4):

```ts
export function heatPumpInterval(prev: HeatPumpMeterReading | null, next: HeatPumpMeterReading) {
  if (!prev) return null;
  const dHeatOut = deltaOrNull(prev.heatOutputKwh, next.heatOutputKwh);
  const dWaterOut = deltaOrNull(prev.hotWaterOutputKwh, next.hotWaterOutputKwh);
  const dHeatIn = deltaOrNull(prev.heatInputKwh, next.heatInputKwh);
  const dWaterIn = deltaOrNull(prev.hotWaterInputKwh, next.hotWaterInputKwh);
  return {
    heatCop: (dHeatOut != null && dHeatIn) ? dHeatOut / dHeatIn : null,
    hotWaterCop: (dWaterOut != null && dWaterIn) ? dWaterOut / dWaterIn : null,
    totalCop: (dHeatOut != null && dWaterOut != null && dHeatIn != null && dWaterIn != null)
      ? (dHeatOut + dWaterOut) / (dHeatIn + dWaterIn) : null,
    suspicious: /* záporný rozdíl, nulový příkon při kladném teple, extrémní COP (>8 nebo <1) */,
  };
}
```

`lib/economics-calc.ts` (spec 6):

```ts
export function grossPriceCzkPerKwh(purchaseCostCzk, pndImportKwh) {
  return pndImportKwh ? purchaseCostCzk / pndImportKwh : null;
}
export function netCostCzk(purchaseCostCzk, saleRevenueCzk, gridBalancingCzk) {
  return (purchaseCostCzk ?? 0) - (saleRevenueCzk ?? 0) - (gridBalancingCzk ?? 0);
}
export function effectivePriceCzkPerKwh(netCost, pndImportKwh) {
  return pndImportKwh ? netCost / pndImportKwh : null;
}
export function annualSavings(consumptionByPndSum, referencePrice, netCostSum) {
  const hypothetical = consumptionByPndSum * referencePrice;
  return hypothetical - netCostSum;
}
export function simplePaybackYears(investmentCzk, subsidyCzk, annualSavingsCzk) {
  return annualSavingsCzk > 0 ? (investmentCzk - subsidyCzk) / annualSavingsCzk : null;
}
```

Roční agregace musí explicitně počítat, kolik měsíců je kompletních (spec 6:
„bude jasně vidět rok, použitá spotřeba, cena a zda jsou všechny měsíce
kompletní“) — vrátit `{ value, monthsIncluded, monthsTotal }`, ne jen číslo.

## 3. Migrace (`drizzle/000X_*.sql` + `scripts/migrate-to-raw-readings.mjs`)

Postup (viz spec 7, konkretizováno):

1. Drizzle migrace vytvoří 7 nových tabulek ze sekce 1. **Nic nemaže.**
2. Node skript (spouštět ručně / jednorázově, ne při každém startu kontejneru
   — na rozdíl od `scripts/migrate.mjs`, který běží při každém bootu):
   - `electricityMeterReadings`: backfilovat jen řádky z `electricityReadings`,
     kde `meterNtKwh`/`meterVtKwh` **nejsou null** (drtivá většina historie je
     `null` — to je v pořádku, spec zakazuje cokoliv dopočítávat/fabrikovat).
     `readingDate` = poslední den intervalu (`period` + měsíc − 1 den, nebo
     `sourceDate` pokud existuje a je přesnější).
   - `electricityIntervalRecords`: 1:1 kopie z `electricityReadings` (mapování
     `gridImportKwh`→`pndImportKwh`, `gridExportKwh`→`inverterExportKwh`,
     `pvPurchaseKwh`→`inverterImportKwh`, `flexibilityRevenueCzk`→`gridBalancingCzk`,
     `period`→`intervalStart` + `intervalEnd` = poslední den měsíce). Zapsat i
     odpovídající `intervalFieldSources` řádky se `source = sourceSheet`
     (nebo `'DeltaGreen'`/`'Home Assistant/InfluxDB'` pro nově příchozí data od
     `fve-collector` — historická data mají zdroj neznámý/smíšený, označit jako
     `'ruční zápis'` pokud `sourceSheet === 'Ruční záznam'`, jinak `'import ze sešitu'`).
   - `waterMeterReadings`: 1:1 kopie `mainMeterM3`/`gardenMeterM3` z
     `waterReadings`. **Needěla se přenáší `householdConsumptionM3`** (chybný
     vzorec) — nový model ho vždy dopočítá přes `waterInterval()`.
   - `heatPumpMeterReadings`: **záměrně se nechá prázdná.** Stará
     `heatPumpReadings` obsahuje už předpočítané intervalové rozdíly, ne
     kumulativní stavy — z nich nejde zpětně bezpečně rekonstruovat absolutní
     hodnoty (žádná známá počáteční nula). Stará tabulka zůstává jako
     read-only historický pohled (spec 7 bod 6 — staré tabulky pro rollback);
     nové kumulativní odečty se začnou sbírat od teď dopředu.
3. Kontrolní výpočet: pro rok 2025 spočítat součty přes nový model a porovnat
   se starým `electricityReadings`/`waterReadings` (spec 9).
4. Teprve po ručním odsouhlasení přepnout `GET /api/data` a dashboard na nový
   model (viz bod 5).

Migrační skript musí být bezpečně opakovatelně spustitelný (`INSERT OR IGNORE`
/ kontrola existence před zápisem), nemazat nic ve starých tabulkách.

## 4. API

### 4.1 Nové CRUD endpointy (jednotný vzor pro všechny tři typy odečtů)

```
GET    /api/readings/electricity-meter          → seznam, seřazeno podle readingDate
POST   /api/readings/electricity-meter          → { readingDate, meterNtKwh, meterVtKwh, note? }
PATCH  /api/readings/electricity-meter/:id       → částečná úprava; každé změněné pole zapíše řádek do auditLog
DELETE /api/readings/electricity-meter/:id       → qualityStatus = 'nahrazené' (soft)

GET/POST/PATCH/DELETE /api/readings/water                    (stejný vzor, waterMeterReadings)
GET/POST/PATCH/DELETE /api/readings/heat-pump                (stejný vzor, heatPumpMeterReadings)
```

Validace: čísla nezáporná (kromě financí, kde záporná hodnota může být
legitimní — viz Duben 2026 v Excelu, `cena (kč/kWh)` vyšla záporná), datum
validní ISO, `PATCH`/`DELETE` na neexistující `id` → 404.

### 4.2 Intervalový endpoint s částečným upsertem (klíčové pro `fve-collector`)

```
POST /api/readings/electricity-interval
Body: {
  intervalStart: string, intervalEnd: string,
  source: 'PND' | 'DeltaGreen' | 'Home Assistant/InfluxDB' | 'ruční zápis',
  fields: { pndImportKwh?, pndExportKwh?, inverterImportKwh?, ... } // jen podmnožina sloupců
}
```

Logika:
1. Najít existující `electricityIntervalRecords` řádek s přesnou shodou
   `(intervalStart, intervalEnd)`.
2. Pokud existuje: `UPDATE` jen sloupců přítomných v `fields` (+ `updatedAt`);
   pro každé pole upsertnout odpovídající řádek do `intervalFieldSources`
   (`source`, `capturedAt = now`). Pokud pole už mělo jinou hodnotu z jiného
   zdroje, přepíše se (žádné mlčenlivé míchání — poslední zápis vyhrává,
   ale zdroj se eviduje, takže je to dohledatelné).
3. Pokud neexistuje: `INSERT` nový řádek jen s poli z `fields` (zbytek `null`)
   + odpovídající `intervalFieldSources` řádky.

Tohle umožňuje, aby `fve-collector` (měsíčně, `source: 'DeltaGreen'`/
`'Home Assistant/InfluxDB'`) a případný budoucí ruční PND odečet (`source: 'PND'`)
zapisovaly do **stejného** intervalového záznamu nezávisle na sobě, bez
kolize a bez přepisování polí, která neposílají.

### 4.3 Zpětná kompatibilita s existujícím `fve-collector` — POVINNÉ

`POST /api/data` **zůstává** přesně v dnešním tvaru (viz sekce 0 výše) jako
tenký adaptér nad `4.2`:

```
POST /api/data { period, meterNtKwh, meterVtKwh, pndExportKwh, gridImportKwh,
                 pvGenerationKwh, gridExportKwh, pvPurchaseKwh,
                 pvSelfUseReportedKwh, saleRevenueCzk, purchaseCostCzk,
                 flexibilityRevenueCzk }
  ↓ (interní překlad, žádná změna na Python straně)
intervalStart = period
intervalEnd   = poslední den měsíce z `period`
source        = 'DeltaGreen'  (collector dnes posílá jen DeltaGreen+Influx odvozená pole)
fields = {
  pndImportKwh: gridImportKwh, pndExportKwh, pvGenerationKwh,
  inverterExportKwh: gridExportKwh, inverterImportKwh: pvPurchaseKwh,
  pvSelfUseReportedKwh, saleRevenueCzk, purchaseCostCzk,
  gridBalancingCzk: flexibilityRevenueCzk,
}
→ zavolat stejnou logiku jako 4.2
```

`meterNtKwh`/`meterVtKwh` z payloadu collectoru se **ignorují** (collector je
dnes posílá jako `null`, spec 8.1) — pokud by je někdy posílal, mapovat na
`POST /api/readings/electricity-meter`, ne do intervalového záznamu.

Chování při konfliktu: **beze změny** oproti dnešku — pokud stejný `(intervalStart,
intervalEnd)` už existuje se stejnými poli vyplněnými, endpoint vrátí `201`
(accept, merguje se) místo dnešního `400 "existuje"`. `fve-collector`'s
`main.py` řádek `elif response.status_code == 400 and "existuje" in response.text`
(main.py:104) se stane mrtvým kódem, ale nerozbije se — bezpečné ponechat.

### 4.4 Nastavení roční ekonomiky

```
GET  /api/economics-settings          → seznam podle effectiveFrom
POST /api/economics-settings          → { effectiveFrom, referencePriceCzkPerKwh, investmentCzk, subsidyCzk, note? }
```

Pro daný rok/měsíc se používá nastavení s nejnovějším `effectiveFrom <= `
danému datu (spec 11: „platná od zvoleného data“). Výchozí seed: jeden řádek
`effectiveFrom: '2020-01-01'` (nebo datum nejstaršího záznamu), `referencePriceCzkPerKwh: 5.5`,
`investmentCzk: 230000`, `subsidyCzk: 0`.

### 4.5 `GET /api/data`

Může se změnit — dashboard se přepisuje současně (bod 5), takže návratový
tvar nemusí zůstat bajtově identický. Doporučení: vrátit i nová data
(`electricityMeterReadings`, `waterMeterReadings`, `heatPumpMeterReadings`,
`economicsSettings`) vedle přepočítaných `electricityIntervalRecords`, ať
frontend má vše z jednoho volání.

## 5. UI

### Nová sekce „Odečty“ (spec 5)

Tři formuláře — stejné komponenty jako dnešní dialog v `fve-dashboard.tsx`
(`Dialog`/`Input`/`Label`/`NativeSelect`, viz `components/ui/`):

- **Elektřina** — `readingDate`, `meterNtKwh`, `meterVtKwh` → `POST /api/readings/electricity-meter`.
  Formulář ukáže náhled: „Odběr od posledního odečtu: X kWh“ (dopočet přes
  `pndImportFromMeterReadings`), ne surové zadání odběru.
- **Voda** — `measuredAt`, `mainMeterM3`, `gardenMeterM3` → `POST /api/readings/water`.
  Náhled: celková spotřeba / závlaha / pro vodné+stočné přes `waterInterval()`.
- **Tepelné čerpadlo** — `measuredAt` + 4 volitelná pole → `POST /api/readings/heat-pump`.
  Náhled: COP po komponentách přes `heatPumpInterval()`, s varováním u
  podezřelých hodnot.

Každý formulář má i editaci/archivaci existujícího záznamu (`PATCH`/`DELETE`
na `/api/readings/...:id`) — tabulka historie s tlačítky Upravit/Archivovat.

### Přehledy (rozšíření `ElectricityView`/`WaterView`/`HeatView`)

Podle spec 5 — sloupce/KPI navíc: `houseConsumptionKwh`, `consumptionByPnd`
vs `consumptionByInverter` a jejich rozdíl, indikace zdroje a neúplných dat
(`qualityStatus`/`qualityNote` z `intervalFieldSources`). Vodní přehled:
přejmenovat „Bez zálivky“ → „Pro vodné a stočné“.

### Nový panel: Roční ekonomika (spec 6)

Nová karta/sekce (např. čtvrtá položka v `sidebar`, `NavButton` `icon={<CircleDollarSign />}`):
- Hrubá cena za kWh, efektivní cena za kWh (obě se vzorcem v tooltipu/rozkliku).
- Roční úspora, prostá návratnost.
- Formulář pro `economicsSettings` (editace referenční ceny/investice/dotace
  s `effectiveFrom`).
- U každého čísla: rok, kolik měsíců zahrnuto/kompletních (spec 6).

## 6. Ověření (přebírá spec 9 doslovně + doplňuje)

Všechny body ze spec 9 platí beze změny. Navíc:

- **`fve-collector` regresní test**: po nasazení nového schématu spustit
  `docker compose run --rm fve-collector python main.py <libovolný již
  existující měsíc>` (viz `fve-collector/README.md`) a ověřit, že `POST
  /api/data` pořád vrací `201`/`400 existuje` (ne `500`), a že se v novém
  `electricityIntervalRecords` objeví/aktualizuje odpovídající řádek se
  správnými `intervalFieldSources`.
- `heatPumpMeterReadings` je po migraci prázdná (očekávané, ne bug) — ověřit,
  že staré `heatPumpReadings` zůstávají čitelné a `HeatView` je pořád umí
  zobrazit (dokud nepřibudou nové kumulativní odečty).
- Bind-mount databáze (`./data/fve.db`, viz `DOCKER.md`) — migrace běží proti
  téhle cestě, ne proti starému Miniflare volume (to zůstává nedotčené, viz
  `MIGRATION.md`).

## 7. Doporučené pořadí (konkretizace spec 10)

1. Schéma (sekce 1) + migrace (sekce 3), bez API/UI změn — ověřit na kopii dat.
2. `lib/*-calc.ts` (sekce 2) + jednotkové testy na vzorcích (zejména vodní
   oprava a TČ per-komponentové COP).
3. `POST /api/data` kompatibilní adaptér (sekce 4.3) — **prioritně před UI
   změnami**, ať `fve-collector` neběží proti rozbitému endpointu ani chvíli.
4. Zbytek API (sekce 4.1, 4.2, 4.4).
5. Formuláře pro vodu a TČ (nové, spec 5).
6. Elektřina: PND odečty, přepočítané přehledy, zdroje/odchylky.
7. Roční ekonomický panel (sekce 6).
8. CSV/XLSX import (spec 8) — nejnižší priorita, spec už tak řadí.
9. Regresní test s `fve-collector` (sekce 6 výše), nasazení na Synology
   stejným postupem jako `MIGRATION.md`/`DOCKER.md`.
