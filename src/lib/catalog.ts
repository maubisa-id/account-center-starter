// Katalog layanan Acme untuk halaman "Ubah paket" (/langganan/ubah).
// Sumber: docs/arsitektur/katalog-produk.md. Metadata presentasi (blurb, cta, status
// section) ada di sini; HARGA & status aktif diambil dari `acme_core.products` lewat
// src/lib/products.ts (server). Flag section (live/coming_soon/off) mewakili Directus.

export type CatalogStatus = "live" | "coming_soon" | "off";
export type CatalogCta = "subscribe" | "buy" | "register" | "consult" | "included";

export type CatalogItem = {
  key: string;
  name: string;
  blurb: string;
  price: string;
  cadence?: string;
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
    key: "pro-plan",
    name: "Pro",
    blurb: "Langganan utama: materi eksklusif, komunitas, dan seluruh acara Pro.",
    price: "Rp75.000",
    cadence: "/bln",
    scope: "app",
    status: "live",
    cta: "subscribe",
    productCode: "pro-plan",
    badge: "Populer",
    priceIdr: 75000,
    itemType: "subscription",
  },
  {
    key: "community",
    name: "Community",
    blurb: "Komunitas Discord eksklusif. Sudah termasuk dalam langganan Pro.",
    price: "Termasuk Pro",
    scope: "app",
    status: "live",
    cta: "included",
  },
  {
    key: "events",
    name: "Events",
    blurb: "Webinar berbayar bersama praktisi. Bayar per acara.",
    price: "Rp29.000",
    cadence: "/acara",
    scope: "app",
    status: "live",
    cta: "buy",
    productCode: "events",
    priceIdr: 29000,
    itemType: "event",
  },
  {
    key: "free-events",
    name: "Free Events",
    blurb: "Webinar gratis untuk semua. Cukup daftar untuk ikut.",
    price: "Gratis",
    scope: "app",
    status: "live",
    cta: "register",
  },
  {
    key: "kelas",
    name: "Kelas & Sertifikasi",
    blurb: "Kelas online bersertifikat bersama mitra. Sedang disiapkan.",
    price: "Segera",
    scope: "kelas",
    status: "coming_soon",
    cta: "subscribe",
  },
  {
    key: "thesis",
    name: "Bimbingan Skripsi",
    blurb: "Pendampingan skripsi bersama mentor. Mulai dari sesi konsultasi.",
    price: "Konsultasi",
    scope: "thesis",
    status: "live",
    cta: "consult",
  },
  {
    key: "book",
    name: "Book Universe",
    blurb: "Buku dan bundel pilihan Acme. Segera hadir.",
    price: "Segera",
    scope: "book",
    status: "coming_soon",
    cta: "buy",
  },
];
