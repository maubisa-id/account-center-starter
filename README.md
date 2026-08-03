<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/maubisa-logo-white.png">
  <img alt="Maubisa" src="./.github/assets/maubisa-logo.png" height="52">
</picture>

# Account Center Starter

**Satu halaman akun untuk semua produk Anda — lengkap dengan halaman pembayaran sendiri.**

Kode sumber terbuka untuk jadi **pusat akun** semua produk Anda: satu login untuk semua layanan,
kelola langganan dan hak akses, plus sistem pembayaran (Midtrans) yang tampilannya bisa diatur
sesuai merek Anda dan dipakai ulang di web, aplikasi, maupun kelas.

<p>
  <a href="https://demo-akun.maubisa.id"><img alt="Demo langsung" src="https://img.shields.io/badge/Demo%20langsung-demo--akun.maubisa.id-0a48b7?logo=vercel&logoColor=white"></a>
  <a href="https://github.com/maubisa-id/account-center-starter/generate"><img alt="Gunakan template ini" src="https://img.shields.io/badge/Gunakan%20template%20ini-2ea44f?logo=github&logoColor=white"></a>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/maubisa-id/account-center-starter&env=DB_PROVIDER,DATABASE_URL,BETTER_AUTH_SECRET,TURNSTILE_SECRET_KEY&envDescription=Provider%20%2B%20koneksi%20database%2C%20rahasia%20Better%20Auth%2C%20dan%20kunci%20Turnstile%20anti-bot%20%28wajib%20di%20produksi%29&envLink=https://github.com/maubisa-id/account-center-starter/blob/main/.env.example&project-name=account-center&repository-name=account-center-starter"><img alt="Deploy with Vercel" src="https://vercel.com/button"></a>
</p>

<!-- Badge LIVE: nilainya diambil otomatis oleh shields.io dari GitHub (mirip skor
     "compatibility" Dependabot) — status CI, rilis terbaru, lisensi, dan commit terakhir
     ikut ter-update sendiri. Hanya bekerja pada repositori publik. -->
<p>
  <a href="https://github.com/maubisa-id/account-center-starter/actions/workflows/ci.yml"><img alt="Status CI" src="https://github.com/maubisa-id/account-center-starter/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/maubisa-id/account-center-starter/releases/latest"><img alt="Rilis terbaru" src="https://img.shields.io/github/v/release/maubisa-id/account-center-starter?color=3FB950&label=rilis"></a>
  <a href="./LICENSE"><img alt="Lisensi" src="https://img.shields.io/github/license/maubisa-id/account-center-starter?color=3FB950"></a>
  <a href="https://github.com/maubisa-id/account-center-starter/commits/main"><img alt="Commit terakhir" src="https://img.shields.io/github/last-commit/maubisa-id/account-center-starter"></a>
</p>

<p>
  <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white"></a>
  <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white"></a>
  <a href="https://www.prisma.io/"><img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white"></a>
</p>
<p>
  <a href="https://www.better-auth.com/"><img alt="Better Auth" src="https://img.shields.io/badge/Better%20Auth-1.6-000000"></a>
  <a href="https://docs.midtrans.com/"><img alt="Midtrans" src="https://img.shields.io/badge/Midtrans-Core%20API-0B7BE9"></a>
</p>

<br/>

<img src="./.github/assets/og.png" alt="Account Center Starter — account center + checkout custom Midtrans Core API" width="840">

</div>

---

