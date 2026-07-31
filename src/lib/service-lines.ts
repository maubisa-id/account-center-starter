// Sumber tunggal nama LINI LAYANAN Maubisa (level scope). Dipisah dari lib/services.ts
// supaya aman diimpor komponen klien (murni data, tanpa env/entitlement). Nama diambil dari
// halaman publik maubisa.id/layanan + business plan MBG, jadi Account Center selaras dengan
// web utama.
//
// Dua level yang HARUS jelas bedanya di UI:
//  - LINI (scope)  = Maubisa Lulus / Berkembang / Mahir / Book Universe  → yang "dibuka" (SSO)
//  - PRODUK (item) = MBG+, MBG Forge, Kelas X, Bimbingan Skripsi …       → yang "dibeli"
// Katalog mengelompokkan produk DI BAWAH lininya; launcher & akses membuka di level lini.

export type ServiceScope = "thesis" | "app" | "kelas" | "book";

// Urutan kanonik = perjalanan MBG (Lulus → Berkembang → Mahir → Book). Dipakai konsisten di
// launcher, /akses, dan filter katalog supaya tidak acak antar-halaman.
export const SERVICE_LINE_ORDER: ServiceScope[] = ["thesis", "app", "kelas", "book"];

export const SERVICE_LINE: Record<ServiceScope, { name: string; tagline: string }> = {
  thesis: { name: "Maubisa Lulus", tagline: "Bimbingan skripsi & tugas akhir" },
  app: { name: "Maubisa Berkembang", tagline: "MBG+ · pengembangan diri & komunitas" },
  kelas: { name: "Maubisa Mahir", tagline: "Kelas & sertifikasi profesional" },
  book: { name: "Book Universe", tagline: "Buku & bundel pilihan" },
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
