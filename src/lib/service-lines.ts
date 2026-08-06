// Sumber tunggal nama lini layanan (level scope). Dipisah dari lib/services.ts
// supaya aman diimpor komponen klien (murni data, tanpa env/entitlement).
//
// Scope keys adalah identifier internal yang dipakai DB/seed/katalog. Jangan rename
// thesis|app|kelas|book tanpa migrasi data; cukup ganti label tampilannya.

export type ServiceScope = "thesis" | "app" | "kelas" | "book";

// Urutan kanonik dipakai konsisten di launcher, /akses, dan filter katalog.
export const SERVICE_LINE_ORDER: ServiceScope[] = ["thesis", "app", "kelas", "book"];

// Ganti nama/tagline sesuai produkmu.
export const SERVICE_LINE: Record<ServiceScope, { name: string; tagline: string }> = {
  thesis: { name: "Bimbingan", tagline: "Konsultasi & pendampingan 1-on-1" },
  app: { name: "Keanggotaan", tagline: "Langganan bulanan & komunitas" },
  kelas: { name: "Kelas", tagline: "Kursus & sertifikasi" },
  book: { name: "Buku", tagline: "Buku & bundel" },
};

// Nama lini untuk sebuah scope (fallback ke scope mentah bila tak dikenal).
export function lineName(scope: string | null | undefined): string {
  if (!scope) return "";
  return (SERVICE_LINE as Record<string, { name: string }>)[scope]?.name ?? scope;
}

// Indeks urutan kanonik (untuk sort). Scope tak dikenal ditaruh di akhir.
export function lineOrderIndex(scope: string): number {
  const i = (SERVICE_LINE_ORDER as string[]).indexOf(scope);
  return i === -1 ? SERVICE_LINE_ORDER.length : i;
}
