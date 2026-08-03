# Kebijakan Keamanan - Maubisa Account Center

Dokumen ini menjelaskan cara melaporkan kerentanan dan ringkasan kontrol keamanan
yang diterapkan di Pusat Akun Maubisa (`akun.maubisa.id`).

## Melaporkan kerentanan

Jangan buat issue publik untuk laporan keamanan. Kirim laporan secara privat ke:

- **security@maubisa.id** (atau **no-reply@maubisa.id** bila belum tersedia)

Sertakan: deskripsi, langkah reproduksi, dampak, dan (bila ada) bukti konsep. Kami
berupaya membalas dalam **3 hari kerja** dan memberi perbaikan sesuai tingkat keparahan.
Mohon beri kami waktu wajar untuk menambal sebelum publikasi (coordinated disclosure).

## Versi yang didukung

Rilis stabil terbaru menerima perbaikan keamanan.

| Versi | Didukung |
|-------|:--------:|
| `0.1.x` (terbaru) | ✅ |
| lainnya | ❌ |

## Kontrol keamanan yang diterapkan

### Autentikasi & sesi
- **Better Auth** mengelola identitas; kata sandi di-hash (scrypt) - tidak pernah disimpan
  sebagai teks polos. Minimal 8 karakter.
- **2FA (TOTP)** opsional + kode cadangan (backup codes).
- **OTP email** 6 digit (berlaku 10 menit) untuk verifikasi email, masuk, dan reset sandi.
- **Reset kata sandi** lewat tautan/kode sekali pakai (dikirim via email).
- **Sesi**: cookie `httpOnly`; pengguna bisa melihat & mencabut sesi aktif. Ganti kata sandi
  mencabut sesi lain (`revokeOtherSessions`).
- **Rate limiting** diaktifkan pada endpoint auth (default 30 permintaan / 60 detik) dan
  endpoint sensitif lain (charge tamu, provision, ekspor, resend). Kunci IP diambil dari
  `cf-connecting-ip` (Cloudflare, tak bisa dipalsukan) lalu `x-real-ip` lalu hop **paling
  kanan** `X-Forwarded-For` - bukan paling kiri yang bisa diisi klien (anti XFF-spoof).
  Catatan: limiter in-memory berlaku per-instance; untuk multi-instance pakai Redis/Upstash.
- **Anti-bot (Cloudflare Turnstile)** pada daftar & masuk. **Fail-closed di produksi**: bila
  `TURNSTILE_SECRET_KEY` tak diset saat `NODE_ENV=production`, aplikasi menolak boot (tak
  diam-diam menonaktifkan proteksi).
- **CSRF/Origin**: endpoint Better Auth memerlukan header `Origin` yang valid.
- **Header keamanan** (`next.config.ts`, berlaku semua rute): `Content-Security-Policy:
  frame-ancestors 'self'` (anti-clickjacking pada aksi server), `Strict-Transport-Security`
  (HSTS), `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`.
- **SSO lintas subdomain**: di produksi cookie dipasang untuk domain `.maubisa.id`
  (aktif hanya bila `BETTER_AUTH_URL` mengandung `maubisa.id`; localhost tetap host-only).

### Pembayaran (Midtrans)
- **Verifikasi signature webhook**: `SHA512(order_id + status_code + gross_amount + ServerKey)`
  dibandingkan secara **constant-time** (`crypto.timingSafeEqual`). Signature tidak valid → `403`.
  `gross_amount` dipakai sebagai string mentah dari payload (tidak diformat ulang sebelum hash).
- **Idempotency**: setiap event pembayaran dicatat (`payment_events.event_id` unik) dan hanya
  diproses sekali; aman terhadap retry/duplikasi.
- **Monotonic**: status `paid` tidak pernah diturunkan ke `pending` oleh notifikasi yang datang
  tidak berurutan (Midtrans bisa mengirim ulang/terlambat).
- **Cross-check jumlah**: `gross_amount` notifikasi dibandingkan dengan invoice tersimpan; selisih →
  aktivasi diabaikan (menangkap order salah / drift konfigurasi walau signature valid).
