# ── Stage 1: Dependencies ────────────────────────────────
FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app

# copy เฉพาะ package files ก่อน (cache layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ── Stage 2: Build ───────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# copy source code
COPY tsconfig.json ./
COPY src ./src

# type-check ก่อน build
RUN bun tsc --noEmit

# ── Stage 3: Production ──────────────────────────────────
FROM oven/bun:1.3.14-alpine AS production
WORKDIR /app

# security: ไม่รันด้วย root user
RUN addgroup -S ropa && adduser -S ropa -G ropa

# copy จาก stages ก่อนหน้า
COPY --from=deps     /app/node_modules ./node_modules
COPY --from=builder  /app/src          ./src
COPY package.json tsconfig.json ./

# migrations folder
COPY src/db/migrations ./src/db/migrations

USER ropa

EXPOSE 3001

# health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["bun", "run", "src/index.ts"]
