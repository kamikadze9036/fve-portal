#!/bin/sh
set -eu

npx wrangler d1 migrations apply DB \
  --local \
  --config wrangler.docker.jsonc \
  --persist-to /data

exec npx wrangler dev \
  --local \
  --config wrangler.docker.jsonc \
  --ip 0.0.0.0 \
  --port "${PORT:-8787}" \
  --persist-to /data \
  --show-interactive-dev-session=false
