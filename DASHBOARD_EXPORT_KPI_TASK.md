# Úkol: chybějící KPI „Dodávka do sítě"

Malá doplňková oprava k `DASHBOARD_FIXES_TASK.md` (implementováno v PR #6/#7).
Import (odběr) má vlastní KPI dlaždici s rozpadem distributor/měnič, export
(dodávka do sítě) ne — je jen jako vedlejší `detail` text pod „Čisté náklady".

`components/fve-dashboard.tsx`, `ElectricityView`, `kpi-grid`:

```tsx
<Kpi icon={<Zap />} label="Odběr · distributor" value={`${number.format(stats.distributorImport)} kWh`} detail={`Měnič ${number.format(stats.inverterImport)} kWh`} accent="blue" />
```

Přidat symetrickou dlaždici hned vedle (`stats.distributorExport` a
`stats.inverterExport` už existují ve `stats` reduce, nic nového počítat
netřeba):

```tsx
<Kpi icon={<Sun />} label="Dodávka · distributor" value={`${number.format(stats.distributorExport)} kWh`} detail={`Měnič ${number.format(stats.inverterExport)} kWh`} accent="sun" />
```

Detail pod „Čisté náklady" (`Dodávka PND ${...} kWh`) může zůstat (neškodí,
je to jen redundantní), nebo se dá zjednodušit na text bez čísla — netriviální
rozhodnutí, klidně nech, jak uznáš za vhodné.

## Ověření

- `npm run build` prochází.
- Hodnota nové dlaždice odpovídá součtu sloupce „Dodávka PND / SEMS" v
  tabulce „Porovnání po měsících" za stejný rok.
