// Sumber acara Maubisa = CMS (Directus). Tim update event di panel Directus, Account
// Center MENARIK datanya (tanpa deploy). Event gratis (MBG Space) didaftar di sini ->
// jadi entitlement 'free' di core (tanpa invoice). Event berbayar (MBG Forge) -> checkout.
//
// Defensif: kalau DIRECTUS_URL/TOKEN belum diset atau Directus error, pakai contoh lokal
// supaya alur tetap jalan saat dev. Di produksi, isi env -> data asli dari CMS.

export type MbEvent = {
  id: string; // ref stabil (slug bila ada, else id Directus)
  title: string;
  description?: string | null;
  startsAt?: string | null; // ISO
  location?: string | null;
  isFree: boolean;
  priceIdr?: number | null;
  coverUrl?: string | null;
  productCode?: string | null; // untuk event berbayar -> checkout by product
  service?: string | null; // kategori (akademik | pengembangan-diri | sertifikasi)
  href?: string | null; // deep-link kanonik dari CMS (dipakai bila path internal; else diturunkan)
};

const DIRECTUS_URL = process.env.DIRECTUS_URL?.replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
const COLLECTION = process.env.DIRECTUS_EVENTS_COLLECTION ?? "events";
// Collection pendaftaran = SATU sumber untuk form website (anonim) + Account Center (login).
const REG_COLLECTION = process.env.DIRECTUS_REGISTRATIONS_COLLECTION ?? "event_registrations";

export function isDirectusConfigured(): boolean {
  return Boolean(DIRECTUS_URL && DIRECTUS_TOKEN);
}

// Contoh lokal (fallback dev). Slug dipakai sebagai id agar riwayat enak dibaca.
const SAMPLE_EVENTS: MbEvent[] = [
  {
    id: "mbg-space-riset-juli",
    title: "MBG Space: Menyusun Bab 1 Anti Revisi",
    description: "Sesi gratis membedah kerangka Bab 1 skripsi bareng mentor Maubisa.",
    startsAt: new Date(Date.now() + 5 * 864e5).toISOString(),
    location: "Zoom (online)",
    isFree: true,
    priceIdr: 0,
  },
  {
    id: "mbg-space-produktif",
    title: "MBG Space: Produktif Tanpa Burnout",
    description: "Ngobrol santai soal manajemen waktu & fokus buat mahasiswa akhir.",
    startsAt: new Date(Date.now() + 12 * 864e5).toISOString(),
    location: "Zoom (online)",
    isFree: true,
    priceIdr: 0,
  },
  {
    id: "mbg-forge-pitching",
    title: "MBG Forge: Workshop Pitching Riset (Berbayar)",
    description: "Workshop intensif menyusun pitch deck riset. Kuota terbatas.",
    startsAt: new Date(Date.now() + 20 * 864e5).toISOString(),
    location: "Zoom (online)",
    isFree: false,
    priceIdr: 29000,
    productCode: "mbg-forge",
  },
];

// Acara DEMO untuk uji coba pembayaran kartu tanpa bergantung ke Directus. Selalu tersedia di
// dev; di produksi hanya bila ENABLE_DEMO_EVENTS=true (mis. untuk demo publik). Di-merge ke
// hasil getEvents() dan dikenali getEventById() -> checkout bisa resolve harga otoritatif.
const DEMO_EVENTS: MbEvent[] = [
  {
    id: "demo-forge-data-analitik",
    title: "MBG Forge: Analisis Data Riset dengan Python",
    description: "Kelas praktik olah data penelitian dari nol pakai Python & pandas. (Acara demo)",
    startsAt: new Date(Date.now() + 27 * 864e5).toISOString(),
    location: "Zoom (online)",
    isFree: false,
    priceIdr: 79000,
    productCode: "mbg-forge",
    service: "akademik",
  },
  {
    id: "demo-forge-personal-branding",
    title: "MBG Forge: Personal Branding untuk Fresh Graduate",
    description:
      "Bangun profil LinkedIn & portofolio yang dilirik rekruter bareng praktisi HR. (Acara demo)",
    startsAt: new Date(Date.now() + 34 * 864e5).toISOString(),
    location: "Zoom (online)",
    isFree: false,
    priceIdr: 149000,
    productCode: "mbg-forge",
    service: "pengembangan-diri",
  },
];

