# FVE přehled v Dockeru

## Spuštění

```sh
docker compose up --build -d
```

Aplikace bude dostupná na `http://localhost:8787`.

Jiný port lze nastavit při spuštění:

```sh
FVE_PORT=8080 docker compose up --build -d
```

## Data

Databáze je uložená v pojmenovaném Docker volume `fve-portal-data`. Při běžném restartu nebo novém sestavení kontejneru zůstává zachovaná. Při startu se automaticky aplikují nové databázové migrace.

## Správa

```sh
docker compose logs -f
docker compose restart
docker compose down
```

Příkaz `docker compose down` databázi nemaže. Smazala by se až explicitním odstraněním volume.
