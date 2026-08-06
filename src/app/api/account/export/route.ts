import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { idr, tanggal } from "@/lib/format";
import { LOGO_URL } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Unduh data pribadi (hak akses/portabilitas UU PDP). Hanya untuk pemilik sesi.
// Pengguna memilih format lewat ?format= : json (mesin), csv (spreadsheet), pdf (dokumen cetak).
type Format = "json" | "csv" | "pdf";

export async function GET(req: Request) {
  const limited = rateLimit(req, "account-export", { max: 8, windowMs: 5 * 60_000 });
  if (limited) return limited;

  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      subscriptions: true,
      invoices: { orderBy: { createdAt: "desc" } },
      entitlements: true,
      preferences: true,
      eventRegistrations: true,
      // Metadata kartu tersimpan saja (brand/last4/exp) — TOKEN sengaja TIDAK diekspor.
      paymentMethods: {
        select: {
          id: true, brand: true, bankCode: true, last4: true,
          expMonth: true, expYear: true, isPrimary: true, createdAt: true,
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const format = normalizeFormat(new URL(req.url).searchParams.get("format"));
  // Audit (UU PDP Pasal 5-15 / akuntabilitas Pasal 20): catat ekspor data pribadi.
  await logAudit({
    action: "data_export",
    target: `user:${user.uuid}`,
    metadata: { format },
    actorEmail: email,
  });

  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.uuid,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      headline: user.headline,
      avatarUrl: user.avatarUrl,
      birthDate: user.birthDate,
      gender: user.gender,
      city: user.city,
      country: user.country,
      language: user.language,
      timezone: user.timezone,
      status: user.status,
      createdAt: user.createdAt,
    },
    subscriptions: user.subscriptions,
    invoices: user.invoices,
    entitlements: user.entitlements,
    paymentMethods: user.paymentMethods,
    eventRegistrations: user.eventRegistrations,
    preferences: user.preferences,
  };

  const slug = user.uuid.slice(0, 8);

  if (format === "csv") {
    return new NextResponse(buildCsv(data), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="maubisa-data-${slug}.csv"`,
      },
    });
  }
  if (format === "pdf") {
    // "PDF" tanpa pustaka berat: dokumen HTML siap-cetak yang otomatis membuka dialog cetak
    // browser (Simpan sebagai PDF). Menambah pdfkit/puppeteer hanya untuk ekspor data = mubazir.
    return new NextResponse(buildPrintableHtml(data), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="maubisa-data-${slug}.json"`,
    },
  });
}

function normalizeFormat(raw: string | null): Format {
  return raw === "csv" || raw === "pdf" ? raw : "json";
}

type ExportData = {
  exportedAt: string;
  account: Record<string, unknown>;
  subscriptions: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  entitlements: Record<string, unknown>[];
  paymentMethods: Record<string, unknown>[];
  eventRegistrations: Record<string, unknown>[];
  preferences: Record<string, unknown>[];
};

// ── CSV ────────────────────────────────────────────────────────────────────
// Satu berkas berisi beberapa "tabel" bersekat (Excel/Sheets membacanya baik). Bagian akun
// ditulis sebagai pasangan kunci-nilai; koleksi (invoice, langganan) sebagai tabel biasa.
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  // Bungkus dengan tanda kutip bila mengandung koma/kutip/baris-baru; escape kutip ganda.
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvSection(title: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return `${title}\n(tidak ada)\n`;
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const head = cols.map(csvCell).join(",");
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(",")).join("\n");
  return `${title}\n${head}\n${body}\n`;
}

function buildCsv(d: ExportData): string {
  const accountRows = Object.entries(d.account).map(([field, value]) => ({ field, value }));
  const parts = [
    `Data Pribadi sini`,
    `Diekspor,${csvCell(d.exportedAt)}`,
    ``,
    csvSection("AKUN", accountRows),
    ``,
    csvSection("LANGGANAN", d.subscriptions),
    ``,
    csvSection("INVOICE / PEMBAYARAN", d.invoices),
    ``,
    csvSection("HAK AKSES (ENTITLEMENT)", d.entitlements),
    ``,
    csvSection("METODE PEMBAYARAN", d.paymentMethods),
    ``,
    csvSection("PENDAFTARAN ACARA", d.eventRegistrations),
    ``,
    csvSection("PREFERENSI", d.preferences),
  ];
  // BOM UTF-8 supaya Excel Windows membaca karakter Indonesia dengan benar.
  return "\uFEFF" + parts.join("\n");
}

