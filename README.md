<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/maubisa-logo-white.png">
  <img alt="Maubisa" src="./.github/assets/maubisa-logo.png" height="52">
</picture>

# Account Center Starter

**Account center self-service + checkout custom Midtrans Core API — siap pakai, siap fork.**

Kode sumber terbuka yang menggerakkan **[`akun.maubisa.id`](https://akun.maubisa.id)**: satu akun
untuk mengelola langganan, akses, pembayaran, dan keamanan; sekaligus **satu mesin checkout**
Midtrans Core API (UI custom, bukan Snap) yang bisa dipakai ulang di web, aplikasi, dan kelas.

<p>
  <a href="https://github.com/maubisa-id/account-center-starter/generate"><img alt="Gunakan template ini" src="https://img.shields.io/badge/Gunakan%20template%20ini-2ea44f?style=for-the-badge&logo=github&logoColor=white"></a>
</p>

<!-- Badge LIVE: nilainya diambil otomatis oleh shields.io dari GitHub (mirip skor
     "compatibility" Dependabot) — status CI, rilis terbaru, lisensi, dan commit terakhir
     ikut ter-update sendiri. Hanya bekerja pada repositori publik. -->
<p>
  <a href="https://github.com/maubisa-id/account-center-starter/actions/workflows/ci.yml"><img alt="Status CI" src="https://img.shields.io/github/actions/workflow/status/maubisa-id/account-center-starter/ci.yml?branch=main&style=for-the-badge&label=CI&logo=githubactions&logoColor=white"></a>
  <a href="https://github.com/maubisa-id/account-center-starter/releases/latest"><img alt="Rilis terbaru" src="https://img.shields.io/github/v/release/maubisa-id/account-center-starter?style=for-the-badge&color=3FB950&label=rilis"></a>
  <a href="./LICENSE"><img alt="Lisensi" src="https://img.shields.io/github/license/maubisa-id/account-center-starter?style=for-the-badge&color=3FB950"></a>
  <a href="https://github.com/maubisa-id/account-center-starter/commits/main"><img alt="Commit terakhir" src="https://img.shields.io/github/last-commit/maubisa-id/account-center-starter?style=for-the-badge"></a>
</p>

<p>
  <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white"></a>
  <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white"></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white"></a>
  <a href="https://www.prisma.io/"><img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white"></a>
</p>
<p>
  <a href="https://www.better-auth.com/"><img alt="Better Auth" src="https://img.shields.io/badge/Better%20Auth-1.6-000000?style=for-the-badge"></a>
  <a href="https://docs.midtrans.com/"><img alt="Midtrans" src="https://img.shields.io/badge/Midtrans-Core%20API-0B7BE9?style=for-the-badge"></a>
</p>

</div>

---

## Kenapa ini ada

Membangun **account center** yang benar itu berulang dan rawan: autentikasi, 2FA, sesi,
langganan, entitlement, invoice, dan — yang paling sulit — **integrasi pembayaran yang tahan
banting**. Repo ini adalah versi produksi yang sudah kami pakai di `akun.maubisa.id`, dirilis
sebagai **starter** agar Anda tidak perlu mulai dari nol.

Cocok bila Anda butuh: portal pelanggan, dashboard langganan SaaS, atau checkout Midtrans Core
API custom (Kartu 3DS, QRIS, Virtual Account, e-wallet) yang **konsisten di semua produk**.

> [!NOTE]
> Antarmuka pembayaran memakai **Midtrans Core API** (UI custom), bukan Snap — sehingga tampilan
> bayar sepenuhnya menyatu dengan merek Anda. Metode: QRIS, GoPay, ShopeePay, Virtual Account
> (BCA/BNI/BRI/Permata/CIMB), Mandiri Bill, dan Kartu Kredit/Debit 3D Secure. Ditambah
> **Payment Link** & **Subscription API**.

## Fitur

- **Autentikasi** — masuk/daftar, verifikasi email OTP, lupa kata sandi (OTP), 2FA (TOTP),
  daftar sesi aktif + cabut, ubah kata sandi. Anti-bot Cloudflare Turnstile.
- **Checkout Core API** — UI custom untuk login **dan tamu** (`/beli`), instruksi bayar
  in-page (QR/VA/tagihan) + polling status, verifikasi 3DS in-page (iframe), simpan kartu
  (One Click), dan deteksi bank penerbit dari BIN.
- **Langganan** — status/periode, batal (di akhir periode) + urungkan, ganti paket,
  perpanjangan otomatis (recurring kartu) atau manual (QRIS/VA).
- **Akses & entitlement** — peluncur layanan (SSO) + rincian hak akses per produk.
- **Email lifecycle** — OTP, selamat datang, akses pasca-beli, menunggu bayar, struk, dan
  pembayaran gagal (ter-wire ke pemicunya, anti-dobel).
- **Akun tamu (deferred registration)** — beli tanpa akun; akun dibuat diam-diam oleh webhook
  saat lunas, dengan tautan atur kata sandi via email.
- **Privasi (UU PDP)** — unduh data (JSON) & hapus akun.
- **Provisioning** — endpoint untuk sistem lain membuat akun pasca-pembelian.

## Arsitektur

```
Web · App · Kelas ──"Beli"──►  Account Center  ──charge──►  Midtrans Core API
   (kirim ?event=<id>,          (resolve harga,             (QRIS/VA/e-wallet/
    tanpa harga)                 checkout custom)            kartu 3DS)
                                       ▲                          │
                                       │     webhook (signature + │
                                       └──────  idempotent) ──────┘
                                  aktifkan akses / entitlement / langganan
```

Aturan emas: produk lain cukup mengirim konteks (`?event=<id>`) — **tidak pernah harga**.
Account center yang meresolusi harga otoritatif, memproses pembayaran, dan mengaktifkan akses.

## Tech stack

| Bagian | Teknologi |
|--------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Server Components, Turbopack) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| Bahasa | [TypeScript](https://www.typescriptlang.org/) (strict) |
| ORM | [Prisma 6](https://www.prisma.io/) — SQLite (dev), MySQL/PostgreSQL (prod) |
| Auth | [Better Auth 1.6](https://www.better-auth.com/) — email+password, 2FA, OTP |
| Pembayaran | [Midtrans Core API](https://docs.midtrans.com/) + Payment Link + Subscription |
| Email | [Nodemailer](https://nodemailer.com/) (transaksional) |
| Konten acara | [Directus](https://directus.io/) (opsional, ada fallback contoh) |
| Monitoring | [Sentry](https://sentry.io/) (errors-only, hemat kuota) |

## Mulai cepat

```bash
npm install
cp .env.example .env          # minimal isi BETTER_AUTH_SECRET (openssl rand -base64 32)
npx prisma db push            # buat dev.db + tabel dari prisma/schema.prisma
npm run seed                  # data contoh + akun demo
npm run dev                   # http://localhost:3000
```

**Akun demo:** `budi@example.com` / `password123` (punya langganan, invoice, entitlement).

Butuh Node 22 (lihat [`.nvmrc`](./.nvmrc)). Tanpa kunci Midtrans pun aplikasi tetap jalan —
fitur pembayaran menampilkan status "belum tersedia" alih-alih error.

## Environment

Semua variabel terdokumentasi di [`.env.example`](./.env.example). Yang paling penting:

| Variabel | Wajib | Keterangan |
|----------|:-----:|------------|
| `DATABASE_URL` + `DB_PROVIDER` | ✓ | `file:./dev.db` (dev) atau `mysql://` / `postgresql://` (prod) |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | ✓ | rahasia acak + origin app |
| `MIDTRANS_SERVER_KEY` | bayar | server key (rahasia) |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | kartu | client key (wajib untuk Kartu/3DS) |
| `TURNSTILE_SECRET_KEY` | prod | anti-bot; **wajib di produksi** (boot gagal tanpa kunci) |
| `MAIL_*` | email | SMTP; jika kosong, email dicetak ke konsol (dev) |
| `PROVISION_SECRET` | provisioning | shared secret dari sistem pemanggil |
| `DIRECTUS_URL` / `DIRECTUS_TOKEN` | acara | sumber data acara (opsional) |

> [!IMPORTANT]
> **Uang bersifat server-authoritative.** Harga tidak pernah dipercaya dari klien/URL, selalu
> di-resolve ulang di server. Akses hanya diberikan oleh webhook Midtrans yang terverifikasi.

## Buat jadi milik Anda

Repo ini dirilis dengan merek Maubisa sebagai contoh nyata, tapi dirancang untuk di-fork. Untuk
menjadikannya milik Anda:

1. **Ganti merek** — logo di [`.github/assets/`](./.github/assets), warna `brand-*` di
   `src/app/globals.css`, dan nama produk di `README.md`.
2. **Sesuaikan sinyal kepercayaan** — badan hukum, nomor WhatsApp, dan testimoni di
   `src/components/pay/checkout-trust.tsx` serta `src/lib/testimonials.ts`.
3. **Atur katalog & harga** — produk di `prisma/seed.ts` (dev) / DB (prod) dan metadata di
   `src/lib/catalog.ts`. Harga tetap otoritatif dari server.
4. **Isi kunci Midtrans Anda** — dari [dashboard Midtrans](https://dashboard.midtrans.com/)
   (Sandbox untuk uji, Production untuk rilis) ke `.env`.
5. **Deploy** — lihat [docs/produksi-mysql.md](./docs/produksi-mysql.md) untuk MySQL/PostgreSQL.
   `Dockerfile` tersedia di root.

Panduan kontribusi & standar kode ada di [CONTRIBUTING.md](./CONTRIBUTING.md).

## Struktur proyek

```
src/
  app/
    (app)/           # area login-gated: ringkasan, profil, keamanan, langganan,
                     # metode-pembayaran, pembayaran, acara, akses, notifikasi, privasi
    beli, checkout, bayar/[orderId], terima-kasih   # alur checkout (tamu & login)
    masuk, daftar, lupa-password, reset-password, 2fa
    api/
      auth/[...all]           # Better Auth
      pay/                    # charge, charge/guest, status, cancel, bin, link, resend
      webhook/midtrans        # aktivasi akses (signature + idempotent; one-time & recurring)
      provision               # dipanggil sistem lain pasca-pembelian
      payment-methods         # kartu tersimpan (One Click)
  components/        # shell, ui, dashboard/*, pay/*, shared-assets/credit-card/*
  lib/               # auth, prisma, midtrans/* (Core API + subscription + link + bin),
                     # midtrans-card (3DS), order-id, payment-methods, recurring, email, format
prisma/              # schema.prisma, seed.ts
test/                # Vitest (unit) — signature, order-id, safe-redirect, status, guest-order
```

## Skrip

| Skrip | Fungsi |
|-------|--------|
| `npm run dev` | server pengembangan (Turbopack) |
| `npm run build` / `npm start` | build & jalankan produksi |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (unit) |
| `npm run seed` | isi data contoh + akun demo |
| `npm run test:webhook` | uji webhook Midtrans lokal (end-to-end, tanpa tunnel) |

## Keamanan

Jalur uang dirancang defensif: verifikasi signature sebelum mutasi, idempotensi webhook,
transisi status monotonik, cross-check nominal, rahasia dibandingkan konstan-waktu, rate-limit
tahan XFF-spoof, header CSP/HSTS, dan `order_id` tak-tertebak. Kami **tidak** menyimpan PAN/CVV
(lingkup SAQ-A). Detail & cara lapor: [SECURITY.md](./SECURITY.md).

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [PRODUCT.md](./PRODUCT.md) | Konteks produk & audiens |
| [DESIGN.md](./DESIGN.md) | Sistem desain & keputusan visual |
| [SECURITY.md](./SECURITY.md) | Kebijakan keamanan + checklist produksi |
| [SENTRY-RUNBOOK.md](./SENTRY-RUNBOOK.md) | Runbook monitoring error |
| [docs/produksi-mysql.md](./docs/produksi-mysql.md) | Deploy ke MySQL/PostgreSQL |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Cara berkontribusi & standar kode |
| [CHANGELOG.md](./CHANGELOG.md) | Riwayat perubahan |

## Lisensi

[MIT](./LICENSE) © 2026 PT Litera Edu Solusi (Maubisa). Bebas dipakai, dimodifikasi, dan
didistribusikan — termasuk untuk proyek komersial. Logo & merek "Maubisa" adalah milik PT Litera
Edu Solusi; ganti dengan merek Anda sendiri saat mem-fork.

---

<div align="center">
<sub>Dibuat oleh <a href="https://maubisa.id">Maubisa</a> · Menggerakkan <a href="https://akun.maubisa.id">akun.maubisa.id</a></sub>
</div>
