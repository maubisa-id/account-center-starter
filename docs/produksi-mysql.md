# Produksi MySQL — Panduan Enterprise (maubisa_core)

Panduan migrasi **SQLite (dev) → MySQL/Cloud SQL (produksi)** untuk `maubisa-account-center`,
disusun untuk standar enterprise: konsistensi engine, integritas data, performa, keamanan, dan
operasional. Berpasangan dengan `directus-maubisa/docs/arsitektur/maubisa-core-schema.sql`
(DDL kanonik) dan `docs/deploy-dan-kapasitas.md` (Cloud SQL, bukan container).

> **Ringkas:** kode TIDAK terkunci ke SQLite. Provider dibaca dari `DB_PROVIDER` (Better Auth)
> dan `datasource.provider` (Prisma). Guard `src/lib/db-config.ts` melempar error jelas bila
> `DB_PROVIDER` ↔ `DATABASE_URL` ↔ `schema.prisma` tidak konsisten, sehingga drift tidak senyap.

---

## 1. Tiga titik yang harus sinkron

Prisma tidak mengizinkan `datasource.provider` dibaca dari env (harus literal). Karena itu saat
pindah ke MySQL, ubah **tiga** hal bersamaan:

| # | Tempat | Dev (SQLite) | Produksi (MySQL) |
|---|--------|--------------|------------------|
| 1 | `prisma/schema.prisma` → `datasource.provider` | `"sqlite"` | `"mysql"` |
| 2 | `.env` → `DB_PROVIDER` | `sqlite` | `mysql` |
| 3 | `.env` → `DATABASE_URL` | `file:./dev.db` | `mysql://user:pass@host:3306/maubisa_core` |

Lalu `npx prisma generate`. Guard akan menolak start bila skema URL ≠ provider.

---

## 2. Instance Cloud SQL (rekomendasi)

- **Engine:** MySQL 8.0+ (bukan 5.7; butuh CTE, `utf8mb4`, JSON native, invisible index).
- **Charset/Collation server:** `utf8mb4` / `utf8mb4_0900_ai_ci` (emoji & nama internasional aman).
- **Storage engine:** InnoDB (default) — transaksional, row-level lock, FK. WAJIB untuk webhook
  pembayaran yang memakai `prisma.$transaction`.
- **Timezone:** simpan UTC di DB; aplikasi memformat ke `Asia/Jakarta` (sudah dilakukan di kode).
- **High availability:** aktifkan (regional) untuk produksi; automatic backup + PITR
  (point-in-time recovery) >= 7 hari.
