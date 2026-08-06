// Helper format lokal Indonesia. Dipakai lintas halaman account center.

export function idr(value: unknown): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function tanggal(d?: Date | null): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

export function tanggalPanjang(d?: Date | null): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(d);
}

// Format tanggal untuk input <input type="date"> (YYYY-MM-DD), zona lokal.
export function tanggalInput(d?: Date | null): string {
  if (!d) return "";
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

// Opsi & label profil (dipakai di form edit + tampilan).
export const GENDER_OPTIONS = [
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
  { value: "unspecified", label: "Tidak disebutkan" },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
] as const;

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Jakarta", label: "WIB · Asia/Jakarta (GMT+7)" },
  { value: "Asia/Makassar", label: "WITA · Asia/Makassar (GMT+8)" },
  { value: "Asia/Jayapura", label: "WIT · Asia/Jayapura (GMT+9)" },
] as const;

function labelFrom(opts: readonly { value: string; label: string }[], v?: string | null): string {
  if (!v) return "-";
  return opts.find((o) => o.value === v)?.label ?? v;
}

// Preferensi personalisasi (level user, lintas-produk) — dibaca app & kelas via core_user_id.
// Key di user_preferences: "interest:<slug>" dan "goal:<slug>". Lihat directus-maubisa/docs/acara-pendaftaran.md.
export const INTEREST_OPTIONS = [
  { value: "riset-skripsi", label: "Riset & Skripsi" },
  { value: "karir", label: "Karir & Magang" },
  { value: "ai", label: "AI & Teknologi" },
  { value: "produktivitas", label: "Produktivitas" },
  { value: "public-speaking", label: "Public Speaking" },
  { value: "beasiswa", label: "Beasiswa" },
  { value: "bahasa", label: "Bahasa Asing" },
  { value: "desain", label: "Desain & Kreatif" },
] as const;

export const GOAL_OPTIONS = [
  { value: "skripsi", label: "Menyelesaikan skripsi/tugas akhir" },
  { value: "kerja", label: "Siap kerja / magang" },
  { value: "akademik", label: "Nilai & prestasi akademik" },
  { value: "keterampilan", label: "Menambah keterampilan baru" },
  { value: "wirausaha", label: "Membangun usaha" },
] as const;

export const labelGender = (v?: string | null) => labelFrom(GENDER_OPTIONS, v);
export const labelBahasa = (v?: string | null) => labelFrom(LANGUAGE_OPTIONS, v);
export const labelZonaWaktu = (v?: string | null) => labelFrom(TIMEZONE_OPTIONS, v);
export const labelInterest = (v?: string | null) => labelFrom(INTEREST_OPTIONS, v);
export const labelGoal = (v?: string | null) => labelFrom(GOAL_OPTIONS, v);

export function inisial(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// Sisa hari sampai tanggal (negatif = sudah lewat). null jika tak ada tanggal.
export function sisaHari(d?: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

const PRODUK: Record<string, string> = {
  "membership-pro": "Keanggotaan Pro",
  "webinar-sample": "Webinar Contoh",
  "webinar-free": "Webinar Gratis",
  "community-hub": "Komunitas",
  "consult-basic": "Konsultasi - Basic",
  "consult-plus": "Konsultasi - Plus",
  "course-sample": "Kelas Contoh",
};

export function namaProduk(code?: string | null): string {
  if (!code) return "-";
  return PRODUK[code] ?? code;
}

// Nama layanan (per scope) yang enak dibaca.
const LAYANAN: Record<string, string> = {
  app: "Keanggotaan & Komunitas",
  kelas: "Kelas",
  thesis: "Bimbingan",
  book: "Buku",
};

export function namaLayanan(scope?: string | null): string {
  if (!scope) return "-";
  return LAYANAN[scope] ?? scope;
}

// Jenis akses (dari item_type) dalam bahasa Indonesia.
const JENIS: Record<string, string> = {
  subscription: "Langganan",
  event: "Acara",
  one_time: "Sekali beli",
  membership: "Keanggotaan",
  course: "Kelas",
  service: "Layanan",
};

export function jenisAkses(itemType?: string | null): string {
  if (!itemType) return "Akses";
  return JENIS[itemType] ?? itemType;
}

// Ubah slug jadi label manusiawi: "webinar-free-produktif" -> "Webinar Gratis Produktif".
// Akronim tertentu di-uppercase. Dipakai sbg fallback terakhir judul entitlement/acara.
const ACRONYMS = new Set(["mbg", "ai", "id", "pdf", "hr", "ux", "ui"]);
export function humanizeSlug(slug?: string | null): string {
  if (!slug) return "Akses";
  const words = slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)));
  return words.join(" ") || "Akses";
}

// Judul entitlement yang manusiawi: utamakan nama produk resmi, lalu nama item
// dari invoice/acara terkait, baru fallback ke slug yang dirapikan.
export function judulEntitlement(opts: {
  productCode?: string | null;
  itemRef?: string | null;
  itemName?: string | null;
}): string {
  const { productCode, itemRef, itemName } = opts;
  if (productCode && PRODUK[productCode]) return PRODUK[productCode];
  if (itemName) return itemName;
  if (productCode) return namaProduk(productCode);
  if (itemRef) return humanizeSlug(itemRef);
  return "Akses";
}

// Subjudul entitlement: "{jenis} · {nama produk / layanan}", mis. "Langganan · Keanggotaan Pro".
// Kalau produk/layanan tak dikenal (mis. scope 'event'), cukup tampilkan jenisnya saja
// supaya tidak muncul "Acara · event" yang janggal.
export function subjudulEntitlement(opts: {
  itemType?: string | null;
  productCode?: string | null;
  scope?: string | null;
}): string {
  const { itemType, productCode, scope } = opts;
  const kiri = jenisAkses(itemType);
  const kanan =
    productCode && PRODUK[productCode]
      ? PRODUK[productCode]
      : scope && LAYANAN[scope]
        ? LAYANAN[scope]
        : null;
  return kanan ? `${kiri} · ${kanan}` : kiri;
}

const METODE: Record<string, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bank_transfer: "Transfer Bank",
  credit_card: "Kartu Kredit / Debit",
  card: "Kartu Kredit / Debit",
  echannel: "Mandiri Bill Payment",
  cstore: "Gerai Retail",
  // Id metode Core API saat status pending (sebelum webhook menimpa dgn payment_type Midtrans).
  bca: "BCA Virtual Account",
  bni: "BNI Virtual Account",
  bri: "BRI Virtual Account",
  permata: "Permata Virtual Account",
  mandiri: "Mandiri Bill Payment",
};

export function metodeBayar(code?: string | null): string {
  if (!code) return "-";
  return METODE[code] ?? code;
}

// Nama payment gateway/provider untuk tampilan (mis. "midtrans" tersimpan lowercase di DB).
export function namaProvider(code?: string | null): string {
  if (!code) return "-";
  const map: Record<string, string> = { midtrans: "Midtrans" };
  return map[code.toLowerCase()] ?? code.charAt(0).toUpperCase() + code.slice(1);
}
