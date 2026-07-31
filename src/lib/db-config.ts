// Konfigurasi engine database + guard fail-fast (menutup temuan AUDIT P2).
//
// KENAPA ADA FILE INI: Prisma MEWAJIBKAN `datasource.provider` di schema.prisma berupa
// literal statis ("sqlite"/"mysql") — TIDAK bisa dibaca dari env. Jadi saat pindah ke
// produksi (MySQL/Cloud SQL) ada BEBERAPA titik yang harus konsisten:
//   1) prisma/schema.prisma  -> datasource.provider = "mysql"   (lalu `prisma generate`)
//   2) DB_PROVIDER (env)      -> "mysql"                          (dipakai Better Auth di bawah)
//   3) DATABASE_URL (env)     -> "mysql://..."                    (koneksi sebenarnya)
// Kalau salah satu lupa diganti, dulu gagalnya "diam" (mis. adapter sqlite menabrak URL
// mysql). Guard di bawah mengubahnya jadi error JELAS saat aplikasi start.

const ALLOWED = ["sqlite", "mysql", "postgresql"] as const;
export type DbProvider = (typeof ALLOWED)[number];

// Provider yang dipakai KODE APLIKASI (Better Auth adapter). Default "sqlite" (dev lokal).
// HARUS sama dengan datasource.provider di prisma/schema.prisma.
export const DB_PROVIDER: DbProvider = (() => {
  const raw = (process.env.DB_PROVIDER ?? "sqlite").toLowerCase();
  if (!(ALLOWED as readonly string[]).includes(raw)) {
    throw new Error(
      `DB_PROVIDER tidak valid: "${raw}". Pilih salah satu: ${ALLOWED.join(", ")}.`,
    );
  }
  return raw as DbProvider;
})();

// Skema URL yang sah untuk tiap provider.
function urlMatchesProvider(url: string, provider: DbProvider): boolean {
  const scheme = url.split(":", 1)[0]?.toLowerCase() ?? "";
  switch (provider) {
    case "sqlite":
      return url.startsWith("file:") || scheme === "sqlite";
    case "mysql":
      return scheme === "mysql";
    case "postgresql":
      return scheme === "postgresql" || scheme === "postgres";
  }
}

// Panggil sekali saat start (dari prisma.ts). Mencegah drift sqlite<->mysql yang senyap.
export function assertDbUrlMatchesProvider(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return; // Prisma sendiri yang akan protes bila URL kosong.
  if (!urlMatchesProvider(url, DB_PROVIDER)) {
    const scheme = url.split(":", 1)[0]?.toLowerCase() ?? "?";
    throw new Error(
      `Konfigurasi database tidak konsisten: DB_PROVIDER="${DB_PROVIDER}" tetapi ` +
        `DATABASE_URL memakai skema "${scheme}:". Samakan tiga hal: ` +
        `prisma/schema.prisma (datasource.provider), DB_PROVIDER, dan DATABASE_URL. ` +
        `Lihat komentar di prisma/schema.prisma.`,
    );
  }
}
