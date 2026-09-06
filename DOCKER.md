# FVE přehled v Dockeru

## Spuštění

```sh
docker compose up --build -d
```

Aplikace bude dostupná na `http://localhost:8787`. Jiný port lze nastavit při
spuštění:

```sh
FVE_PORT=8080 docker compose up --build -d
```

## Data a migrace

Databáze je SQLite soubor `/data/fve.db` v pojmenovaném Docker volume
`fve-portal-data`. Startovací skript před spuštěním Next.js automaticky aplikuje
Drizzle migrace. Při běžném restartu, aktualizaci image i `docker compose down`
data zůstávají zachována.

Při přechodu z původní verze s Miniflare **nekopírujte pouze** soubor
`*.sqlite` za běhu: databáze používala WAL a potřebuje konzistentní snapshot.
Navíc její migrace nejsou evidované v Drizzle. Pokud nejsou žádné ruční odečty,
nejbezpečnější je ponechat původní volume jako rollback a nechat tuto verzi
vytvořit čisté `/data/fve.db` ze seedů. Skript schválně odmítne spustit Drizzle
migrace na staré databázi bez provedeného baseline importu.

## Správa

```sh
docker compose logs -f
docker compose restart
docker compose down
```

Volume je perzistence, nikoli záloha. Před větší aktualizací vytvořte snapshot
nebo zálohu `fve-portal-data` v Synology Container Manageru.