- **Re-verifikasi status (Get Status API)**: untuk `capture`/`fraud_status=challenge`, status
  dicek ulang langsung ke `api.midtrans.com/v2/{order}/status` sebelum aktivasi (defense-in-depth).
- **Fraud mapping**: `capture` hanya `paid` bila `fraud_status=accept`; `challenge`→pending;
  `deny`→failed. `authorize` (pre-auth) ditahan sebagai pending.
- **Aktivasi akses hanya lewat webhook** - checkout TIDAK pernah memberi entitlement langsung.
- **Harga otoritatif dari server** (`products` di DB, resolver tunggal `lib/checkout.ts`), bukan dari
  klien; `gross_amount` dibulatkan ke integer IDR sesuai syarat Snap.
- **Guest checkout (beli langsung)**: route tamu TIDAK menulis DB; identitas dibawa lewat Midtrans
  `custom_field1..3`, akun+invoice+entitlement dibuat di webhook saat lunas (tanpa user/invoice hantu).
- **Pembatalan/refund** mencabut entitlement + membatalkan langganan terkait.
- `credit_card.secure = true` (3DS) diaktifkan pada transaksi Snap.
- **Redaksi error**: endpoint checkout/webhook tidak mengembalikan detail internal ke klien;
  detail hanya di-log server-side.
- **Order id tak-tertebak**: `newOrderId()` menambahkan 40-bit entropi kriptografis
  (`crypto.randomBytes`) sehingga status pesanan tak bisa dienumerasi lewat endpoint status
  publik. Dipakai di semua jalur charge termasuk Payment Link.
- **BIN lookup & Get-Status** di jalur panas webhook memakai `AbortSignal.timeout` supaya API
  Midtrans yang lambat tak menahan ACK webhook (gagal → fallback aman).

### Provisioning (dari web utama)
- Endpoint `POST /api/provision` dilindungi **shared secret** (`x-provision-secret`) yang
  dibandingkan **constant-time** (`secureEqual`/`timingSafeEqual`) - anti timing attack.
- **Validasi batas nominal** (0 < amount ≤ 1e9) untuk menolak payload cacat/berbahaya.
- **Tidak pernah mengirim kata sandi acak dalam teks polos** (sesuai ADR-002): akun baru
  menerima **tautan atur kata sandi** sekali pakai; akun lama menerima **OTP masuk** via email.
- **Catatan kepercayaan**: endpoint ini mempercayai pemanggil (web utama) untuk data pembayaran.
  Pemanggil wajib memverifikasi pembayaran di sisinya; jangan panggil dari klien publik.

### Data & privasi (UU PDP)
- **Unduh data** (`/api/account/export`) hanya untuk pemilik sesi (cek kepemilikan); mencakup
  profil, metode pembayaran (tanpa token/PAN), langganan, invoice, dan registrasi acara.
- **Hapus akun**: mencabut akses, membatalkan langganan, *soft-delete* data inti, dan
  menghapus kredensial autentikasi.
- **Kartu**: hanya token Midtrans + `brand`/`last4`/`exp` yang disimpan - **tidak pernah** PAN
  atau CVV (lingkup **SAQ-A**; pemrosesan kartu sepenuhnya di Midtrans).
- **Lokasi data**: identitas & metadata pembayaran diproses di infrastruktur pilihan penerap
  (mis. Google Cloud SQL region Jakarta `asia-southeast2`). Klaim yurisdiksi apa pun di
  halaman privasi harus mencerminkan region penyebaran aktual.

### Rahasia & konfigurasi
- Semua kunci (Midtrans, SMTP, `BETTER_AUTH_SECRET`, `PROVISION_SECRET`) dibaca dari
  **environment** (`.env`), tidak pernah di-commit. `.env*` masuk `.gitignore`.
- Jangan pernah menaruh kredensial di kode, log, atau response API.

