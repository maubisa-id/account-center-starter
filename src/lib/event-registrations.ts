import { prisma } from "@/lib/prisma";

// Daftar pendaftar acara untuk /admin. DUA sumber kebenaran, disatukan hanya di TAMPILAN:
//   • GRATIS  -> Directus collection `event_registrations` (form website + Flow email).
//   • BAYAR   -> invoice core (itemType="event"), sumbernya webhook Midtrans.
// Keduanya TIDAK dipindah; /admin cuma membaca & menggabung untuk dilihat admin.
// Demo publik: sumber GRATIS (PII asli CMS) TIDAK ditarik — hanya invoice demo sendiri.

export type EventRegistration = {
  source: "free" | "paid";
  date: Date | null;
  name: string;
  email: string;
  eventTitle: string;
  eventCode: string | null;
  phone: string | null;
  org: string | null;
  category: string | null;
  amount: number | null; // hanya untuk yang berbayar
  status: string; // gratis: "registered"; bayar: status invoice (paid/pending/failed)
  scope: string | null; // lini layanan; berbayar dari invoice.scope, gratis dari events.service
};

export type RegistrationsResult = {
  rows: EventRegistration[];
  freeConfigured: boolean; // sumber gratis (Directus) tersambung?
  freeError: boolean; // sumber gratis tersambung tapi gagal dibaca
};

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

// Lini acara di CMS memakai field `events.service`. Nilainya dipetakan ke scope hub supaya
// filter lini di /admin/acara konsisten dengan invoice berbayar (yang sudah ber-scope).
const EVENT_SERVICE_TO_SCOPE: Record<string, string> = {
  akademik: "thesis", // Bimbingan
  "pengembangan-diri": "app", // Keanggotaan
  sertifikasi: "kelas", // Kelas
};

// Ambil peta lini per acara dari koleksi `events` (id -> scope hub). event_registrations tidak
// menyimpan lini; kita join lewat event_code (= id acara, lihat handoff blueprint). Best-effort:
// gagal baca events -> peta kosong (pendaftar gratis ber-scope null, tetap muncul di "Semua").
async function fetchEventLines(url: string, token: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${url}/items/events?fields=id,service&limit=-1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return {};
    const j = (await res.json()) as { data?: Array<{ id?: unknown; service?: unknown }> };
    const map: Record<string, string> = {};
    for (const e of j.data ?? []) {
      const scope = EVENT_SERVICE_TO_SCOPE[String(e.service ?? "")];
      if (e.id != null && scope) map[String(e.id)] = scope;
    }
    return map;
  } catch {
    return {};
  }
}

// Sumber GRATIS ketika Directus TIDAK terkonfigurasi (dev lokal / demo): tabel fallback lokal
// `event_registrations` (Prisma). Sesuai catatan skema — tabel ini hanya dipakai saat DIRECTUS_URL/
// TOKEN kosong. Identitas ditarik via relasi user (ADR-001). scope kolom lokal (opsional).
async function listFreeLocal(): Promise<EventRegistration[]> {
  const regs = await prisma.eventRegistration.findMany({
    orderBy: { id: "desc" },
    take: 200,
    select: {
      createdAt: true,
      eventRef: true,
      eventTitle: true,
      scope: true,
      institution: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });
  return regs.map(
    (r): EventRegistration => ({
      source: "free",
      date: r.createdAt ?? null,
      name: r.user?.name ?? "",
      email: r.user?.email ?? "",
      eventTitle: r.eventTitle ?? "Acara",
      eventCode: r.eventRef ?? null,
      phone: r.user?.phone ?? null,
      org: r.institution ?? null,
      category: null,
      amount: null,
      status: "registered",
      scope: r.scope ?? null,
    }),
  );
}

async function listFree(): Promise<{ rows: EventRegistration[]; configured: boolean; error: boolean }> {
  const url = process.env.DIRECTUS_URL?.replace(/\/+$/, "");
  const token = process.env.DIRECTUS_TOKEN;
  // Produksi (Directus terpasang & bukan demo): tarik pendaftar asli dari CMS. Selain itu
  // (demo / dev tanpa CMS): pakai tabel fallback lokal supaya demo tetap punya contoh gratis
  // tanpa menyentuh PII produksi. `configured` true di kedua jalur berdata supaya UI tak salah
  // memberi peringatan "tidak ditampilkan".
  if (IS_DEMO || !url || !token) {
    try {
      const rows = await listFreeLocal();
      return { rows, configured: rows.length > 0, error: false };
    } catch {
      return { rows: [], configured: false, error: false };
    }
  }
  try {
    const qs = new URLSearchParams({
      sort: "-date_created",
      limit: "200",
      fields: "date_created,event_code,event_title,nama,email,whatsapp,instansi,kategori,access,status",
    });
    const res = await fetch(`${url}/items/event_registrations?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { rows: [], configured: true, error: true };
    const j = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const lineByCode = await fetchEventLines(url, token);
    const rows = (j.data ?? []).map(
      (r): EventRegistration => ({
        source: "free",
        date: r.date_created ? new Date(String(r.date_created)) : null,
        name: String(r.nama ?? ""),
        email: String(r.email ?? ""),
        eventTitle: String(r.event_title ?? "Acara"),
        eventCode: r.event_code ? String(r.event_code) : null,
        phone: r.whatsapp ? String(r.whatsapp) : null,
        org: r.instansi ? String(r.instansi) : null,
        category: r.kategori ? String(r.kategori) : null,
        amount: null,
        status: String(r.status ?? "registered"),
        // Lini diambil dari koleksi `events` (events.service) via event_code. Null bila acara
        // tak ditemukan / service tak dikenal -> tampil hanya di filter "Semua layanan".
        scope: r.event_code ? (lineByCode[String(r.event_code)] ?? null) : null,
      }),
    );
    return { rows, configured: true, error: false };
  } catch {
    return { rows: [], configured: true, error: true };
  }
}

async function listPaid(): Promise<EventRegistration[]> {
  const invoices = await prisma.invoice.findMany({
    where: { itemType: "event" },
    orderBy: { id: "desc" },
    take: 200,
    select: {
      createdAt: true,
      itemName: true,
      itemRef: true,
      grossAmount: true,
      status: true,
      scope: true,
      user: { select: { name: true, email: true } },
    },
  });
  return invoices.map(
    (inv): EventRegistration => ({
      source: "paid",
      date: inv.createdAt ?? null,
      name: inv.user?.name ?? "",
      email: inv.user?.email ?? "",
      eventTitle: inv.itemName ?? "Acara",
      eventCode: inv.itemRef ?? null,
      phone: null,
      org: null,
      category: null,
      amount: Number(inv.grossAmount),
      status: inv.status,
      scope: inv.scope ?? null,
    }),
  );
}

export async function listEventRegistrations(scope?: string): Promise<RegistrationsResult> {
  const [free, paid] = await Promise.all([listFree(), listPaid()]);
  let rows = [...free.rows, ...paid].sort(
    (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
  );
  if (scope) rows = rows.filter((r) => r.scope === scope);
  return { rows, freeConfigured: free.configured, freeError: free.error };
}
