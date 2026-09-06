# FVE Portal

Dashboard spotřeb domu ve Zruči: elektřina a FVE, voda a tepelné čerpadlo.
Aplikace je standardní self-hosted **Next.js** aplikace s Drizzle ORM a SQLite.

## Architektura

- **Next.js 16** s App Routerem a standalone výstupem pro Docker
- **SQLite** přes `better-sqlite3`; výchozí cesta databáze je `/data/fve.db`
- **Drizzle ORM** a SQL migrace ve složce `drizzle/`
- **Docker Compose** s pojmenovaným volume `fve-portal-data`

Původní vinext/Cloudflare D1 implementace byla nahrazena běžícím Next.js
serverem. Aplikace při startu kontejneru aplikuje Drizzle migrace a následně
spustí `node server.js`; pro provoz není potřeba Cloudflare účet, Wrangler ani
emulace Miniflare.

## Vývoj

```sh
npm install
npm run dev
```

## Databáze

```sh
npm run db:generate  # vytvoří novou SQL migraci po změně db/schema.ts
npm run db:migrate   # aplikuje migrace do DATABASE_PATH nebo /data/fve.db
```

Při prvním požadavku aplikace naplní čistou databázi importovanými daty ze
zdrojového sešitu. Další informace k Dockeru a bezpečnému přechodu z původního
volume jsou v [DOCKER.md](DOCKER.md) a [MIGRATION.md](MIGRATION.md).