### Keamanan dependensi (supply chain)
- Target: **`npm audit` = 0 kerentanan**. CI + Dependabot (npm & GitHub Actions) memantau.
- Untuk kerentanan pada *transitive dependency* yang parent-nya belum menaikkan versi
  (mis. `postcss`/`sharp` yang dibatasi Next), kami memakai **`overrides`** di `package.json`
  untuk menambal ke versi aman **tanpa menurunkan versi Next**. Contoh: `postcss ^8.5.25`
  (patch XSS/path-traversal) dan `sharp ^0.35.3` (patch libvips). Setiap override diverifikasi
  dengan `tsc` + tes + `next build` + smoke test biner native sebelum rilis.
- Dependabot dikonfigurasi mengabaikan lonjakan **major** otomatis; peningkatan major ditinjau
  manual agar tidak memutus jalur uang.

### Kontrol akses aplikasi
- Semua halaman di grup `(app)` digerbang sesi; tanpa sesi → redirect `/masuk`.
- Halaman/aksi yang menyentuh data (invoice, export) memverifikasi kepemilikan berdasarkan
  pengguna sesi.
- **IDOR**: invoice diambil dengan `findFirst({ where: { orderId, userId } })` (terikat sesi);
  akses order milik user lain → `404`. Ekspor & preferensi selalu diturunkan dari sesi, bukan input klien.

### Validasi input & konten
- **URL foto profil (avatar)** hanya menerima skema `http(s)://` - memblokir `javascript:`/`data:`
  URI (mencegah XSS lewat atribut `src`).
- **Tanggal lahir** divalidasi di server: harus tanggal valid dan tidak di masa depan.
- **Ganti kata sandi** butuh konfirmasi sandi baru (cegah salah ketik) + minimal 8 karakter;
  mengganti sandi mencabut sesi lain.
- Aksi mutasi (server action) mengambil identitas dari sesi (`getSessionEmail`), **tidak pernah**
  mempercayai `userId` dari klien.

## Praktik untuk kontributor
- Jangan log data sensitif (kata sandi, OTP, token, `raw_payload` penuh) ke output publik.
- Validasi & batasi input di server (harga, kepemilikan, status) - jangan percaya klien.
- Pertahankan webhook tetap **idempotent** dan **ber-signature**.
- Gunakan Prisma parameterized queries (hindari SQL string mentah).
- Jalankan `npm run build` (type-check) & `npm run lint` sebelum PR.

## Checklist hardening sebelum produksi
Verifikasi ini sebelum mengarahkan trafik nyata:

- [ ] Semua secret produksi diset & unik: `BETTER_AUTH_SECRET` (≥32 byte acak),
      `PROVISION_SECRET`, `MIDTRANS_SERVER_KEY` (kunci **Production**, bukan sandbox),
      `TURNSTILE_SECRET_KEY`, kredensial `MAIL_*` asli.
- [ ] `NODE_ENV=production` - mengaktifkan Turnstile fail-closed & mematikan log OTP/reset dev.
- [ ] `BETTER_AUTH_URL` memakai domain produksi (`https://akun.maubisa.id`) agar cookie SSO
      lintas-subdomain `.maubisa.id` aktif.
- [ ] Webhook Midtrans menunjuk ke `https://akun.maubisa.id/api/webhook/midtrans` (HTTPS).
- [ ] Cloudflare SSL/TLS mode **Full (strict)**, `Always Use HTTPS` on, min TLS 1.2.
- [ ] Branch protection `main`: required status checks (CI) + review sebelum merge.
- [ ] Database memakai koneksi TLS; kredensial hanya dari secret manager, bukan `.env` commit.
- [ ] Rate-limit lintas-instance (Redis/Upstash) bila deploy >1 replica.
- [ ] Backup DB otomatis + uji restore; monitoring/alert (Sentry DSN produksi) aktif.

## Pembagian tanggung jawab operasional

- WAF/rate-limit tepi, proteksi DDoS, TLS termination -> Cloudflare.
- Backup & enkripsi at-rest database -> Cloud SQL.
- Rotasi kunci & manajemen secret produksi -> platform deploy.
