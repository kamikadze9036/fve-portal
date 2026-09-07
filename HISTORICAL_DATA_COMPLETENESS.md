# Doplnění historie FVE — rok 2022

## Cíl

Pro výpočet celkové spotřeby domu podle síťového měření platí pro každý
kalendářní měsíc:

```text
spotřeba domu = výroba FVE − dodávka do sítě + odběr ze sítě
```

Výpočet zůstává důležitý i v období, kdy část spotřeby procházela mimo měnič:
síťové měření pak zahrne celý dům, zatímco samotný měnič ne.

## Stav v portálu

Portál naměřených dat obsahuje pro rok 2022 síťové hodnoty potřebné pro
**odběr ze sítě** i **dodávku do sítě**. Pro plný výpočet tedy zbývá dodat jen
měsíční **výrobu FVE**.

| Období | Co je potřeba doplnit |
|---|---|
| leden 2022 | výroba FVE |
| únor 2022 | výroba FVE |
| březen–prosinec 2022 | ověřit/převzít výrobu FVE z měniče; v importovaném sešitu je již k dispozici |

## Požadovaný zdroj

Použít intervalové hodnoty výroby z měniče / Home Assistantu (kWh) po
kalendářních měsících. Hodnota se uloží jako `pvGenerationKwh`; síťový odběr a
dodávka se přebírají z portálu naměřených dat. Po doplnění lze rok 2022
zahrnout do KPI Spotřeba podle síťového měření i do porovnání se spotřebou
z měniče, kde je k dispozici.
