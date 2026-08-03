# Panduan Demo - Account Center Starter

Panduan ini membantu memasang demo online agar orang bisa mencoba alur account center
sebelum mengambil kodenya. **Semua pembayaran memakai Sandbox, jadi uangnya tidak nyata.**

## Cara tercepat: Coolify (aplikasi + database sekaligus)

Repo ini punya `docker-compose.yml` yang **sudah membawa MySQL sendiri**. Kamu tidak perlu
menyiapkan database terpisah untuk demo awal; satu resource menjalankan aplikasi dan database.

1. Di Coolify: **New Resource → Docker Compose**, hubungkan repo ini.
2. Isi Environment Variables di UI:
  - `BETTER_AUTH_SECRET` = hasil `openssl rand -base64 32`
  - `BETTER_AUTH_URL` = `https://<domain-demo-kamu>`
  - `DB_PASSWORD` & `DB_ROOT_PASSWORD` = sandi MySQL (bebas)
  - `MIDTRANS_SERVER_KEY` + `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` = kunci **Sandbox**
  - `NEXT_PUBLIC_DEMO_MODE` = `1`
  - `SEED_ON_START` = `1` (untuk deploy pertama; isi data contoh)
3. Aktifkan **Domain + HTTPS** (Coolify otomatis). HTTPS wajib untuk webhook Midtrans.
4. Klik **Deploy**.

Tabel dibuat otomatis saat start, dan provider Prisma otomatis diset ke `mysql` saat build.
Tidak ada langkah database manual untuk jalur compose.

## Cara lain: pilih database sendiri

Kalau tidak mau MySQL bawaan compose, sediakan database sendiri lalu deploy hanya `Dockerfile`
(Coolify → **Dockerfile**, atau Vercel):

- **MySQL** (paling mirip produksi) - buat gratis/murah di PlanetScale, Railway, atau Aiven.
  Set `DATABASE_URL="mysql://user:pass@host:3306/nama_db"` dan `DB_PROVIDER=mysql`.
- **SQLite** (paling ringan, cukup untuk mencoba di satu server) - set
  `DATABASE_URL="file:/data/dev.db"`, `DB_PROVIDER=sqlite`, simpan `/data` di volume. **Jangan**
  di Vercel (penyimpanannya sementara).

Provider Prisma otomatis mengikuti `DB_PROVIDER` (lewat `scripts/db-provider.mjs`) - jadi kamu
**tidak perlu mengedit `schema.prisma`**. Siapkan skema + data sekali:

```bash
DB_PROVIDER=mysql npm run db:setup   # samakan provider + generate + buat tabel
npm run seed                         # isi produk contoh + akun demo
```

> Deploy lewat **Dockerfile** ke database **kosong** (bukan compose)? Set `DB_PUSH_ON_START=1`
> supaya tabel dibuat otomatis saat start. Jangan set ini bila database sudah punya skema.

## Nyalakan "Mode Demo"

Set `NEXT_PUBLIC_DEMO_MODE="1"` untuk menampilkan bilah kuning di atas semua halaman. Bilah ini
menjelaskan bahwa situs adalah demo dan menampilkan akun masuk langsung:
**budi@example.com / password123**.

```
NEXT_PUBLIC_DEMO_MODE="1"
```

Dengan mode demo aktif, pengunjung tidak perlu daftar via email untuk mencoba alur utama.

## Pakai kunci Midtrans Sandbox

Ambil kunci **Sandbox** di [dashboard Midtrans](https://dashboard.midtrans.com/) (bukan Production),
lalu isi `.env`:

```
MIDTRANS_SERVER_KEY="SB-Mid-server-..."
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
```

Di dashboard Midtrans → **Settings → Configuration**, isi **Payment Notification URL** =
`https://<domain-demo>/api/webhook/midtrans`. Pengunjung membayar pakai kartu uji, misalnya
`4811 1111 1111 1114`, CVV `123`, kedaluwarsa bebas di masa depan, OTP `112233`
([daftar lengkap](https://docs.midtrans.com/docs/testing-payment-on-sandbox)).

## Deploy

- **Coolify (rekomendasi):** pakai Docker Compose di atas - aplikasi + MySQL sekaligus.
- **Vercel (tercepat):** *import* repo, isi env, deploy. Domain HTTPS otomatis (dipakai webhook
  Midtrans). Gunakan MySQL terkelola (PlanetScale/Railway/Aiven), bukan SQLite.
- **VPS / Docker biasa:** ada `Dockerfile` di repo (build otomatis set provider `mysql`).

## Reset data (opsional)

Karena data demo bisa berubah oleh pengunjung, reset berkala dapat mengembalikannya ke kondisi bersih:

```bash
npx prisma db push --force-reset   # HAPUS semua lalu buat ulang - pastikan ini database demo.
npm run seed
```

Bisa dijadwalkan otomatis (cron) tiap hari. Di compose, cukup set `SEED_ON_START=1` saat perlu
mengisi ulang lalu deploy ulang.

## Catatan penting

- Gunakan **database khusus demo**, terpisah dari data asli/produksi.
- **Jangan** memakai kunci Midtrans **Production** di demo - cukup Sandbox.
- Ingin pendaftaran lewat email OTP sungguhan? Isi `MAIL_*` (SMTP). Kalau tidak, cukup pakai
  akun demo yang sudah tersedia.
