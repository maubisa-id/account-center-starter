# Kebijakan Keamanan — Acme Account Center

Dokumen ini menjelaskan cara melaporkan kerentanan dan ringkasan kontrol keamanan
yang diterapkan di Pusat Akun Acme (`akun.example.com`).

## Melaporkan kerentanan

Jangan buat issue publik untuk laporan keamanan. Kirim laporan secara privat ke:

- **security@example.com** (atau **no-reply@example.com** bila belum tersedia)

Sertakan: deskripsi, langkah reproduksi, dampak, dan (bila ada) bukti konsep. Kami
berupaya membalas dalam **3 hari kerja** dan memberi perbaikan sesuai tingkat keparahan.
Mohon beri kami waktu wajar untuk menambal sebelum publikasi (coordinated disclosure).

## Versi yang didukung

Proyek masih `0.x` (pra-rilis). Hanya branch/rilis terbaru yang menerima perbaikan keamanan.

| Versi | Didukung |
|-------|:--------:|
| terbaru (`main`) | ✅ |
| lainnya | ❌ |

## Kontrol keamanan yang diterapkan

### Autentikasi & sesi
- **Better Auth** mengelola identitas; kata sandi di-hash (scrypt) — tidak pernah disimpan
  sebagai teks polos. Minimal 8 karakter.
- **2FA (TOTP)** opsional + kode cadangan (backup codes).
- **OTP email** 6 digit (berlaku 10 menit) untuk verifikasi email, masuk, dan reset sandi.
- **Reset kata sandi** lewat tautan/kode sekali pakai (dikirim via email).
- **Sesi**: cookie `httpOnly`; pengguna bisa melihat & mencabut sesi aktif. Ganti kata sandi
  mencabut sesi lain (`revokeOtherSessions`).
- **Rate limiting** diaktifkan pada endpoint auth (default 30 permintaan / 60 detik).
- **CSRF/Origin**: endpoint Better Auth memerlukan header `Origin` yang valid.
- **SSO lintas subdomain**: di produksi cookie dipasang untuk domain `.example.com`
  (aktif hanya bila `BETTER_AUTH_URL` mengandung `example.com`; localhost tetap host-only).

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
- **Aktivasi akses hanya lewat webhook** — checkout TIDAK pernah memberi entitlement langsung.
- **Harga otoritatif dari server** (`products` di DB, resolver tunggal `lib/checkout.ts`), bukan dari
  klien; `gross_amount` dibulatkan ke integer IDR sesuai syarat Snap.
- **Guest checkout (beli langsung)**: route tamu TIDAK menulis DB; identitas dibawa lewat Midtrans
  `custom_field1..3`, akun+invoice+entitlement dibuat di webhook saat lunas (tanpa user/invoice hantu).
- **Pembatalan/refund** mencabut entitlement + membatalkan langganan terkait.
- `credit_card.secure = true` (3DS) diaktifkan pada transaksi Snap.
- **Redaksi error**: endpoint checkout/webhook tidak mengembalikan detail internal ke klien;
  detail hanya di-log server-side.

### Provisioning (dari web utama)
- Endpoint `POST /api/provision` dilindungi **shared secret** (`x-provision-secret`).
- **Tidak pernah mengirim kata sandi acak dalam teks polos** (sesuai ADR-002): akun baru
  menerima **tautan atur kata sandi** sekali pakai; akun lama menerima **OTP masuk** via email.
- **Catatan kepercayaan**: endpoint ini mempercayai pemanggil (web utama) untuk data pembayaran.
  Pemanggil wajib memverifikasi pembayaran di sisinya; jangan panggil dari klien publik.

### Data & privasi (UU PDP)
- **Unduh data** (`/api/account/export`) hanya untuk pemilik sesi (cek kepemilikan).
- **Hapus akun**: mencabut akses, membatalkan langganan, *soft-delete* data inti, dan
  menghapus kredensial autentikasi.
- Data identitas & pembayaran ditempatkan di **pusat data Indonesia (onshore)**.

### Rahasia & konfigurasi
- Semua kunci (Midtrans, SMTP, `BETTER_AUTH_SECRET`, `PROVISION_SECRET`) dibaca dari
  **environment** (`.env`), tidak pernah di-commit. `.env*` masuk `.gitignore`.
- Jangan pernah menaruh kredensial di kode, log, atau response API.

### Kontrol akses aplikasi
- Semua halaman di grup `(app)` digerbang sesi; tanpa sesi → redirect `/masuk`.
- Halaman/aksi yang menyentuh data (invoice, export) memverifikasi kepemilikan berdasarkan
  pengguna sesi.
- **IDOR**: invoice diambil dengan `findFirst({ where: { orderId, userId } })` (terikat sesi);
  akses order milik user lain → `404`. Ekspor & preferensi selalu diturunkan dari sesi, bukan input klien.

### Validasi input & konten
- **URL foto profil (avatar)** hanya menerima skema `http(s)://` — memblokir `javascript:`/`data:`
  URI (mencegah XSS lewat atribut `src`).
- **Tanggal lahir** divalidasi di server: harus tanggal valid dan tidak di masa depan.
- **Ganti kata sandi** butuh konfirmasi sandi baru (cegah salah ketik) + minimal 8 karakter;
  mengganti sandi mencabut sesi lain.
- Aksi mutasi (server action) mengambil identitas dari sesi (`getSessionEmail`), **tidak pernah**
  mempercayai `userId` dari klien.

## Praktik untuk kontributor
- Jangan log data sensitif (kata sandi, OTP, token, `raw_payload` penuh) ke output publik.
- Validasi & batasi input di server (harga, kepemilikan, status) — jangan percaya klien.
- Pertahankan webhook tetap **idempotent** dan **ber-signature**.
- Gunakan Prisma parameterized queries (hindari SQL string mentah).
- Jalankan `npm run build` (type-check) & `npm run lint` sebelum PR.

## Di luar cakupan repo ini (tanggung jawab infrastruktur)
- WAF/rate-limit tepi, proteksi DDoS, TLS termination → Cloudflare.
- Backup & enkripsi at-rest database → Cloud SQL.
- Rotasi kunci & manajemen secret produksi → platform deploy.
