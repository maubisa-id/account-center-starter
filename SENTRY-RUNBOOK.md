# Sentry Runbook — Maubisa Account Center

Panduan singkat membaca & menangani error di Sentry untuk **Pusat Akun**
(project Sentry: `javascript-nextjs`). App ini pegang **auth, pembayaran (Midtrans),
langganan, profil, dan data pribadi** — jadi error di sini sering berdampak langsung
ke uang & akses user. Tujuan dokumen: buka dashboard → langsung tahu *ini error apa*
dan *harus ngapain*.

## Cara Sentry dikonfigurasi di sini
- **Errors-only.** Tanpa Session Replay, tracing, logs, profiling → hemat kuota (free tier).
- **Hanya aktif di production DAN saat `NEXT_PUBLIC_SENTRY_DSN` terisi.** Dev/preview mati total.
- **Privasi ketat (UU PDP).** `sendDefaultPii:false`, `userInfo:false`, `httpBodies:[]`, plus `beforeSend` (`src/lib/sentry-scrub.ts`) yang **menyamarkan** email, no HP/kartu/VA/NIK, token, cookie, header, dan body sebelum event dikirim. **Jangan pernah** menonaktifkan scrubber ini.
- **Rate limit 100 event/jam** di DSN (rem loop error).

## Cara baca satu issue
Tiap error otomatis diberi tag — pakai untuk filter/search:
- **`feature`** — alur tempat error terjadi (tabel di bawah). Contoh: `feature:payment.webhook`.
- **`environment`** — `production` / `staging`.
- **release** — otomatis dari build (jika `SENTRY_AUTH_TOKEN` di CI) → tahu deploy penyebab.

## Tabel area fitur (`feature`) → arti → penanganan

| `feature` | Muncul di | Artinya & dampak | Langkah pertama |
|-----------|-----------|------------------|-----------------|
| `payment.webhook` | `/api/webhook/midtrans` | **DAMPAK TINGGI.** Notifikasi pembayaran Midtrans gagal diproses → user sudah bayar tapi akses/entitlement belum terbuka. | Cek verifikasi **signature** & `MIDTRANS_SERVER_KEY`; cek status order di DB; rekonsiliasi manual bila perlu (jangan biarkan user bayar tanpa akses). |
| `checkout` | `/checkout`, `/beli`, `/api/checkout` | Gagal membuat order / memulai Snap Midtrans. Dampak: user tidak bisa bayar. | Cek `MIDTRANS_SERVER_KEY` / `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, katalog produk, konektivitas ke Snap. |
| `provisioning` | `/api/provision` | Gagal membuat akun dari web utama (hand-off maubisa.id → Pusat Akun). | Pastikan `PROVISION_SECRET` **sama** di web & Pusat Akun; validasi payload; cek DB. |
| `auth` | `/api/auth`, `/login`, `/masuk`, `/daftar`, `/2fa` | Login/registrasi/OTP/2FA gagal. Dampak: user tidak bisa masuk. | Cek `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, pengiriman email OTP (`MAIL_*`), tabel user di DB. |
| `password` | `/lupa-password`, `/reset-password` | Reset kata sandi gagal (link/token/email). | Cek transport email (`MAIL_*`) & masa berlaku token. |
| `subscription` | `/langganan`, `/langganan/ubah` | Gagal memuat/mengubah langganan. | Cek entitlement & DB langganan. |
| `billing` | `/pembayaran`, `/metode-pembayaran`, `/invoice` | Riwayat pembayaran / invoice / metode bayar error. | Cek data order di DB & rendering invoice. |
| `account` | `/api/account` (mis. export) | Ekspor/kelola data akun (hak PDP) gagal. | Cek query DB & format ekspor. |
| `profile` | `/profil`, `/profil/edit` | Update profil gagal. | Cek validasi input & DB. |
| `access` | `/akses` | App launcher / entitlement layanan error. | Cek `NEXT_PUBLIC_*_URL` & entitlement user. |
| `security` | `/keamanan` | Pengaturan sesi/2FA/keamanan error. | Cek better-auth & DB sesi. |
| `preferences` | `/notifikasi`, `/api/preferences`, `/privasi` | Preferensi/notifikasi/privasi gagal disimpan. | Cek DB preferences. |
| `events` | `/acara` | Data acara (dari Directus) error. | Cek `DIRECTUS_URL` / `DIRECTUS_TOKEN`. |
| `app` | lainnya | Tak terkategori. | Lihat stack trace & release. |

## Prioritas triage (khusus edtech + pembayaran)
1. **`payment.webhook` & `checkout`** = prioritas #1. Uang user terlibat. Tangani sebelum yang lain.
2. **`auth` & `provisioning`** = prioritas #2. User kekunci di luar / akun gagal dibuat.
3. Sisanya normal.

## Pola error umum
- **`PrismaClientKnownRequestError`**: masalah DB (constraint, koneksi). Cek `DATABASE_URL` & migrasi.
- **`fetch failed` ke Midtrans/Directus**: backend eksternal down / kunci salah. Cek env & status layanan.
- Error ekstensi browser / `ResizeObserver` / `Non-Error promise rejection` **sudah difilter** (tidak dikirim).

## Eskalasi
1. Set **status** issue (Resolved/Ignored/Archived) agar inbox rapi.
2. Insiden pembayaran → catat order ID & rekonsiliasi; jangan tutup issue sebelum akses user beres.
3. **Seer** (root-cause + saran fix otomatis) butuh integrasi GitHub aktif → lihat bagian setup GitHub.
