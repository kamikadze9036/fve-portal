# Specifikace: průběžné odečty, zdroje dat a roční ekonomika FVE

**Stav:** návrh k odsouhlasení

**Rozsah této změny:** specifikace; nemění běžící aplikaci ani databázi.

## 1. Cíl

Portál má být dlouhodobým nástupcem sešitu `2025 Spotřeby.xlsx`, nikoli jen
vizualizací jednou importované historie. Musí přijmout odečty v přirozené
frekvenci jednotlivých měřidel, uchovat jejich původ a z primárních hodnot
spolehlivě dopočítat intervalové, měsíční a roční přehledy.

Hlavní zásady:

- ukládat primární odečty, ne pouze už spočítané výsledky;
- nespojovat data různých zdrojů do jedné anonymní hodnoty;
- nic nedopočítávat přes chybějící stav ani přes zjevně vadný interval;
- každá finanční metrika musí ukazovat použitý vzorec a předpoklady;
- data musí být opravitelná bez zásahu do SQLite souboru.

## 2. Ověřený současný stav

Historické hodnoty z importovaného sešitu jsou pro zobrazené období správně
zachované. Dashboard zejména ukazuje porovnání PND a měniče pro odběr a
dodávku do sítě a správně počítá vlastní využití jako výrobu FVE mínus export
z měniče.

Současná aplikace ale není kompletní workflow pro další odečty:

- nový záznam elektřiny očekává již hotový odběr místo stavů PND NT a VT;
- voda a tepelné čerpadlo nemají vstup, opravu ani mazání záznamu;
- intervaly TČ jsou uložené jako předpočítané rozdíly místo kumulativních
  stavů;
- zdroj hodnoty není rozlišen na úrovni jednotlivé veličiny;
- nejsou zobrazeny jednotkové ceny, roční úspora a návratnost;
- agregát vody označený „bez závlahy“ má historicky chybný vzorec.

Tato specifikace popisuje cílový stav a migraci bez změny dosavadních
historických dat.

## 3. Slovník a zdroje pravdy

| Oblast | Primární zdroj | Kontrolní / doplňkový zdroj | Poznámka |
|---|---|---|---|
| Odběr ze sítě | DeltaGreen (`/consumption` → Spotřeba) | PND/DIP: kumulativní stavy NT a VT (ruční odečet) | Automatický sběr (`fve-collector`) používá **jen DeltaGreen** — viz rozhodnutí v sekci 11. PND/DIP zůstává jako volitelný ruční zdroj, pokud uživatel sám odečte fyzický elektroměr. |
| Dodávka do sítě | DeltaGreen (`/production` → Výroba) | PND (ruční odečet) | DeltaGreen je obchodník, ale přebírá stejná data od distributora jako PND — ověřeno živě (čísla se shodují), proto se automaticky netahá PND vůbec. |
| Výroba FVE | Home Assistant / InfluxDB / měnič | — | Intervalová hodnota měniče. |
| Import a export měniče | Home Assistant / InfluxDB / měnič | PND / DeltaGreen | Slouží k porovnání přesnosti s distribučním měřením. |
| Spotřeba domu | Home Assistant / InfluxDB / měnič | dopočet | Jde o celkovou spotřebu procházející měničem. |
| Vlastní využití FVE | dopočet z měniče | hodnota hlášená měničem | Standardní dopočet je `výroba FVE − export měniče`. Obě hodnoty lze zobrazit vedle sebe. |
| Náklad na nákup | DeltaGreen | faktura / ruční zápis | Celková částka za odběr v daném intervalu. |
| Výnos za dodávku | DeltaGreen | faktura / ruční zápis | Částka za přetok do sítě. |
| Vyrovnávání sítě | DeltaGreen | faktura / ruční zápis | Dřívější „flexibilita“; ukládat pod novým názvem, staré hodnoty migrovat beze změny významu. |

Zdroj musí být uložen u každé hodnoty. V UI se nesmí DeltaGreen označovat za
distributora a nesmí se zaměňovat PND s údaji z měniče.

## 4. Cílový datový model

### 4.1 Společná metadata

Každý zápis má obsahovat:

- `id`, datum vytvoření a poslední úpravy;
- datum odečtu nebo přesný interval `od` / `do`;
- zdroj (`PND`, `DeltaGreen`, `Home Assistant/InfluxDB`, `SEMS/měnič`,
  `ruční zápis`);
- volitelnou poznámku a odkaz na doklad/import;
- stav kvality: `platné`, `podezřelé`, `neúplné` nebo `nahrazené`.

Záznamy se fyzicky nemažou bez stopy: oprava vytvoří novou verzi nebo se
alespoň uloží audit původní hodnoty, autora a času změny.

