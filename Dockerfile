FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8787 \
    WRANGLER_WRITE_LOGS=false

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY wrangler.docker.jsonc docker-entrypoint.sh ./

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8787
VOLUME ["/data"]

ENTRYPOINT ["./docker-entrypoint.sh"]
