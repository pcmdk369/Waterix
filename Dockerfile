# syntax=docker/dockerfile:1

FROM oven/bun:1-debian AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run lint && bun run build

FROM oven/bun:1-debian AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /tmp/waterix_uploads /tmp/waterix_jobs \
    && chown -R bun:bun /app /tmp/waterix_uploads /tmp/waterix_jobs

COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail --silent http://127.0.0.1:3000/api/health || exit 1

CMD ["bun", "dist/server.cjs"]
