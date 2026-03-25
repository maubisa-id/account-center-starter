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
};

export type RegistrationsResult = {
  rows: EventRegistration[];
  freeConfigured: boolean; // sumber gratis (Directus) tersambung?
  freeError: boolean; // sumber gratis tersambung tapi gagal dibaca
};

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

async function listFree(): Promise<{ rows: EventRegistration[]; configured: boolean; error: boolean }> {
  const url = process.env.DIRECTUS_URL?.replace(/\/+$/, "");
  const token = process.env.DIRECTUS_TOKEN;
  // Demo publik: JANGAN tarik PII pendaftar asli dari CMS. Hanya di produksi.
  if (IS_DEMO || !url || !token) return { rows: [], configured: false, error: false };
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
    }),
  );
}

export async function listEventRegistrations(): Promise<RegistrationsResult> {
  const [free, paid] = await Promise.all([listFree(), listPaid()]);
  const rows = [...free.rows, ...paid].sort(
    (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
  );
  return { rows, freeConfigured: free.configured, freeError: free.error };
}
