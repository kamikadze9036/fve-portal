# FVE Portal

Dashboard spotřeb domu (Zruč) — elektřina/FVE, voda, tepelné čerpadlo. Next.js
(`vinext`) aplikace s Drizzle ORM nad Cloudflare D1 (SQLite).

## Původ a self-hosting na Synology NAS

Základ appky (Next.js/vinext frontend, shadcn/ui komponenty, Drizzle schéma,
`/api/data` endpoint, dashboard) byl vygenerovaný přes **OpenAI ChatGPT Apps SDK
/ "Sites"** nástroj — proto `.openai/hosting.json`, `@openai/sites-vite-plugin`
v `package.json` a integrace `modelContext.registerTool` v
`components/fve-dashboard.tsx` (appka se umí zaregistrovat jako nástroj přímo
v ChatGPT). Původně byla appka cílená na hosting přímo přes OpenAI/Cloudflare
Workers + D1.

Pro provoz na vlastním Synology NASu (mimo Cloudflare/OpenAI infrastrukturu)
byl přidán **Docker self-hosting**:

- `Dockerfile` — multi-stage build (`npm run build` → runtime image s Node 22)
- `docker-entrypoint.sh` — při startu kontejneru aplikuje D1 migrace lokálně
  (`wrangler d1 migrations apply --local --persist-to /data`) a pak spustí
  `wrangler dev` jako lokální server na `0.0.0.0:8787`
- `compose.yaml` — jedna služba, pojmenovaný volume `fve-portal-data` pro
  perzistenci SQLite souboru mezi restarty/rebuildy, healthcheck na `/api/data`
- `DOCKER.md` — provozní návod (spuštění, správa, poznámky k datům)

Zbytek appky (schéma, API, UI, seed data) je beze změny — D1 binding se jen
lokálně emuluje přes `wrangler --persist-to`, místo skutečného Cloudflare D1.

Nasazeno na Synology DSM (Container Manager / `docker compose`), viz `DOCKER.md`.

## Vývoj

```sh
npm install
npm run dev
```

## Databáze

```sh
npm run db:generate   # vygeneruje novou Drizzle migraci po změně db/schema.ts
```
