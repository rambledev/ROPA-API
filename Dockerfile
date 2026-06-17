# ── Stage 1: Install dependencies ───────────────────────
FROM oven/bun:1.1.38-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── Stage 2: Production ──────────────────────────────────
FROM oven/bun:1.1.38-alpine AS production
WORKDIR /app

RUN apk add --no-cache     chromium     nss     freetype     harfbuzz     ca-certificates     ttf-freefont     font-noto     font-noto-thai

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup -S ropa && adduser -S ropa -G ropa

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER ropa

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# v2 bcryptjs
CMD ["bun", "run", "src/index.ts"]