> [!TIP]
> **Coba dulu sebelum pakai → [demo-akun.maubisa.id](https://demo-akun.maubisa.id)**
> Masuk sebagai **user** `budi@example.com` atau **admin** `admin@example.com` (sandi `password123` untuk keduanya), atau daftar akun baru lalu cek email yang
> masuk (kode OTP, email selamat datang) langsung di **[kotak email demo](https://demo-akun.maubisa.id/demo/kotak)**.
> Semua pembayaran memakai mode sandbox, jadi aman dicoba tanpa uang asli.

## Kenapa ini ada

Membuat halaman akun yang lengkap itu ribet dan makan waktu: login, keamanan dua langkah,
kelola langganan, tagihan, dan — yang paling sulit — **sistem pembayaran yang benar-benar
anti-salah**. Kode ini sudah kami pakai sungguhan di `akun.maubisa.id`, lalu kami buka agar
Anda tidak perlu mulai dari nol.

Cocok bila Anda butuh: halaman akun untuk pelanggan, dashboard langganan, atau halaman
pembayaran sendiri (Kartu, QRIS, Virtual Account, e-wallet) yang tampilannya **seragam di
semua produk**.

> [!NOTE]
> Halaman pembayaran dibuat sendiri memakai **Midtrans Core API** (bukan halaman standar
> "Snap" bawaan Midtrans) — jadi tampilan bayarnya benar-benar menyatu dengan merek Anda.
> Metode: QRIS, GoPay, ShopeePay, Virtual Account (BCA/BNI/BRI/Permata/CIMB), Mandiri Bill,
> dan Kartu Kredit/Debit dengan verifikasi OTP (3D Secure). Ada juga **link pembayaran** dan
> **langganan otomatis**.

## Fitur

- **Login & keamanan akun** — daftar/masuk, verifikasi email lewat kode OTP, lupa kata sandi,
  keamanan dua langkah (2FA), lihat & keluarkan perangkat yang sedang login, ganti kata sandi.
  Dilengkapi pelindung anti-bot (Cloudflare Turnstile).
- **Halaman pembayaran sendiri** — tampilan bayar yang menyatu dengan merek Anda, untuk pengguna
  yang sudah login maupun tamu. QR/nomor Virtual Account tampil langsung di halaman, status
  dicek otomatis, verifikasi kartu (3D Secure) tanpa pindah halaman, simpan kartu untuk sekali
  klik, dan deteksi bank dari nomor kartu.
- **Langganan** — lihat status & masa aktif, berhenti di akhir periode (bisa dibatalkan), ganti
  paket, dan perpanjang otomatis (kartu) atau manual (QRIS/VA).
- **Hak akses** — satu login untuk semua layanan (SSO), plus rincian apa saja yang bisa diakses.
- **Email otomatis** — kode OTP, ucapan selamat datang, info akses setelah bayar, pengingat
  menunggu pembayaran, struk, dan pemberitahuan bila pembayaran gagal (tanpa email dobel).
- **Beli tanpa daftar dulu** — orang bisa langsung bayar; akunnya dibuat otomatis setelah lunas,
  lalu dikirim tautan untuk mengatur kata sandi sendiri.
- **Privasi (UU PDP)** — pengguna bisa mengunduh datanya (JSON) & menghapus akun.
- **Buat akun dari sistem lain** — jalur aman agar website/aplikasi lain bisa membuatkan akun
  setelah pembelian.

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

Aturan utamanya: produk lain cukup mengirim kode barang (`?event=<id>`) — **tidak pernah
mengirim harga**. Harga selalu dihitung di server ini, lalu pembayaran diproses, dan akses baru
diberikan setelah pembayaran benar-benar lunas.

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

Cara memakai kode ini — pilih salah satu:

- **Tombol "Use this template"** (paling gampang) — bikin repo baru milik Anda dengan riwayat
  bersih: [buka di sini](https://github.com/maubisa-id/account-center-starter/generate).
- **Salin langsung jadi folder baru** (tanpa membawa riwayat git):
  ```bash
  npx degit maubisa-id/account-center-starter nama-proyek-anda
  cd nama-proyek-anda
  ```
- **Salin lewat tombol "Fork" di GitHub** bila ingin tetap terhubung ke sumbernya, supaya
  gampang menarik pembaruan nanti.

Lalu jalankan:

```bash
npm install
cp .env.example .env          # minimal isi BETTER_AUTH_SECRET (openssl rand -base64 32)
npx prisma db push            # buat dev.db + tabel dari prisma/schema.prisma
npm run seed                  # data contoh + akun demo
npm run dev                   # http://localhost:3000
```

**Akun demo:** user `budi@example.com` (punya langganan, tagihan, hak akses contoh) atau admin `admin@example.com` (login → mendarat di `/admin`) — sandi `password123`.

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
> **Harga selalu ditentukan di server, bukan dari halaman/browser.** Nilai bayar tidak pernah
> diambil dari sisi pengguna, jadi tidak bisa diakali. Akses baru terbuka setelah Midtrans
> mengabari bahwa pembayaran benar-benar lunas — dan pesan itu dicek keasliannya lebih dulu.

## Buat jadi milik Anda

Kode ini kami rilis dengan merek Maubisa sebagai contoh nyata, tapi memang dibuat untuk Anda
pakai ulang. Untuk menjadikannya milik Anda sendiri:

1. **Ganti merek** — logo di [`.github/assets/`](./.github/assets), warna `brand-*` di
   `src/app/globals.css`, dan nama produk di `README.md`. Kartu social preview: ubah `CARDS`
   di [`scripts/make-og.mjs`](./scripts/make-og.mjs) lalu jalankan `npm run og`.
2. **Sesuaikan sinyal kepercayaan** — badan hukum, nomor WhatsApp, dan testimoni di
   `src/components/pay/checkout-trust.tsx` serta `src/lib/testimonials.ts`.
3. **Atur katalog & harga** — produk di `prisma/seed.ts` (dev) / DB (prod) dan metadata di
   `src/lib/catalog.ts`. Harga tetap dihitung di server, bukan dari halaman.
4. **Isi kunci Midtrans Anda** — dari [dashboard Midtrans](https://dashboard.midtrans.com/)
   (Sandbox untuk uji, Production untuk rilis) ke `.env`.
5. **Deploy** — cara tercepat: tombol **Deploy with Vercel** di atas (bawa DB terkelola sendiri,
   mis. [Neon](https://neon.tech)/[Supabase](https://supabase.com); `vercel.json` sudah mengatur
   `prisma db push` + `next build` otomatis). Setelah rilis pertama, set `BETTER_AUTH_URL` ke domain
   final Anda lalu redeploy. Untuk MySQL/PostgreSQL manual atau Docker: lihat
   [docs/produksi-mysql.md](./docs/produksi-mysql.md); `Dockerfile` tersedia di root.

> [!TIP]
> [`PRODUCT.md`](./PRODUCT.md) dan [`DESIGN.md`](./DESIGN.md) berisi konteks produk & sistem
> desain Maubisa sebagai **contoh** — ganti dengan milik Anda agar keputusan UI tetap konsisten.

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

Bagian pembayaran dibuat ekstra hati-hati: setiap pemberitahuan dari Midtrans dicek keasliannya
dulu, proses yang sama tidak akan dihitung dua kali, status pembayaran tidak bisa mundur, dan
nominalnya selalu dicocokkan dengan tagihan. Nomor kartu dan CVV **tidak pernah** kami simpan —
pemrosesan kartu sepenuhnya ditangani Midtrans. Detail teknis & cara melapor: [SECURITY.md](./SECURITY.md).

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [PANDUAN-DEMO.md](./PANDUAN-DEMO.md) | Cara memasang demo online (database, Sandbox, reset) |
| [PRODUCT.md](./PRODUCT.md) | Konteks produk & audiens |
| [DESIGN.md](./DESIGN.md) | Sistem desain & keputusan visual |
| [SECURITY.md](./SECURITY.md) | Kebijakan keamanan + checklist produksi |
| [SENTRY-RUNBOOK.md](./SENTRY-RUNBOOK.md) | Runbook monitoring error |
| [docs/produksi-mysql.md](./docs/produksi-mysql.md) | Deploy ke MySQL/PostgreSQL |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Cara berkontribusi & standar kode |
| [CHANGELOG.md](./CHANGELOG.md) | Riwayat perubahan |

## Lisensi

[MIT](./LICENSE) © 2026 PT Litera Edu Solusi (Maubisa). Singkatnya: **bebas dipakai, diubah,
dan disebarkan — termasuk untuk usaha komersial**. Cukup sertakan salinan teks lisensinya. Logo
& nama "Maubisa" tetap milik PT Litera Edu Solusi; ganti dengan merek Anda sendiri saat memakai.

---

<div align="center">
<sub>Dibuat oleh <a href="https://maubisa.id">Maubisa</a> · Menggerakkan <a href="https://akun.maubisa.id">akun.maubisa.id</a></sub>
</div>
