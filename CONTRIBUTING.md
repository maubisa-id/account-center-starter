# Berkontribusi ke Maubisa Pusat Akun

Terima kasih sudah berkontribusi. Dokumen ini menjelaskan cara menyiapkan lingkungan,
standar kode, dan alur pull request agar perubahan mudah ditinjau dan aman untuk sistem
pembayaran.

> [!IMPORTANT]
> Ini adalah layanan pembayaran. Setiap perubahan pada alur uang, webhook, atau skema
> database wajib diverifikasi ekstra (lihat [Checklist pembayaran](#checklist-pembayaran)).

## Daftar isi

- [Menyiapkan lingkungan](#menyiapkan-lingkungan)
  - [Prasyarat](#prasyarat)
  - [Langkah cepat](#langkah-cepat)
  - [Variabel lingkungan minimal](#variabel-lingkungan-minimal)
  - [Akun demo (hasil seed)](#akun-demo-hasil-seed)
- [Orientasi struktur proyek](#orientasi-struktur-proyek)
- [Menjalankan tes](#menjalankan-tes)
- [Gerbang kualitas (wajib hijau)](#gerbang-kualitas-wajib-hijau)
- [Alur kerja](#alur-kerja)
  - [Branch](#branch)
  - [Conventional Commits](#conventional-commits)
- [Standar kode](#standar-kode)
- [Checklist pembayaran](#checklist-pembayaran)
- [Smoke test webhook (tanpa tunnel)](#smoke-test-webhook-tanpa-tunnel)
- [Menambah metode pembayaran baru](#menambah-metode-pembayaran-baru)
- [Menambah produk baru](#menambah-produk-baru)
- [Ke mana mencari bantuan](#ke-mana-mencari-bantuan)
- [Melaporkan kerentanan keamanan](#melaporkan-kerentanan-keamanan)

## Menyiapkan lingkungan

### Prasyarat

- **Node.js 22** — versinya dikunci di [`.nvmrc`](./.nvmrc). Pakai `nvm use` supaya
  konsisten dengan CI. Versi lain bisa jalan tapi tidak didukung.
- **npm** (ikut Node) — proyek memakai `package-lock.json`, jadi gunakan `npm ci`/`npm install`,
  bukan yarn/pnpm.
- **Git**. Tidak butuh Docker/MySQL untuk dev — SQLite dipakai secara default.

### Langkah cepat

```bash
nvm use                        # pakai Node 22 (.nvmrc)
npm install                    # pasang dependency
cp .env.example .env           # minimal isi BETTER_AUTH_SECRET (openssl rand -base64 32)
npx prisma db push             # buat dev.db + seluruh tabel dari schema.prisma
npm run seed                   # data contoh + akun demo (prisma/seed.ts)
npm run dev                    # http://localhost:3000
```

> [!TIP]
> `npx prisma db push` cocok untuk dev cepat (SQLite). Di produksi (MySQL) gunakan migrasi
> berversi — lihat [`docs/produksi-mysql.md`](./docs/produksi-mysql.md).

### Variabel lingkungan minimal

Untuk dev lokal, hampir semua kunci boleh kosong — aplikasi dirancang agar tetap jalan
(fitur berbayar/eksternal menampilkan status "belum tersedia" alih-alih error). Yang benar-benar
perlu diisi:

| Variabel | Wajib? | Catatan |
|----------|:------:|---------|
| `DATABASE_URL` | ✅ | Default `file:./dev.db` (SQLite). Sudah ada di `.env.example`. |
| `DB_PROVIDER` | ✅ | `sqlite` di dev. Harus konsisten dengan `datasource.provider` + `DATABASE_URL` (guard `src/lib/db-config.ts` fail-fast bila drift). |
| `BETTER_AUTH_SECRET` | ✅ | String acak: `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | ✅ | `http://localhost:3000` untuk dev. |
| `MIDTRANS_SERVER_KEY` | untuk uji bayar | Kosong → checkout tampil "belum tersedia". Diperlukan untuk `npm run test:webhook`. |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | untuk Kartu | Hanya perlu untuk metode Kartu (tokenisasi 3DS di browser). QRIS/VA/e-wallet tidak. |
| `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | opsional (dev) | Kosong → captcha fail-open di dev. **Wajib di produksi** (boot gagal tanpa kunci). Cloudflare menyediakan kunci uji "always pass". |
| `MAIL_*` | opsional | Kosong → OTP/tautan dicetak ke konsol (hanya non-produksi). |
| `NEXT_PUBLIC_SENTRY_DSN` | opsional | Sentry hanya aktif di produksi + DSN terisi. Dev mati total. |

Semua variabel didokumentasikan di [`.env.example`](./.env.example) — baca komentarnya,
karena berisi konteks operasional (URL webhook Midtrans, tunnel, dsb).

### Akun demo (hasil seed)

`npm run seed` mengisi produk contoh + akun demo. Akun yang dipakai smoke test webhook:

- **budi@example.com** — dipakai oleh `scripts/test-webhook.mjs` (lihat di bawah).

## Orientasi struktur proyek

```text
maubisa-account-center/
├─ prisma/
│  ├─ schema.prisma         # sumber kebenaran skema DB (SQLite dev / MySQL prod)
│  └─ seed.ts               # data contoh + akun demo (npm run seed)
├─ scripts/
│  └─ test-webhook.mjs      # smoke test webhook end-to-end (npm run test:webhook)
├─ src/
│  ├─ app/                  # Next.js App Router (runtime nodejs)
│  │  ├─ (app)/             # halaman ber-sesi (dashboard, profil, langganan, dst)
│  │  ├─ api/
│  │  │  ├─ pay/            # charge/cancel/status/link/resend/bin (Core API)
│  │  │  ├─ webhook/midtrans/route.ts  # SATU handler notifikasi (verify → mutate)
│  │  │  ├─ provision/      # hand-off dari web utama (shared secret)
│  │  │  ├─ account/        # export/hapus data (UU PDP)
│  │  │  └─ auth/           # Better Auth
│  │  ├─ checkout/ beli/ bayar/  # alur pembayaran (login vs tamu)
│  │  └─ masuk/ daftar/ 2fa/ ... # auth
│  ├─ lib/
│  │  ├─ midtrans/          # signature, charge, methods, status, subscription, dll
│  │  ├─ checkout.ts        # resolver harga OTORITATIF (server)
│  │  ├─ prisma.ts          # singleton Prisma client
│  │  ├─ db-config.ts       # guard provider fail-fast
│  │  ├─ rate-limit.ts      # limiter in-memory per-instance (clientIp)
│  │  ├─ secure-compare.ts  # bandingkan rahasia konstan-waktu
│  │  ├─ safe-redirect.ts   # guard open-redirect
│  │  ├─ order-id.ts        # order_id tak-bisa-ditebak
│  │  └─ sentry-scrub.ts    # PII scrubbing + tag feature untuk Sentry
│  └─ components/           # UI (ikuti DESIGN.md)
├─ test/
│  ├─ unit/                 # Vitest: signature, order-id, safe-redirect, status, guest-order
│  └─ integration/
├─ next.config.ts           # security headers + Sentry (errors-only)
└─ vitest.config.ts         # harness tes (env: MIDTRANS_SERVER_KEY, TZ Asia/Jakarta)
```

> [!NOTE]
> Prinsip inti: **uang otoritatif di server**. Harga selalu di-resolve ulang lewat
> `src/lib/checkout.ts`; akses/entitlement HANYA diaktifkan oleh webhook Midtrans terverifikasi
> di `src/app/api/webhook/midtrans/route.ts`. Checkout tidak pernah memberi akses langsung.

## Menjalankan tes

Tes memakai **Vitest** (`test/**/*.test.ts`). Env uji diterapkan otomatis oleh
`vitest.config.ts` (`MIDTRANS_SERVER_KEY=TEST-SERVER-KEY`, `TZ=Asia/Jakarta`) — penting karena
`src/lib/midtrans/config.ts` menangkap server key saat modul di-load.

```bash
npm run test          # sekali jalan (vitest run) — dipakai CI
npm run test:watch    # mode watch saat mengembangkan
npm run test:cov      # dengan laporan coverage (v8)
```

Contoh area yang tercakup unit test: verifikasi signature, pembuatan `order_id`,
guard `safeInternalPath`, pemetaan status Midtrans, dan parsing guest order.

## Gerbang kualitas (wajib hijau)

Jalankan ini sampai **hijau** sebelum push. CI menjalankan hal yang sama di setiap PR
(lihat `.github/workflows/ci.yml`).

```bash
npx tsc --noEmit     # typecheck (0 error) — TypeScript strict
npm run lint         # ESLint (0 error)
npm run test         # Vitest (semua lulus)
npm run build        # build produksi berhasil
```

| Gerbang | Perintah | Lulus bila |
|---------|----------|------------|
| Typecheck | `npx tsc --noEmit` | 0 error |
| Lint | `npm run lint` | 0 error |
| Tes | `npm run test` | semua tes hijau |
| Build | `npm run build` | build produksi sukses |

## Alur kerja

1. Buat branch dari `main`.
2. Buat perubahan kecil dan fokus. Satu PR = satu tujuan.
3. Jalankan gerbang kualitas di atas sampai **hijau** sebelum push.
4. Bila menyentuh pembayaran, kerjakan [Checklist pembayaran](#checklist-pembayaran) +
   [smoke test webhook](#smoke-test-webhook-tanpa-tunnel).
5. Buka PR memakai template; isi checklist.

### Branch

Gunakan prefiks jelas + ringkasan kebab-case:

- `feat/<ringkas>` — fitur baru
- `fix/<ringkas>` — perbaikan bug
- `docs/<ringkas>` — dokumentasi
- `refactor/<ringkas>`, `chore/<ringkas>`, `test/<ringkas>`

### Conventional Commits

Pakai [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`. Contoh:

```text
feat(pay): tambah metode e-wallet DANA lewat Core API
fix(webhook): jaga transisi paid tetap monotonik saat notif terlambat
docs(security): lengkapi kontrol keamanan webhook
```

## Checklist pembayaran

Wajib bila menyentuh `src/lib/midtrans/**`, `src/app/api/pay/**`, `src/app/api/webhook/**`,
atau `prisma/schema.prisma`:

- [ ] Signature webhook diverifikasi SEBELUM mutasi database.
- [ ] Idempotensi terjaga (event ganda tidak menggandakan akses/periode).
- [ ] Transisi status monotonik (paid/refunded terminal; late pending/cancel tidak menimpa).
- [ ] Nominal di-cross-check terhadap invoice sebelum aktivasi.
- [ ] Rahasia (server key, saved_token) tidak bocor ke klien/log.
- [ ] Diuji di Midtrans Sandbox (charge + webhook) bila relevan.
- [ ] Perubahan skema diselaraskan dengan `directus-maubisa/docs/arsitektur/maubisa-core-schema.sql`.

## Smoke test webhook (tanpa tunnel)

`scripts/test-webhook.mjs` memverifikasi jalur uang end-to-end **tanpa perlu tunnel publik**:
membuat invoice pending, mengirim notifikasi bertanda tangan ke `/api/webhook/midtrans`,
memastikan invoice jadi `paid` + entitlement aktif, mengirim ulang untuk membuktikan
idempotency, lalu memastikan signature salah ditolak `403`. Data uji dibersihkan di akhir.

**Prasyarat:** server dev hidup, `MIDTRANS_SERVER_KEY` terisi di `.env`, dan seed sudah jalan
(butuh akun `budi@example.com`).

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:webhook        # = node --env-file=.env scripts/test-webhook.mjs
```

Output "LULUS ✅" berarti: `invoice.status=paid`, tepat 1 entitlement (tetap 1 setelah retry),
dan signature salah → `HTTP 403`.

> [!NOTE]
> Base URL bisa dioverride: `TEST_BASE_URL=https://<tunnel>/ npm run test:webhook`.
> Signature dihitung sama persis dengan produksi: `SHA512(order_id + status_code + gross_amount + ServerKey)`.

## Menambah metode pembayaran baru

Metode pembayaran dikelola sebagai **satu registry data** + pemetaan Core API. Langkah tipikal:

1. **Daftarkan metode** di `src/lib/midtrans/methods.ts` (`PAY_METHODS`): `id`, `label`,
   `category` (`ewallet`/`va`/`card`), `desc`, dan `group`. Registry ini dipakai bersama oleh
   server dan UI (label/deskripsi kartu pilihan).
2. **Petakan ke body charge** di `src/lib/midtrans/charge.ts` (`buildChargeBody`): tambahkan
   `case` yang mengembalikan `payment_type` + objek metode Core API yang benar (mis. `qris`,
   `gopay`, `bank_transfer: { bank }`, `echannel`, `credit_card`). Sesuaikan `expiryMinutes`
   bila perlu (QR/e-wallet 60 menit; VA 24 jam).
3. **Tampilkan instruksi bayar** di `toDisplay` (`charge.ts`) — cara menampilkan VA number /
   QR / bill key hasil respons Midtrans.
4. **Tidak ada perubahan webhook** yang diperlukan: notifikasi semua metode masuk lewat satu
   handler dan diverifikasi dengan signature yang sama.
5. Uji di Midtrans Sandbox (charge) + jalankan smoke test webhook.

## Menambah produk baru

Harga bersifat **otoritatif dari server** (`maubisa_core.products` via `src/lib/products.ts`);
metadata presentasi ada di katalog.

1. **Tambah baris produk** ke DB: lewat `prisma/seed.ts` (dev) atau `INSERT` sesuai DDL kanonik
   `maubisa-core-schema.sql` (produksi). Kolom kunci: `code` (unik), `price` (`Decimal`),
   `scope` (`app`/`kelas`/`thesis`/`book`), `active`.
2. **Tambah metadata presentasi** di `src/lib/catalog.ts` (`CATALOG`): `key`, `name`, `blurb`,
   `scope`, `status`, `cta`, dan `productCode` yang menautkan ke `products.code`. Harga tampil
   tetap diambil dari DB (`priceIdr`/`products`), bukan di-hardcode di UI.
3. Pastikan `scope`/`itemType` konsisten dengan enum di skema (lihat `docs/produksi-mysql.md`).
4. Jangan pernah mengirim harga dari klien — checkout selalu me-resolve ulang lewat
   `src/lib/checkout.ts`.

## Ke mana mencari bantuan

- **Desain/UI** → [`DESIGN.md`](./DESIGN.md) (token, komponen, pola trust/uang).
- **Produk & audiens** → `PRODUCT.md`.
- **Produksi MySQL** → [`docs/produksi-mysql.md`](./docs/produksi-mysql.md).
- **Keamanan** → [`SECURITY.md`](./SECURITY.md).
- **Error di produksi (Sentry)** → [`SENTRY-RUNBOOK.md`](./SENTRY-RUNBOOK.md).

## Melaporkan kerentanan keamanan

Jangan buka issue publik untuk kerentanan. Ikuti [SECURITY.md](./SECURITY.md).
