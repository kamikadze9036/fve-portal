# Architektura: přechod z vinext/Cloudflare D1 na plain Next.js + SQLite

Návrh (zatím neimplementováno) — cíl je zbavit se závislosti na Cloudflare
Workers runtime a `wrangler dev` jako "produkčním" serveru, a nahradit ji
standardním self-hosted Next.js buildem s obyčejným SQLite souborem.

## Proč

Appka byla vygenerovaná přes Codex (`@openai/sites-vite-plugin`, `CODEX_SANDBOX`
env check ve `vite.config.ts`) s cílem nasazení přímo na Cloudflare Workers +
D1. Self-hosting na Synology NASu teď běží tak, že `wrangler dev --persist-to`
lokálně emuluje Workers runtime + D1 přes Miniflare — funguje to, ale je to
vývojářský dev server používaný jako produkční proces, s vazbou na wrangler
CLI a jeho chování napříč verzemi.

Appka už dnes používá standardní Next.js App Router konvence (`app/page.tsx`,
`app/layout.tsx`, `app/api/data/route.ts`), takže přechod na skutečný `next`
je hlavně výměna build/serve/DB vrstvy, ne přepis UI.

## Současný stav

| Vrstva | Dnes |
|---|---|
| Framework | `vinext` (Vite+Rolldown, Codex "sites" plugin) |
| Build | `vinext build` → `dist/{client,server}` |
| Serve | `wrangler dev --local --persist-to /data` (Miniflare emulace Workers+D1) |
| DB binding | `drizzle-orm/d1` + `env.DB` z `import { env } from 'cloudflare:workers'` |
| DB soubor (reálně) | plain SQLite ve WAL módu, uvnitř Docker volume `fve-portal-data`, cesta `/data/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` — ověřeno na běžícím nasazení |
| Config soubory vázané na Cloudflare | `vite.config.ts`, `wrangler.docker.jsonc`, `.openai/hosting.json`, `docker-entrypoint.sh` (spouští `wrangler d1 migrations apply`) |

Migrace v `drizzle/*.sql` jsou čisté SQLite DDL bez D1-specifické syntaxe —
přímo použitelné i po výměně adaptéru.

## Cílový stav

| Vrstva | Po migraci |
|---|---|
| Framework | skutečný `next` (Next.js, App Router) |
| Build | `next build` s `output: "standalone"` |
| Serve | `node server.js` (standalone Next.js server) |
| DB binding | `drizzle-orm/better-sqlite3` (nebo `drizzle-orm/libsql`), cesta k souboru z env proměnné, výchozí `/data/fve.db` |
| Migrace při startu | drizzle-kit migrator (`drizzle-orm/better-sqlite3/migrator`) spuštěný jednou při bootu procesu, ne přes wrangler |
| Docker | standardní multi-stage Next.js standalone image |

## Konkrétní změny podle souborů

- **`package.json`**
  - Odebrat: `vinext`, `wrangler`, `@cloudflare/vite-plugin`, `@cloudflare/workers-types`, `@openai/sites-vite-plugin`, `@vitejs/plugin-rsc`, `react-server-dom-webpack`, `vite`, `@vitejs/plugin-react` (pokud nejsou potřeba jinde).
  - Přidat: `next`, `better-sqlite3` (+ `@types/better-sqlite3`).
  - Scripts: `dev`: `next dev`, `build`: `next build`, `start`: `next start` (nebo `node .next/standalone/server.js` při standalone výstupu), `lint`/`format` beze změny.

- **`next.config.ts`** — nahradit současný prázdný config (`const nextConfig: NextConfig = {}`) za:
  ```ts
  const nextConfig: NextConfig = { output: 'standalone' };
  ```

- **`vite.config.ts`, `wrangler.docker.jsonc`** — smazat (nepotřebné bez vinext/wrangler).

- **`db/index.ts`** — nahradit:
  ```ts
  import { env } from 'cloudflare:workers';
  import { drizzle } from 'drizzle-orm/d1';
  ```
  za:
  ```ts
  import Database from 'better-sqlite3';
  import { drizzle } from 'drizzle-orm/better-sqlite3';

  const sqlite = new Database(process.env.DATABASE_PATH ?? '/data/fve.db');
  export function getDb() {
    return drizzle(sqlite, { schema });
  }
  ```