- **Koneksi:** Cloud SQL Auth Proxy (mysql://user:pass@127.0.0.1:3306/db) atau socket
  (`?socket=/cloudsql/PROJECT:REGION:INSTANCE`). Jangan ekspos IP publik tanpa allowlist.
- **Parameter (flags) yang disarankan:**
  - `innodb_buffer_pool_size` ~ 60-70% RAM instance.
  - `max_connections` sesuai pool (lihat 5) + headroom Directus/produk lain.
  - `sql_mode` mencakup `STRICT_TRANS_TABLES` (tolak data tak valid — enterprise default).
  - `require_secure_transport = ON` (paksa TLS).

---

## 3. Skema: tipe native (bukan sekadar VARCHAR)

Skema Prisma memakai `String` untuk enum/JSON supaya jalan di SQLite. Di MySQL, tingkatkan ke tipe
native agar integritas dijamin DB, bukan hanya aplikasi. Ada dua jalur:

**Jalur A — Prisma murni (paling sederhana, disarankan awal).** Biarkan `String`/`Decimal`, cukup
tambahkan atribut `@db.*` agar kolom presisi benar:

```prisma
grossAmount   Decimal @map("gross_amount")   @db.Decimal(12, 2)
rawPayload    String? @map("raw_payload")     @db.Json          // JSON native
chargePayload String? @map("charge_payload")  @db.Json
metadata      String? @db.Json
// kolom status/scope/motion boleh tetap VARCHAR (app sudah memvalidasi),
// atau naikkan ke enum native (Jalur B).
```

**Jalur B — DDL kanonik (paling ketat).** Jalankan `maubisa-core-schema.sql` yang sudah memakai
`ENUM`, `DECIMAL(12,2)`, `JSON`, `TIMESTAMP`, FK, dan index. Prisma lalu `db pull` untuk
menyelaraskan model. Dipakai bila ingin constraint enum & FK ditegakkan MySQL.

Prinsip enterprise untuk uang/akses: **kolom uang `DECIMAL(12,2)`** (jangan FLOAT), **status
pakai ENUM**, **`order_id` UNIQUE** (idempotensi), **JSON native** untuk payload audit.

### Kolom yang WAJIB ada (ditambahkan chat migrasi Core API)

Pastikan DDL produksi memuat (sudah diselaraskan di `maubisa-core-schema.sql`):

- `invoices.charge_payload JSON NULL` — instruksi bayar (resume VA/QR).
- `invoices.motion` mencakup `'coreapi','coreapi-guest','coreapi-recurring','payment_link','web-utama','manual'` (dan `'snap'` utk histori).
- `subscriptions.status` mencakup `'pending'` (baris dibuat saat checkout, dinaikkan webhook).
- `subscriptions.saved_token VARCHAR(120) NULL` + `saved_token_expires_at TIMESTAMP NULL` —
  token kartu untuk recurring. **Perlakukan `saved_token` sebagai rahasia** (6).
- **`payment_methods`** (kartu tersimpan One Click): `saved_token` (RAHASIA, token Midtrans bukan
  PAN), `brand`, `bank_code` (BIN API), `last4`, `exp_month/year`, `is_primary`, UNIQUE
  `(user_id, saved_token)`. FK `user_id -> users.id` CASCADE. Perlakukan `saved_token` = rahasia.
- `entitlements.source` mencakup `'web-utama'`; `item_type` (invoices & entitlements) mencakup
  `'product'` (jalur provisioning `/api/provision`). Fallback `itemType` di kode = `'product'`.
- `invoices.status` mencakup `'cancelled'`; `users.status` mencakup `'deleted'` (hapus akun UU PDP).
- **`entitlements` UNIQUE `(invoice_id)`** (selain `(invoice_id,item_ref)`): guard tahan-NULL
  anti dobel-grant pada notifikasi capture+settlement bersamaan; grant gratis/manual (`invoice_id`
  NULL) tetap boleh banyak baris. Index redundan `(user_id)` DIHAPUS (prefix dari lookup idx).
- Kolom profil `users`: `display_name, avatar_url, birth_date, gender, headline, city, country,
  language, timezone` (selaras `prisma/schema.prisma`).
- `users.avatar_url VARCHAR(500) NULL` dan kolom profil lain (display_name, headline, dst).

---

## 4. Integritas & index (yang benar-benar dipakai)

- **UNIQUE:** `users.email`, `users.uuid`, `invoices.order_id`, `payment_events.event_id`,
  `entitlements (invoice_id, item_ref)`, `payment_methods (user_id, saved_token)` — kunci
  idempotensi & dedup (ADR-003).
- **Foreign key** (InnoDB): `invoices.user_id -> users.id` (ON DELETE RESTRICT — jangan hapus user
  yang punya tagihan; patuh retensi pajak), `entitlements/subscriptions.user_id -> users.id`
  (CASCADE), `invoices.subscription_id -> subscriptions.id` (SET NULL).
- **Index lookup** (sesuai query nyata): `invoices(user_id)`, `invoices(status)`,
  `invoices(item_type,item_ref)`, `subscriptions(user_id,status)`,
  `subscriptions(current_period_end)`, `subscriptions(provider_ref)` (dipakai matching renewal
  webhook — TAMBAHKAN bila belum ada), `entitlements(user_id,scope,status)`,
  `payment_events(order_id)`.
- **Charset per kolom teks** ikut server (`utf8mb4`). Hindari `utf8` (3-byte lama).

```sql
-- index penting yang lahir dari fitur recurring (pastikan ada di produksi):
CREATE INDEX subs_provider_ref_idx ON subscriptions (provider_ref);
```

---

## 5. Connection pooling (kritis untuk serverless/multi-instance)

Prisma membuka pool per instance. Di beberapa container/replica, total koneksi bisa meledak.

- Set batas pool di URL: `...&connection_limit=10&pool_timeout=20`.
- Rumus aman: `connection_limit x jumlah_instance` < `max_connections` Cloud SQL (sisakan untuk
  Directus/thesis yang berbagi instance).
- Untuk skala besar/serverless, pertimbangkan ProxySQL atau Cloud SQL connection pooling; pola
  singleton Prisma sudah diterapkan (`src/lib/prisma.ts`).

---

## 6. Keamanan (enterprise)

- **User DB paling sempit:** akun aplikasi hanya `SELECT/INSERT/UPDATE/DELETE` pada `maubisa_core`.
  TIDAK `DROP/ALTER/GRANT`. Migrasi pakai user terpisah (DDL).
- **TLS wajib** (`require_secure_transport=ON`); Cloud SQL Auth Proxy sudah terenkripsi.
- **Rahasia dalam kolom:** `subscriptions.saved_token` (token kartu Midtrans) & `raw_payload`
  bersifat sensitif. Jangan ekspor ke log/analitik; batasi akses read. Idealnya enkripsi
  at-rest (Cloud SQL CMEK) sudah aktif; untuk token, boleh application-level encryption bila
  kebijakan menuntut.
- **Kredensial di secret manager**, bukan repo (sudah: `.env` di-gitignore).
- **Audit:** simpan `raw_payload` webhook untuk rekonsiliasi (sudah), tapi jangan PII berlebih.
- **Backup terenkripsi + uji restore** berkala (bukan cuma aktifkan backup).

---

## 7. Migrasi & rilis

- **Gunakan migrasi berversi:** `npx prisma migrate deploy` (bukan `db push`) di produksi supaya
  perubahan skema tercatat & reversibel. `db push` hanya untuk dev cepat.
- **Zero-downtime:** kolom baru NULLABLE dulu -> backfill -> baru NOT NULL/constraint. Jangan
  `ALTER` besar saat jam sibuk.
- **Seed produk:** `npm run seed` atau `INSERT` dari `maubisa-core-schema.sql` (products).
- **Better Auth** (tabel `auth_*`) ikut ke MySQL yang sama; `DB_PROVIDER=mysql` otomatis
  mengarahkan adapter (tak perlu ubah kode).
- **SSO:** set `BETTER_AUTH_URL=https://akun.maubisa.id` -> cookie lintas subdomain `.maubisa.id`
  aktif (sudah dikondisikan di `src/lib/auth.ts`).

---

## 8. Operasional & kapasitas

- **Read replica** untuk laporan berat/analitik lintas Directus+core (jangan bebani primary) —
  lihat `directus-maubisa/docs/skalabilitas.md`.
- **Monitoring:** slow query log ON (threshold mis. 500 ms), alert pada `Threads_connected`,
  replication lag, buffer pool hit rate, disk.
- **SLO webhook:** p95 < 800 ms — pastikan index di atas ada supaya lookup invoice/
  subscription cepat di bawah beban.
- Satu instance Cloud SQL menampung beberapa database logis (`maubisa_core`, `app_maubisa`,
  `kelas_maubisa`, `thesis_maubisa`) — ADR-001 2.2.

---

## 9. Checklist go-live MySQL

- [ ] `schema.prisma` provider `mysql` + `DB_PROVIDER=mysql` + `DATABASE_URL` mysql (guard hijau)
- [ ] MySQL 8.0, `utf8mb4_0900_ai_ci`, InnoDB, `STRICT_TRANS_TABLES`, TLS wajib
- [ ] DDL kanonik diterapkan (`migrate deploy`), termasuk kolom `charge_payload`, `saved_token(+_expires_at)`, `avatar_url`, dan tabel `payment_methods` (kartu tersimpan + `bank_code`)
- [ ] Enum diselaraskan: `invoices.motion` (+coreapi-guest,web-utama), `subscriptions.status` (+pending), `entitlements.source` (+web-utama), `item_type` (+product)
- [ ] Index `subscriptions(provider_ref)` + semua UNIQUE idempotensi ada
- [ ] FK InnoDB terpasang (RESTRICT untuk invoices->users)
- [ ] `connection_limit` diset; total < `max_connections`
- [ ] User DB app minim privilege; migrasi pakai user DDL terpisah
- [ ] Backup otomatis + PITR + uji restore
- [ ] Slow query log + alert dasar aktif
- [ ] Seed products dijalankan; SSO cookie domain diverifikasi

## Lihat juga

- `directus-maubisa/docs/arsitektur/maubisa-core-schema.sql` — DDL kanonik
- `directus-maubisa/docs/deploy-dan-kapasitas.md` — Cloud SQL & Coolify
- `directus-maubisa/docs/skalabilitas.md` — read replica & penskalaan
- `src/lib/db-config.ts` — guard provider fail-fast