// Demo aktif: paksa via ENABLE_DEMO_EVENTS=true/false, else default ON di non-produksi.
function demoEventsEnabled(): boolean {
  const flag = process.env.ENABLE_DEMO_EVENTS;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

// Gabungkan acara demo (bila aktif) tanpa menggandakan id, lalu urutkan menurut tanggal mulai.
function withDemo(events: MbEvent[]): MbEvent[] {
  if (!demoEventsEnabled()) return events;
  const ids = new Set(events.map((e) => e.id));
  const merged = [...events, ...DEMO_EVENTS.filter((d) => !ids.has(d.id))];
  return merged.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
}

type DirectusRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

// Parse harga dari Directus yang bisa berupa ANGKA (29000) ATAU STRING terformat
// Indonesia ("Rp199.000", "Rp 199.000", "Gratis"). Kembalikan { isFree, priceIdr }.
// Titik diperlakukan sebagai pemisah ribuan (bukan desimal), sesuai format Rupiah.
function parsePrice(v: unknown): { isFree: boolean; priceIdr: number | null } {
  if (typeof v === "number") return { isFree: v <= 0, priceIdr: v > 0 ? v : null };
  if (typeof v !== "string") return { isFree: true, priceIdr: null };
  const s = v.trim();
  if (!s) return { isFree: true, priceIdr: null };
  if (/gratis|free|rp\s*0\b/i.test(s)) return { isFree: true, priceIdr: null };
  const digits = s.replace(/[^\d]/g, ""); // buang "Rp", spasi, titik ribuan
  const n = digits ? Number(digits) : NaN;
  if (!Number.isFinite(n) || n <= 0) return { isFree: true, priceIdr: null };
  return { isFree: false, priceIdr: n };
}

// Petakan baris Directus -> MbEvent secara toleran (nama field bisa beragam).
function mapRow(r: DirectusRow): MbEvent | null {
  const title = str(r.title) ?? str(r.name) ?? str(r.judul);
  if (!title) return null;
  // id stabil: slug bila ada, else id Directus (BISA berupa ANGKA -> koersi ke string;
  // web utama memakai String(id) sebagai ?event=, jadi harus konsisten), else slug-judul.
  const rawId = r.slug ?? r.id;
  const id =
    (typeof rawId === "string" && rawId.trim()) || typeof rawId === "number"
      ? String(rawId)
      : title.toLowerCase().replace(/\s+/g, "-");
  // Harga bisa angka atau string "Rp199.000"/"Gratis" -> parse konsisten.
  const { isFree, priceIdr } = parsePrice(r.price ?? r.harga ?? r.price_idr);
  const cover = str(r.cover_url) ?? str(r.image_url);
  return {
    id,
    title,
    description: str(r.description) ?? str(r.deskripsi) ?? str(r.excerpt),
    startsAt: str(r.date_start) ?? str(r.starts_at) ?? str(r.event_at) ?? str(r.date),
    location: str(r.location) ?? str(r.lokasi) ?? str(r.venue),
    isFree,
    priceIdr,
    coverUrl: cover,
    productCode: str(r.product_code),
    service: str(r.service) ?? str(r.kategori) ?? str(r.category),
    href: str(r.href) ?? str(r.url) ?? str(r.link),
  };
}

// Ambil acara dari Directus (published, akan datang lebih dulu). Fallback contoh saat dev.
// Query DISELARASKAN dengan web utama (directus.ts getEvents): filter published + date>=hari
// ini, sort by `date` (field asli — bukan `date_start` yang 403 dan bikin fallback senyap).
export async function getEvents(): Promise<{ events: MbEvent[]; source: "directus" | "sample" }> {
  if (!isDirectusConfigured()) return { events: withDemo(SAMPLE_EVENTS), source: "sample" };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const params = new URLSearchParams({
      "filter[status][_eq]": "published",
      "filter[date][_gte]": today,
      sort: "date",
      limit: "30",
    });
    const url = `${DIRECTUS_URL}/items/${encodeURIComponent(COLLECTION)}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      next: { revalidate: 300 }, // cache 5 menit
    });
    if (!res.ok) throw new Error(`Directus ${res.status}`);
    const json = (await res.json()) as { data?: DirectusRow[] };
    const events = (json.data ?? []).map(mapRow).filter((e): e is MbEvent => e !== null);
    return { events: withDemo(events), source: "directus" };
  } catch (e) {
    console.error(`[events] gagal ambil dari Directus: ${String(e)}`);
    return { events: withDemo(SAMPLE_EVENTS), source: "sample" };
  }
}

export async function getEventById(id: string): Promise<MbEvent | null> {
  const { events } = await getEvents();
  return events.find((e) => e.id === id) ?? null;
}

// Harga OTORITATIF sebuah acara berbayar untuk checkout (server-side). Sumbernya baris
// acara di Directus (staff-controlled), sesuai katalog-produk.md ("ambil judul + harga
// dari baris acara ... snapshot ke invoice"). Dipakai lib/checkout resolveCheckout agar
// nominal yang ditagih = harga acara sebenarnya, BUKAN harga produk mbg-forge tetap.
// Return null bila acara tak ditemukan (pemanggil boleh fallback/ tolak).
export async function getEventPricing(
  id: string,
): Promise<{ title: string; isFree: boolean; priceIdr: number | null } | null> {
  const ev = await getEventById(id);
  if (!ev) return null;
  return { title: ev.title, isFree: ev.isFree, priceIdr: ev.priceIdr ?? null };
}

// Peta id acara -> judul (untuk menampilkan judul asli entitlement acara di dashboard,
// termasuk acara gratis yang tak punya invoice). Aman: kalau CMS kosong -> peta kosong.
export async function eventTitleMap(): Promise<Map<string, string>> {
  const { events } = await getEvents();
  return new Map(events.map((e) => [e.id, e.title]));
}

export type RegistrationInput = {
  eventRef: string;
  eventTitle?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  institution?: string | null;
  note?: string | null;
  coreUserId?: string | null; // uuid core user (null bila anonim/dari web)
  source: "web" | "account"; // asal pendaftaran
};

// Tulis pendaftaran ke collection Directus (SATU sumber, sama dgn form website /api/submit).
// PENTING: nama field mengikuti koleksi asli (Indonesia): event_code, nama, whatsapp, instansi,
// catatan, access, status, source, core_user_id. Dedup by email+event_code. Return true bila
// tertulis ke CMS; false bila Directus belum dikonfigurasi/gagal (pemanggil fallback ke core).
export async function createDirectusRegistration(input: RegistrationInput): Promise<boolean> {
  if (!isDirectusConfigured()) return false;
  try {
    // Cek duplikat (email + event) supaya klik ganda / lintas-pintu tidak menumpuk baris.
    const q = new URLSearchParams({
      "filter[email][_eq]": input.email,
      "filter[event_code][_eq]": input.eventRef,
      limit: "1",
      fields: "id",
    });
    const existing = await fetch(`${DIRECTUS_URL}/items/${REG_COLLECTION}?${q}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      cache: "no-store",
    });
    if (existing.ok) {
      const j = (await existing.json()) as { data?: { id: string | number }[] };
      const id = j.data?.[0]?.id;
      // Map ke nama field koleksi asli. access/status pakai default koleksi (free/registered).
      const body = {
        event_title: input.eventTitle ?? undefined,
        nama: input.name,
        whatsapp: input.phone ?? undefined,
        instansi: input.institution ?? undefined,
        catatan: input.note ?? undefined,
        core_user_id: input.coreUserId ?? undefined,
        source: input.source === "account" ? "dashboard" : "web",
      };
      // Sudah ada -> update (mis. anonim lalu login: lengkapi core_user_id). Belum -> create.
      const res = id
        ? await fetch(`${DIRECTUS_URL}/items/${REG_COLLECTION}/${id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`${DIRECTUS_URL}/items/${REG_COLLECTION}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ event_code: input.eventRef, email: input.email, ...body }),
          });
      return res.ok;
    }
    return false;
  } catch (e) {
    console.error(`[events] gagal tulis pendaftaran ke Directus: ${String(e)}`);
    return false;
  }
}