### 4.2 Elektřina

Rozdělit primární odečty a intervalové hodnoty:

1. **Odečet PND elektroměru**
   - datum;
   - kumulativní stav NT v kWh;
   - kumulativní stav VT v kWh;
   - volitelně fotografie či poznámka.

   Odběr z DS se automaticky vytvoří jen mezi dvěma chronologicky sousedícími
   platnými odečty:

   ```text
   odběr PND = (NT_nové + VT_nové) − (NT_předchozí + VT_předchozí)
   ```

2. **Intervalový energetický záznam**
   - interval `od` / `do` (typicky kalendářní měsíc, ale ne povinně);
   - export PND v kWh;
   - import a export měniče v kWh;
   - výroba FVE v kWh;
   - celková spotřeba domu z měniče v kWh;
   - volitelně měničem hlášené vlastní využití;
   - export a import DeltaGreen v kWh jako kontrolní obchodní údaj;
   - náklady na nákup, výnos z dodávky a vyrovnávání sítě v Kč.

   U každé položky se uloží její konkrétní zdroj a interval. Pokud zdroj
   poskytuje kumulativní stav místo intervalové hodnoty, uloží se i surový stav
   a rozdíl se počítá stejným mechanismem jako PND.

3. **Odvozené veličiny — neukládat jako ručně editovatelný zdroj pravdy**

   ```text
   vlastní využití FVE = výroba FVE − export měniče
   spotřeba dle PND = výroba FVE − export PND + odběr PND
   spotřeba dle měniče = výroba FVE − export měniče + import měniče
   rozdíl importu = import měniče − odběr PND
   rozdíl exportu = export měniče − export PND
   ```

   Pokud je některá vstupní hodnota prázdná, odpovídající dopočet je `N/A`, ne
   nula. Portál zobrazí zdroj i vzorec po rozkliknutí metriky.

### 4.3 Voda

Vodárna má dva kumulativní vodoměry:

- **hlavní vodoměr**: celý odběr vody včetně závlahy;
- **zálivkový vodoměr**: podmnožina hlavního odběru; z této části se neplatí
  stočné, pouze vodné.

Zadává se datum, stav hlavního vodoměru a stav zálivkového vodoměru. Frekvence
není omezena — půlroční nebo roční odečet je očekávaný případ.

Pro každý interval mezi dvěma platnými odečty se zobrazí:

```text
celková spotřeba vody       = rozdíl hlavního vodoměru
spotřeba na závlahu         = rozdíl zálivkového vodoměru
spotřeba pro vodné + stočné = celková spotřeba − závlaha
```

Kontroly:

- zálivka nesmí být záporná ani vyšší než celková spotřeba;
- klesající kumulativní stav vyžaduje potvrzení „výměna/reset měřidla“;
- chybějící jeden stav nevyrobí intervalový dopočet.

Historický sloupec označovaný jako „Bez zálivky“ se nesmí přenést jako zdroj
pravdy: nyní obsahuje součet hlavní + závlaha, který je při této konfiguraci
chybný. Historii je nutné přepočítat z primárních stavů.

### 4.4 Tepelné čerpadlo

Zadává se jeden kumulativní odečet s datem. Jednotlivé komponenty mohou chybět:

- dodané teplo — vytápění;
- dodané teplo — TUV;
- elektrický příkon — vytápění;
- elektrický příkon — TUV.

Mezi dvěma sousedícími odečty se pro každou komponentu samostatně spočítá
rozdíl. COP se nikdy nepočítá přes smíšené či nedostupné komponenty:

```text
COP vytápění = Δ dodané teplo vytápění / Δ elektrický příkon vytápění
COP TUV      = Δ dodané teplo TUV / Δ elektrický příkon TUV
COP celkem   = (Δ teplo vytápění + Δ teplo TUV)
              / (Δ příkon vytápění + Δ příkon TUV)
```

Chybí-li například vstup pro TUV, lze dál ukázat platné vytápění; celý interval
se automaticky nezahodí. Záporné rozdíly, nulový příkon při kladném teple a
extrémní COP se označí jako podezřelé a vyžadují rozhodnutí uživatele. V ročním
součtu musí být vždy uvedeno, kolik intervalů bylo zahrnuto a kolik vyřazeno.

## 5. Obrazovky a práce s daty

### Záznamy

Přidat samostatnou sekci **Odečty**, se třemi formuláři: Elektřina, Voda a
Tepelné čerpadlo. Formulář elektřiny musí rozlišit PND, DeltaGreen a měnič;
nesmí nabízet jediný neurčený vstup „odběr distributora“.

