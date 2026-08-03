# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.
Format mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini memakai [Semantic Versioning](https://semver.org/lang/id/).

## [0.1.0] - 2026-08-01

Rilis publik pertama - account center + checkout custom Midtrans Core API yang
menggerakkan `akun.maubisa.id`, dirilis sebagai starter siap fork.

### Ditambahkan
- **Autentikasi (Better Auth)** - email+password, verifikasi email OTP, lupa kata
  sandi via OTP, 2FA (TOTP) + kode cadangan, daftar & pencabutan sesi, ubah kata
  sandi. Anti-bot Cloudflare Turnstile (fail-closed di produksi).
- **Checkout Midtrans Core API (UI custom, bukan Snap)** - QRIS, GoPay, ShopeePay,
  Virtual Account (BCA/BNI/BRI/Permata/CIMB), Mandiri Bill, dan Kartu 3D Secure.
  Instruksi bayar in-page + polling status, verifikasi 3DS in-page, deteksi bank
  dari BIN, dan simpan kartu (One Click).
- **Payment Link & Subscription API** - tautan bayar dan langganan berulang
  (recurring kartu) atau manual (QRIS/VA), termasuk ganti paket & batal-di-akhir-periode.
- **Guest checkout (deferred registration)** - beli tanpa akun; akun, invoice, dan
  entitlement dibuat oleh webhook terverifikasi saat pembayaran lunas.
- **Akses & entitlement** - peluncur layanan (SSO) + rincian hak akses per produk.
- **Email lifecycle** - OTP, selamat datang, akses pasca-beli, menunggu bayar,
  struk, dan pembayaran gagal (anti-dobel, ter-wire ke pemicunya).
- **Privasi (UU PDP)** - unduh data (JSON) & hapus akun (soft-delete + cabut akses).
- **Provisioning** - endpoint ber-shared-secret agar sistem lain membuat akun
  pasca-pembelian.
- **Perangkat uji Vitest** - 52 unit test untuk fungsi kritis (signature, order_id,
  pemetaan status, safe-redirect, guest order) + CI (typecheck/lint/test/build).

### Keamanan
- Verifikasi signature webhook (SHA512) **sebelum** mutasi database, dibandingkan
  konstan-waktu; idempotensi berbasis `event_id`; transisi status monotonik;
  cross-check nominal terhadap invoice.
- Harga **server-authoritative** (tak pernah dari klien); akses hanya via webhook.
- Header keamanan (CSP `frame-ancestors`, HSTS, X-Frame-Options, nosniff),
  rate-limit tahan XFF-spoof (`cf-connecting-ip`), rahasia dibandingkan
  konstan-waktu, dan `order_id` tak-tertebak (entropi kriptografis).
- Tidak menyimpan PAN/CVV (lingkup SAQ-A); guard IDOR & open-redirect.
- `npm audit` bersih (overrides `postcss`/`sharp` ke versi tertambal).

### Basis data
- Skema Prisma selaras untuk SQLite (dev) dan MySQL/PostgreSQL (prod), dengan
  guard idempotensi entitlement yang tahan-NULL.

[0.1.0]: https://github.com/maubisa-id/account-center-starter/releases/tag/v0.1.0
