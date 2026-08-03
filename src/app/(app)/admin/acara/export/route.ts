import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { listEventRegistrations } from "@/lib/event-registrations";
import { tanggal } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Ekspor CSV pendaftar acara (gratis dari CMS + berbayar dari checkout). Admin-gated.
// Read-only: memakai listEventRegistrations yang sama dengan halaman /admin/acara.
// Di demo, sumber gratis (PII CMS) tidak ditarik -> CSV hanya berisi pendaftar berbayar.

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Bungkus dengan tanda kutip bila mengandung koma/kutip/baris baru; escape kutip ganda.
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) return new Response("Not found", { status: 404 });

  const scope = new URL(request.url).searchParams.get("scope") ?? undefined;
  const { rows } = await listEventRegistrations(scope);
  const header = ["Tanggal", "Jenis", "Nama", "Email", "Telepon", "Acara", "Kode", "Instansi", "Kategori", "Status", "Nominal"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        tanggal(r.date),
        r.source === "free" ? "gratis" : "berbayar",
        r.name,
        r.email,
        r.phone,
        r.eventTitle,
        r.eventCode,
        r.org,
        r.category,
        r.status,
        r.amount ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // BOM UTF-8 supaya Excel membaca karakter Indonesia dengan benar.
  const body = "\uFEFF" + lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pendaftar-acara-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