Každý formulář umožní vytvořit, upravit a archivovat záznam. Před uložením
ukáže náhled vzniklého intervalu, rozdílu vůči minulému stavu a varování
kontrol kvality.

### Přehled elektřiny

Vedle současných porovnání zobrazit:

- výrobu, export, import a vlastní využití z měniče;
- celkovou spotřebu domu z měniče;
- spotřebu dopočtenou dle PND i dle měniče a jejich rozdíl;
- PND a DeltaGreen odděleně, včetně odchylky;
- měsíční tabulku s hodnotami, zdrojem a indikací neúplných dat.

### Přehled vody

Zobrazovat pro každý interval celkovou spotřebu, závlahu a množství pro vodné
a stočné. Název „Bez zálivky“ nahradit jednoznačným „Pro vodné a stočné“.

### Přehled TČ

Zobrazovat samostatně vytápění, TUV a celkem: dodané teplo, elektrický příkon,
COP a délku intervalu. Podezřelé intervaly ponechat viditelné s vysvětlením,
nepotichu je skrýt.

## 6. Roční ekonomika a návratnost FVE

Roční panel musí oddělit tři různé otázky:

1. **Hrubá cena nakoupené elektřiny**

   ```text
   hrubá cena za kWh = náklady na nákup / odběr PND
   ```

   Zobrazuje cenu bez započtení výnosů z FVE a vyrovnávání sítě.

2. **Efektivní cena nakoupené elektřiny po FVE**

   ```text
   čisté náklady = náklady na nákup − výnos z dodávky − vyrovnávání sítě
   efektivní cena za kWh = čisté náklady / odběr PND
   ```

   Výnos z dodávky a vyrovnávání sítě musí být zobrazen samostatně, aby bylo
   jasné, co cenu mění a aby se nic nezapočítalo dvakrát.

3. **Roční úspora a prostá návratnost**

   Nastavení vlastníkem: referenční cena elektřiny bez FVE, investice do FVE a
   případná dotace. Výchozí referenční varianta odpovídá současnému sešitu:

   ```text
   hypotetický náklad bez FVE = spotřeba dle PND × referenční cena za kWh
   roční úspora = hypotetický náklad bez FVE − čisté náklady
   prostá návratnost = (investice − dotace) / roční úspora
   ```

   U každého čísla bude jasně vidět rok, použitá spotřeba, cena a zda jsou
   všechny měsíce kompletní. Tato metrika je finanční model, ne tvrzení o
   přesné kauzální úspoře FVE; její předpoklady musí být editovatelné.

## 7. Migrace historie

1. Udělat zálohu současné SQLite databáze a exportovat ji do CSV/JSON.
2. Vytvořit nové tabulky pro surové odečty, intervalové zdrojové hodnoty a
   audit změn; současné agregované tabulky dočasně ponechat pouze pro rollback.
3. Importovat ze sešitu primární hodnoty:
   - PND NT/VT stavy, PND export, data měniče a finance;
   - stavy hlavního a zálivkového vodoměru;
   - kumulativní stavy TČ.
4. Neimportovat chybné odvozené vzorce vody ani neoznačovat předpočítané
   intervaly TČ za původní stavy.
5. Spustit kontrolní výpočty a porovnat zejména rok 2025 s původním sešitem.
6. Až po ručním odsouhlasení přepnout dashboard na nový model.

Migrace musí být opakovatelná v testovací databázi, idempotentní a bez smazání
stávajících produkčních dat.

## 8. Importy a integrace

První verze má být plně použitelná bez přístupových údajů k externím službám:
ruční zadání a import CSV/XLSX. Automatické napojení je samostatná navazující
etapa:

- Home Assistant / InfluxDB: načíst předem definované senzory, umožnit náhled,
  mapování jednotek a import bez duplicit;
- DeltaGreen: pouze pokud existuje vhodný oficiální export nebo schválený
  přístup; importovat obchodní data odděleně od PND;
- PND: importovat z podporovaného exportu, pokud je k dispozici.

Automatický import nesmí přepsat ručně potvrzený záznam. Musí vytvořit návrh
změn k potvrzení a auditní záznam.

### 8.1 Existující automatický collector (`fve-collector/`)

Mimo tento repozitář (`fve-collector/collector/`, Python) už běží jednou
měsíčně automatický sběr, který POSTuje data na dnešní `/api/data`:

- `deltagreen.py` — Spotřeba a Výroba (kWh) + finance z DeltaGreen
  (`/consumption`, `/production`), viz sekce 3 a 11;
- `influx_ha.py` — výroba FVE, import/export měniče z InfluxDB;
- žádný PND scraper — byl zvažován a zavržen (viz sekce 11).

