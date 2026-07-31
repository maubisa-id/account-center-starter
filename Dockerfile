# Account Center Starter — image produksi untuk demo (VPS / Coolify / Docker Compose).
# Pakai node:22-slim (Debian/glibc) supaya engine Prisma default (debian-openssl-3.0.x)
# cocok tanpa perlu binaryTargets musl. openssl dibutuhkan Prisma saat runtime.
#
# Build : docker build -t account-center .
# Run   : docker run -p 3000:3000 --env-file .env account-center
# (Migrasi & seed dijalankan sekali; lihat docs/produksi-mysql.md.)

FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ── Dependencies (cache layer) ─────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Build (prisma generate + next build) ───────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Engine Prisma untuk Linux di-generate DI SINI (dev lokal Windows tak menghasilkan biner Linux).
RUN npx prisma generate
# Lewati langkah upload source map Sentry saat build image (tak ada auth token di sini).
ENV SENTRY_AUTH_TOKEN=""
RUN npm run build

# ── Runner (produksi) ──────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# node_modules PENUH dari builder -> menjamin engine Prisma (Linux) ikut terbawa.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
# next start membaca env saat runtime (DATABASE_URL, BETTER_AUTH_*, MIDTRANS_*, MAIL_*).
CMD ["npm", "run", "start"]
