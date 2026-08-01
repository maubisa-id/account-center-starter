#!/bin/sh
# Entrypoint kontainer — dijalankan saat container start (Coolify/Docker).
# 1) (Opsional) buat/selaraskan tabel bila DB_PUSH_ON_START=1.
# 2) (Opsional) isi data contoh bila SEED_ON_START=1 (untuk DEMO).
# 3) Jalankan aplikasi.
#
# Skema sudah di-generate untuk provider yang benar saat build (lihat Dockerfile).
set -e

# PENTING (produksi): `prisma db push` DEFAULT DIMATIKAN. akun.maubisa.id memakai Cloud SQL
# BERSAMA (maubisa_core) yang skemanya dikelola terpisah (maubisa-core-schema.sql) dan dipakai
# layanan lain (web utama/Directus). Menjalankan db push di sana bisa mengubah/menghapus kolom
# tabel bersama -> RISIKO. Jadi di produksi biarkan kosong; app cukup MEMAKAI skema yang ada.
# Untuk DEMO dengan DB kosong bawaan compose, set DB_PUSH_ON_START=1 supaya tabel dibuat otomatis.
if [ "$DB_PUSH_ON_START" = "1" ]; then
  echo "[entrypoint] DB_PUSH_ON_START=1 -> menyiapkan skema (prisma db push)..."
  npx prisma db push --skip-generate --accept-data-loss
else
  echo "[entrypoint] lewati prisma db push (produksi: skema dikelola terpisah). Set DB_PUSH_ON_START=1 untuk demo."
fi

if [ "$SEED_ON_START" = "1" ]; then
  echo "[entrypoint] SEED_ON_START=1 -> mengisi data contoh (npm run seed)..."
  npm run seed || echo "[entrypoint] seed gagal (dilewati, app tetap jalan)"
fi

echo "[entrypoint] memulai aplikasi..."
exec npm run start