**Tahle implementace musí buď:**

1. zachovat aktuální tvar `POST /api/data` (jeden plochý JSON objekt s
   `period` + číselnými poli) jako kompatibilní zápisový mód pro tenhle
   collector, i po zavedení nových tabulek pro surové odečty/intervaly; nebo
2. pokud se kontrakt změní, `fve-collector` je potřeba upravit současně —
   nasazovat nový datový model appky a starý collector odděleně by znamenalo,
   že měsíční automatický sběr přestane fungovat beze zjevné chyby.

Collector v tuhle chvíli neposílá `meterNtKwh`/`meterVtKwh` (posílá `null`) —
tahle pole jsou v novém modelu čistě pro ruční PND odečty.

## 9. Ověření hotového řešení

Implementace je hotová, až když platí všechny body:

- nový odečet NT/VT vytvoří správný odběr PND bez ručního zadání rozdílu;
- PND, DeltaGreen a měnič jsou v přehledu rozlišeny a porovnatelné;
- vodní interval s hlavním rozdílem 66 m³ a závlahou 21 m³ ukáže 45 m³ pro
  vodné a stočné;
- TČ z nových kumulativních stavů dopočítá nezávisle COP vytápění, TUV i
  celkem a nevyřadí platné vytápění kvůli chybné TUV;
- roční dashboard zobrazí hrubou a efektivní cenu za kWh, čisté náklady,
  úsporu a návratnost včetně vzorce;
- oprava existujícího záznamu přepočítá navazující intervaly a zachová audit;
- data roku 2025 se po migraci shodují s ověřenými hodnotami sešitu;
- prázdné budoucí měsíce nevytvoří nulové či záporné součty;
- Docker Compose na NASu proběhne beze změny cesty k produkční SQLite databázi
  a s vytvořenou zálohou před migrací.

## 10. Doporučené pořadí implementace

1. Databázové schéma, migrace, záloha a testovací import historie.
2. API pro odečty, výpočty a audit změn.
3. Formuláře a editace pro vodu a TČ.
4. Elektřina: PND NT/VT, zdroje, srovnání a korekce záznamů.
5. Finanční roční panel a nastavení modelu návratnosti.
6. CSV/XLSX import.
7. Sladit `POST /api/data` s existujícím `fve-collector` (sekce 8.1) —
   automatické integrace HA/InfluxDB a DeltaGreen už běží, PND/DIP zůstává
   jen jako ruční doplněk (viz sekce 11).
8. Regresní testy, ověření na záloze produkčních dat a teprve pak nasazení na
   Synology.

## 11. Rozhodnutí — odsouhlaseno

**PND vs. DeltaGreen jako primární zdroj (vyřešeno):** Původní návrh počítal
s PND jako primárním technickým zdrojem a DeltaGreen jako kontrolní kopií.
Po ověření živě proti oběma portálům (`pnd.cezdistribuce.cz` — nová verze
`cezpnd2`, přihlášení přes ČEZ MEPAS OAuth2/CAS; a `dip.cezdistribuce.cz`)
platí opak:

- DeltaGreen je obchodník, ale přebírá **stejná** data od distributora — čísla
  z jeho `/production` (Výroba, tj. dodávka do sítě) se shodovala s tím, co
  ukazuje PND;
- PND má navíc mnohem složitější UI na automatizaci (interaktivní přepínání
  granularity/roku, žádné jednoduché API);
- DIP (`dip.cezdistribuce.cz/irj/portal/prehled-om/`) je jednodušší statická
  stránka s poli „Poslední stav elektroměru (NT)“/„(VT)“ — použitelná pro
  **ruční** kontrolu fyzického elektroměru, ale netahá se automaticky.

**Výsledek:** automatický sběr (`fve-collector`) používá výhradně DeltaGreen
(+ InfluxDB pro výrobu/měnič). PND se nescrapuje vůbec. DIP i PND zůstávají
jako volitelný **ruční** zdroj pro `meterNtKwh`/`meterVtKwh`, pokud si uživatel
sám chce dohledat/zapsat fyzický stav elektroměru — netýká se automatizace.
Sekce 3 tabulka výše je podle toho aktualizovaná.

**Verzování referenční ceny/investice/dotace pro návratnost (vyřešeno):**
hodnota platná „od zvoleného data“ (ne pevně podle kalendářního roku) — jde
změnit kdykoliv během roku, např. při zdražení elektřiny v půlce roku.
Výchozí historická hodnota 5,50 Kč/kWh a čistá investice 230 000 Kč se
přenesou jako editovatelné předvyplnění platné od nejstaršího dostupného data.
