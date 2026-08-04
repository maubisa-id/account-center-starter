#!/usr/bin/env node
/*
 * db-provider.mjs — samakan `datasource.provider` di prisma/schema.prisma dengan DB_PROVIDER.
 *
 * KENAPA: Prisma mewajibkan provider berupa teks statis (tidak bisa dari env). Repo ini
 * default "sqlite" agar dev lokal nol-setup, tapi produksi/demo memakai MySQL. Script ini
 * menulis ulang SATU baris provider berdasarkan env `DB_PROVIDER` (atau argumen pertama),
 * jadi kamu tidak perlu mengedit schema manual tiap deploy. Aman diulang (idempoten) dan
 * tidak menyentuh baris `provider = "prisma-client-js"` milik generator.
 *
 * Pakai:  node scripts/db-provider.mjs            # baca env DB_PROVIDER (default sqlite)
 *         node scripts/db-provider.mjs mysql      # paksa mysql
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ALLOWED = ["sqlite", "mysql", "postgresql"];
const provider = (process.argv[2] || process.env.DB_PROVIDER || "sqlite").toLowerCase();

if (!ALLOWED.includes(provider)) {
  console.error(`DB_PROVIDER tidak valid: "${provider}". Pilih: ${ALLOWED.join(", ")}.`);
  process.exit(1);
}

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "schema.prisma");
const before = readFileSync(schemaPath, "utf8");

// Hanya ganti provider DATABASE (sqlite/mysql/postgresql), bukan generator (prisma-client-js).
const re = /(\n\s*provider\s*=\s*")(sqlite|mysql|postgresql)(")/;
if (!re.test(before)) {
  console.error("Tidak menemukan baris datasource.provider di schema.prisma.");
  process.exit(1);
}
let out = before.replace(re, `$1${provider}$3`);

// Kolom PANJANG: di MySQL, `String` default = VARCHAR(191). Dua kelompok melebihi batas ini:
//   1) Payload JSON webhook Midtrans (payload/rawPayload/chargePayload/metadata) -> INSERT gagal
//      -> transaksi webhook rollback -> PEMBAYARAN TAK PERNAH TERKONFIRMASI.
//   2) Blob 2FA better-auth (secret & backupCodes) = hasil enkripsi; `backupCodes` (10 kode
//      terenkripsi) MELEBIHI 191 char -> `enable 2FA` gagal (P2000 "value too long").
// Perbaikan: native type TEXT. Konektor sqlite TIDAK mendukung @db.Text (dev lokal nol-setup pakai
// sqlite). Jadi: SUNTIK @db.Text hanya untuk non-sqlite, dan LEPAS untuk sqlite. Idempoten. Postgres:
// `String` sudah `text`, jadi @db.Text hanya penegasan (tetap valid).
const LONG_TEXT_FIELDS = ["payload", "rawPayload", "chargePayload", "metadata", "secret", "backupCodes"];
const wantText = provider !== "sqlite";
for (const field of LONG_TEXT_FIELDS) {
  // ^<indent><field> String[?] [ @db.Text] <sisa (mis. @map)>  -> pertahankan @map, atur @db.Text.
  const line = new RegExp(`^(\\s*${field}\\s+String\\??)(\\s+@db\\.Text)?(.*)$`, "m");
  out = out.replace(line, (_m, head, _existing, rest) => (wantText ? `${head} @db.Text${rest}` : `${head}${rest}`));
}

if (out !== before) {
  writeFileSync(schemaPath, out);
  console.log(
    `schema.prisma: datasource.provider -> "${provider}"` +
      (wantText ? " + @db.Text pada kolom panjang (payload/rawPayload/chargePayload/metadata + 2FA secret/backupCodes)" : ""),
  );
} else {
  console.log(`schema.prisma: sudah sesuai provider "${provider}" (tidak diubah)`);
}
