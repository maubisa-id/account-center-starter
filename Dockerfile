# Account Center Starter — image produksi/demo (VPS / Coolify / Docker Compose).
# Pakai node:22-slim (Debian/glibc) supaya engine Prisma default (debian-openssl-3.0.x)
# cocok tanpa perlu binaryTargets musl. openssl dibutuhkan Prisma saat runtime.
#
# Build : docker build --build-arg DB_PROVIDER=mysql -t maubisa-akun .
# Run   : docker run -p 3000:3000 --env-file .env maubisa-akun
# Coolify: deteksi Dockerfile ini otomatis; set env di UI (lihat PANDUAN-DEMO.md).
# Tabel dibuat otomatis saat start (entrypoint: prisma db push). Isi data contoh: SEED_ON_START=1.

FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ── Dependencies (cache layer) ─────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
# --include=dev WAJIB: build butuh devDeps (@tailwindcss/postcss, typescript) & runtime butuh
# prisma CLI (db push/seed). Paksa dev walau NODE_ENV=production disuntik platform (Coolify).
RUN npm ci --include=dev

# ── Build (sinkron provider + prisma generate + next build) ────────────
FROM base AS builder
# Provider database untuk image ini. Default "mysql" (target VPS/Coolify/Cloud SQL).
# Ganti ke "postgresql" bila memakai Postgres, atau "sqlite" untuk file volume.
ARG DB_PROVIDER=mysql
# NEXT_PUBLIC_* dibaca komponen KLIEN, jadi HARUS ada saat `next build` (di-inline ke bundle
# browser). Tanpa ini: widget Turnstile tak render (login putus bila server minta captcha) &
# tokenisasi kartu (client key) gagal. Nilainya publik (memang tampil di browser) → aman sbg arg.
ARG NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=""
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=$NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Samakan datasource.provider di schema.prisma dengan DB_PROVIDER, LALU generate engine Linux.
RUN node scripts/db-provider.mjs "${DB_PROVIDER}" && npx prisma generate
# Lewati langkah upload source map Sentry saat build image (tak ada auth token di sini).
ENV SENTRY_AUTH_TOKEN=""
RUN npm run build

# ── Runner (produksi) ──────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# node_modules PENUH dari builder -> menjamin engine Prisma (Linux) + CLI (db push/seed) ikut.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
# src/ + tsconfig.json diperlukan HANYA oleh seeder demo (tsx prisma/seed.ts -> import ../src/lib/auth,
# yang memakai alias @/*). `next start` memakai .next, jadi berkas ini inert untuk runtime app.
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
# Entrypoint: buat tabel (prisma db push) + opsional seed, lalu `next start`.
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