// ── PDF (HTML siap-cetak) ────────────────────────────────────────────────────
function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function kvTable(rows: [string, unknown][]): string {
  const trs = rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v) || "-"}</td></tr>`).join("");
  return `<table class="kv">${trs}</table>`;
}

function gridTable(rows: Record<string, unknown>[], labels?: Record<string, string>): string {
  if (rows.length === 0) return `<p class="empty">Tidak ada data.</p>`;
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const head = cols.map((c) => `<th>${esc(labels?.[c] ?? c)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c]) || "-"}</td>`).join("")}</tr>`)
    .join("");
  return `<table class="grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function buildPrintableHtml(d: ExportData): string {
  const a = d.account;
  const invoiceRows = d.invoices.map((inv) => ({
    Tanggal: inv.createdAt instanceof Date ? tanggal(inv.createdAt) : tanggal(new Date(String(inv.createdAt))),
    "No. pesanan": inv.orderId,
    Item: inv.itemName,
    Jumlah: typeof inv.amount === "number" || typeof inv.amount === "string" ? idr(inv.amount) : "-",
    Status: inv.status,
  }));
  const subRows = d.subscriptions.map((s) => ({
    Paket: s.planName ?? s.itemRef ?? "-",
    Status: s.status,
    "Berlaku s/d": s.currentPeriodEnd instanceof Date ? tanggal(s.currentPeriodEnd) : String(s.currentPeriodEnd ?? "-"),
  }));
  const entRows = d.entitlements.map((e) => ({
    Jenis: e.itemType,
    Referensi: e.itemRef,
    Status: e.status,
    "Berlaku s/d": e.expiresAt instanceof Date ? tanggal(e.expiresAt) : String(e.expiresAt ?? "-"),
  }));

  return `<!doctype html>
<html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Data Pribadi sini</title>
<style>
  :root { --ink:#141414; --muted:#6b6b6b; --brand:#0a48b7; --line:#e5ebf4; --tint:#eef4fe; }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px; color:var(--ink); background:#fff;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size:13px; line-height:1.5; }
  .wrap { max-width: 820px; margin:0 auto; }
  .bar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:24px;
    padding-bottom:16px; border-bottom:2px solid var(--brand); }
  .brand { font-size:20px; font-weight:800; letter-spacing:-0.02em; color:var(--brand); }
  .brand span { color:var(--ink); font-weight:700; }
  .meta { font-size:11px; color:var(--muted); text-align:right; }
  .print-btn { display:inline-flex; align-items:center; gap:8px; padding:9px 16px; border:none; border-radius:9px;
    background:var(--brand); color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:0.08em; color:var(--brand); margin:28px 0 10px; }
  table { width:100%; border-collapse:collapse; margin-bottom:4px; }
  th, td { text-align:left; padding:7px 10px; border:1px solid var(--line); vertical-align:top; word-break:break-word; }
  table.kv th { width:190px; background:var(--tint); font-weight:600; color:var(--muted); }
  table.grid thead th { background:var(--tint); font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--muted); }
  table.grid tbody tr:nth-child(even) td { background:#fafbfe; }
  .empty { color:var(--muted); font-style:italic; margin:2px 0 10px; }
  .foot { margin-top:28px; padding-top:14px; border-top:1px solid var(--line); font-size:11px; color:var(--muted); }
  @media print {
    body { padding:0; } .no-print { display:none !important; }
    @page { margin:14mm; }
    h2 { break-after:avoid; } table { break-inside:auto; } tr { break-inside:avoid; }
  }
</style>
</head><body>
<div class="wrap">
  <div class="bar">
    <div class="brand"><img src="${LOGO_URL}" alt="Maubisa" style="height:26px;width:auto;display:inline-block;vertical-align:middle;border:0"> <span>· Data Pribadi</span></div>
    <div style="text-align:right">
      <button class="print-btn no-print" onclick="window.print()">Cetak / Simpan PDF</button>
      <div class="meta">Diekspor ${esc(tanggal(new Date(d.exportedAt)))}</div>
    </div>
  </div>

  <h2>Akun</h2>
  ${kvTable([
    ["Nama lengkap", a.name],
    ["Nama tampilan", a.displayName],
    ["Email", a.email],
    ["Nomor HP", a.phone],
    ["Headline", a.headline],
    ["Tanggal lahir", a.birthDate instanceof Date ? tanggal(a.birthDate) : a.birthDate],
    ["Kota", a.city],
    ["Negara", a.country],
    ["Status akun", a.status],
    ["ID akun", a.id],
    ["Bergabung", a.createdAt instanceof Date ? tanggal(a.createdAt) : a.createdAt],
  ])}

  <h2>Langganan</h2>
  ${gridTable(subRows)}

  <h2>Invoice &amp; Pembayaran</h2>
  ${gridTable(invoiceRows)}

  <h2>Hak Akses</h2>
  ${gridTable(entRows)}

  <div class="foot">
    Dokumen ini berisi data pribadi kamu di sini (PT Litera Edu Solusi) sesuai hak portabilitas UU PDP.
    Untuk data mentah lengkap (termasuk metadata), unduh format JSON dari halaman Privasi &amp; Data.
  </div>
</div>
<script>
  // Buka dialog cetak otomatis; pengguna memilih "Simpan sebagai PDF".
  window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 350); });
</script>
</body></html>`;
}
