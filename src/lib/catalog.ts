// Katalog layanan untuk halaman "Ubah paket" (/langganan/ubah).
// Metadata presentasi (blurb, cta, status section) ada di sini; harga & status aktif
// diambil dari tabel products lewat src/lib/products.ts (server).

export type CatalogStatus = "live" | "coming_soon" | "off";
export type CatalogCta = "subscribe" | "buy" | "register" | "consult" | "included";

export type CatalogItem = {
  key: string;
  name: string;
  blurb: string;
  price: string;
  cadence?: string;
  /** Tampilkan awalan "Mulai dari" untuk layanan berjenjang. */
  priceFrom?: boolean;
  scope: "app" | "kelas" | "thesis" | "book";
  status: CatalogStatus;
  cta: CatalogCta;
  productCode?: string;
  badge?: string;
  priceIdr?: number;
  itemType?: string;
};

export const CATALOG: CatalogItem[] = [
  {
    key: "membership-pro",
    name: "Keanggotaan Pro",
    blurb: "Langganan bulanan untuk konten eksklusif, komunitas, dan benefit pelanggan.",
    price: "Rp75.000",
    cadence: "/bln",
    priceFrom: true,
    scope: "app",
    status: "live",
    cta: "subscribe",
    productCode: "membership-pro",
    badge: "Populer",
    priceIdr: 75000,
    itemType: "subscription",
  },
  {
    key: "community-hub",
    name: "Komunitas",
    blurb: "Ruang komunitas pelanggan. Sudah termasuk dalam langganan aktif.",
    price: "Termasuk langganan",
    scope: "app",
    status: "live",
    cta: "included",
  },
  {
    key: "webinar-sample",
    name: "Webinar Contoh",
    blurb: "Acara berbayar bersama praktisi. Bayar per acara.",
    price: "Rp29.000",
    cadence: "/acara",
    priceFrom: true,
    scope: "app",
    status: "live",
    cta: "buy",
    productCode: "webinar-sample",
    priceIdr: 29000,
    itemType: "event",
  },
  {
    key: "webinar-free",
    name: "Webinar Gratis",
    blurb: "Acara gratis untuk semua. Cukup daftar untuk ikut.",
    price: "Gratis",
    scope: "app",
    status: "live",
    cta: "register",
  },
  {
    key: "course-sample",
    name: "Kelas Contoh",
    blurb: "Kursus mandiri atau cohort sebagai contoh produk kelas.",
    price: "Rp349.000",
    priceFrom: true,
    scope: "kelas",
    status: "live",
    cta: "buy",
    productCode: "course-sample",
    priceIdr: 349000,
    itemType: "course",
  },
  {
    key: "consult-basic",
    name: "Konsultasi",
    blurb:
      "Pendampingan 1-on-1 bersama mentor atau konsultan. Mulai dari sesi basic hingga paket intensif.",
    price: "Rp150.000",
    priceFrom: true,
    scope: "thesis",
    status: "live",
    cta: "consult",
  },
  {
    key: "book",
    name: "Buku",
    blurb: "Buku dan bundel digital. Segera hadir.",
    price: "Segera",
    scope: "book",
    status: "coming_soon",
    cta: "buy",
  },
];