- **`drizzle.config.ts`** — dialect zůstává `sqlite`, přidat `dbCredentials: { url: process.env.DATABASE_PATH ?? '/data/fve.db' }` (pro `db:generate`/lokální migrace přes drizzle-kit CLI mimo container).

- **Migrace při startu** — nový malý soubor (např. `db/migrate.ts`), zavolaný jednou při startu procesu (např. z vlastního `server.ts` entrypointu, nebo přes Next.js `instrumentation.ts` hook `register()`), který spustí `migrate(drizzle(sqlite), { migrationsFolder: './drizzle' })` před tím, než začne obsluhovat požadavky.

- **`app/api/data/route.ts`, `lib/data.ts`, `db/schema.ts`, `components/fve-dashboard.tsx`** — beze změny (používají jen Drizzle query builder, žádnou D1/Cloudflare specifickou API).

- **`Dockerfile`** — přepsat na standardní Next.js standalone multi-stage build:
  ```dockerfile
  FROM node:22-bookworm-slim AS build
  WORKDIR /app
  COPY package.json package-lock.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM node:22-bookworm-slim AS runtime
  WORKDIR /app
  ENV NODE_ENV=production PORT=8787
  COPY --from=build /app/.next/standalone ./
  COPY --from=build /app/.next/static ./.next/static
  COPY --from=build /app/public ./public
  COPY drizzle ./drizzle
  EXPOSE 8787
  VOLUME ["/data"]
  CMD ["node", "server.js"]
  ```
  (Přesná podoba se doladí — `better-sqlite3` je nativní modul, ověřit že se v `node:22-bookworm-slim` sestaví bez extra build-essential balíčků, případně přidat `python3 make g++`.)

- **`docker-entrypoint.sh`** — smazat, nahradit migrací spuštěnou přímo z aplikace (viz výše) nebo jednoduchým shell wrapperem `migrate && node server.js`.

- **`compose.yaml`** — zjednodušit healthcheck/env (odpadá `WRANGLER_WRITE_LOGS`), port a volume `/data` zůstávají.

- **`.openai/hosting.json`** — ponechat nebo smazat dle uvážení; s odstraněním `@openai/sites-vite-plugin` přestává mít efekt, ale `modelContext.registerTool` volání v `fve-dashboard.tsx` je nezávislé feature-detection a funguje i bez něj.

- **`README.md`, `DOCKER.md`** — aktualizovat příkazy a popis architektury po migraci.

## Migrace existujících dat

Aktuální produkční data na NASu (Docker volume `fve-portal-data`) jsou uložená
jako pravý SQLite soubor Miniflare D1 emulace:
```
/data/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite
```
Ověřeno na běžícím nasazení (`docker run --rm -v fve-portal-data:/data alpine find /data -type f`).
Protože jde o obyčejný SQLite soubor (žádný proprietární formát), stačí ho
při nasazení nové verze zkopírovat na cestu, kterou čeká nový `better-sqlite3`
adaptér (`/data/fve.db`), a spustit `drizzle migrate` pro doplnění případných
nových sloupců. Zatím jsou v databázi jen seedovaná data z Excelu (žádné
ruční záznamy přes formulář), takže riziko ztráty dat je nízké i bez ruční
migrace — pro jistotu ale doporučuji soubor před cutoverem zazálohovat.

## Pořadí kroků

1. `package.json` (deps + scripts) → `next.config.ts` → smazat `vite.config.ts`, `wrangler.docker.jsonc`.
2. `db/index.ts`, `drizzle.config.ts`, nový `db/migrate.ts`.
3. `Dockerfile`, `docker-entrypoint.sh` (smazat/zjednodušit), `compose.yaml`.
4. `README.md`, `DOCKER.md`.
5. Lokální ověření: `docker compose up --build`, zkontrolovat `/api/data` a dashboard v prohlížeči, ověřit že `db:generate` pořád funguje.
6. Zkopírovat/namapovat existující SQLite soubor z NAS volume (viz výše) nebo přijmout čerstvý seed re-import.
7. Nasazení na Synology stejným flow jako dosud (tar přes SSH + `docker compose up --build -d`, viz `DOCKER.md` a skill `synology-nas`).