// Riwayat keikutsertaan seseorang dari Directus (dedup lintas jalur: web + account).
// Dicocokkan by core_user_id ATAU email (menautkan pendaftaran anonim yang lalu login).
export async function getDirectusRegistrations(opts: {
  email: string;
  coreUserId?: string | null;
}): Promise<{ eventRef: string; eventTitle?: string | null }[]> {
  if (!isDirectusConfigured()) return [];
  try {
    const filter = opts.coreUserId
      ? `filter[_or][0][core_user_id][_eq]=${encodeURIComponent(opts.coreUserId)}&filter[_or][1][email][_eq]=${encodeURIComponent(opts.email)}`
      : `filter[email][_eq]=${encodeURIComponent(opts.email)}`;
    const res = await fetch(
      `${DIRECTUS_URL}/items/${REG_COLLECTION}?${filter}&fields=event_code,event_title&limit=100`,
      { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const j = (await res.json()) as { data?: { event_code: string; event_title?: string | null }[] };
    return (j.data ?? []).map((r) => ({ eventRef: r.event_code, eventTitle: r.event_title }));
  } catch {
    return [];
  }
}

// Tautkan pendaftaran ANONIM (core_user_id NULL) milik email ini ke akun core yang baru dibuat.
// Dipanggil saat akun dibuat (ADR-001: daftar-dulu ATAU beli-langsung) supaya lead event gratis
// yang lalu punya akun "otomatis tertaut" — memenuhi janji di acara-pendaftaran.md. Idempotent:
// hanya menyentuh baris yang core_user_id-nya masih kosong. Aman bila Directus belum diset (no-op).
// Catatan: pembacaan sudah cocok by email juga, jadi ini terutama utk kebersihan data & analitik.
export async function linkDirectusRegistrationsByEmail(
  email: string,
  coreUserId: string,
): Promise<number> {
  if (!isDirectusConfigured() || !email || !coreUserId) return 0;
  try {
    // Update-by-query Directus: patch semua baris yang cocok email + core_user_id kosong.
    const res = await fetch(`${DIRECTUS_URL}/items/${REG_COLLECTION}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: { filter: { _and: [{ email: { _eq: email } }, { core_user_id: { _null: true } }] } },
        data: { core_user_id: coreUserId },
      }),
    });
    if (!res.ok) return 0;
    const j = (await res.json()) as { data?: unknown[] };
    return Array.isArray(j.data) ? j.data.length : 0;
  } catch (e) {
    console.error(`[events] gagal menautkan pendaftaran anonim: ${String(e)}`);
    return 0;
  }
}

// Satu baris peserta (arah "panitia": semua yang ikut satu acara), untuk recap/absensi/follow-up.
export type EventRegistrant = {
  name: string | null;
  email: string;
  phone: string | null;
  institution: string | null;
  note: string | null;
  coreUserId: string | null; // null = daftar anonim via form web (belum punya akun)
  source: "web" | "dashboard" | null;
  paid: boolean;
  createdAt: string | null;
};

// Tarik SELURUH peserta satu acara (arah panitia). Sumber tunggal = Directus event_registrations
// (gabungan web anonim + Account Center). Fallback ke tabel core saat Directus belum
// dikonfigurasi (dev). Nama field mengikuti koleksi asli (nama/whatsapp/instansi/catatan/access).
export async function getEventRegistrants(
  eventRef: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ items: EventRegistrant[]; source: "directus" | "core" }> {
  const limit = Math.min(opts.limit ?? 500, 1000);
  const offset = opts.offset ?? 0;

  if (isDirectusConfigured()) {
    try {
      const q = new URLSearchParams({
        "filter[event_code][_eq]": eventRef,
        fields: "nama,email,whatsapp,instansi,catatan,core_user_id,source,access,date_created",
        sort: "-date_created",
        limit: String(limit),
        offset: String(offset),
      });
      const res = await fetch(`${DIRECTUS_URL}/items/${REG_COLLECTION}?${q}`, {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const j = (await res.json()) as {
          data?: Array<{
            nama?: string | null;
            email: string;
            whatsapp?: string | null;
            instansi?: string | null;
            catatan?: string | null;
            core_user_id?: string | null;
            source?: "web" | "dashboard" | null;
            access?: string | null;
            date_created?: string | null;
          }>;
        };
        const items: EventRegistrant[] = (j.data ?? []).map((r) => ({
          name: r.nama ?? null,
          email: r.email,
          phone: r.whatsapp ?? null,
          institution: r.instansi ?? null,
          note: r.catatan ?? null,
          coreUserId: r.core_user_id ?? null,
          source: r.source ?? null,
          paid: r.access === "paid",
          createdAt: r.date_created ?? null,
        }));
        return { items, source: "directus" };
      }
    } catch (e) {
      console.error(`[events] gagal tarik peserta dari Directus: ${String(e)}`);
    }
  }

  // Fallback core (dev): join ke users supaya dapat nama/email/HP.
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.eventRegistration.findMany({
    where: { eventRef },
    include: { user: { select: { name: true, email: true, phone: true, uuid: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
  const items: EventRegistrant[] = rows.map((r) => ({
    name: r.user?.name ?? null,
    email: r.user?.email ?? "",
    phone: r.user?.phone ?? null,
    institution: r.institution,
    note: r.note,
    coreUserId: r.user?.uuid ?? null,
    source: "dashboard",
    paid: r.paid,
    createdAt: r.createdAt.toISOString(),
  }));
  return { items, source: "core" };
}
