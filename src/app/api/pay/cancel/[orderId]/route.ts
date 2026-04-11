import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  cancelTransaction,
  fetchTransactionStatus,
  resolveStatus,
  type InvoiceStatus,
} from "@/lib/midtrans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BATAL BAYAR (dipakai tombol "Batalkan pembayaran"). Membatalkan transaksi pending di
// Midtrans (VA/QRIS/e-wallet/kartu-challenge) via POST /v2/{order_id}/cancel → status
// `cancel`. Ini penting: sekadar menutup UI membiarkan VA/QR tetap bisa dibayar nanti
// (dan webhook akan terlanjur membuat akun/akses). Membatalkan di Midtrans membuat batal
// benar-benar final.
//
// Keamanan:
//  - Alur LOGIN (invoice sudah ada): WAJIB milik pengguna yang sedang masuk.
//  - Alur GUEST (belum ada invoice; tak ada yang ditulis DB sebelum lunas): verifikasi ke
//    Midtrans bahwa transaksi memang `pending` sebelum cancel (jangan sentuh yang settle).
//    orderId guest dibuat klien dengan suffix acak sehingga sulit ditebak pihak lain.
//  - Idempoten: bila sudah terminal, kembalikan status apa adanya.
const TERMINAL: InvoiceStatus[] = ["paid", "failed", "expired", "cancelled", "refunded"];

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const limited = rateLimit(req, "pay-cancel", { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { orderId } = await ctx.params;
  if (!orderId) return NextResponse.json({ error: "orderId wajib." }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({
    where: { orderId },
    select: { userId: true, status: true, subscriptionId: true },
  });

  if (invoice) {
    // ── Alur LOGIN: verifikasi kepemilikan ──────────────────────────────────
    const session = await auth.api.getSession({ headers: req.headers });
    const email = session?.user?.email ?? null;
    const me = email
      ? await prisma.user.findFirst({ where: { email }, select: { id: true } })
      : null;
    if (!me || me.id !== invoice.userId) {
      return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
    }

    // Sudah terminal -> idempoten.
    if (TERMINAL.includes(invoice.status as InvoiceStatus)) {
      return NextResponse.json({ status: invoice.status });
    }

    // Jangan batalkan yang ternyata SUDAH dibayar (verifikasi otoritatif ke Midtrans).
    const verified = await fetchTransactionStatus(orderId);
    if (verified && resolveStatus(verified.transactionStatus, verified.fraudStatus) === "paid") {
      return NextResponse.json({ status: "paid" });
    }

    await cancelTransaction(orderId);

    // Tandai lokal cancelled — TAPI hanya bila BELUM terminal. Guard ini menutup TOCTOU:
    // bila webhook menyelesaikan invoice (→ paid) di antara verifikasi di atas dan tulis ini,
    // updateMany bersyarat tidak menimpa status lunas jadi cancelled. Batalkan pula subscription
    // yang MASIH `pending` (belum diaktifkan webhook); yang sudah `active` tak tersentuh.
    const done = await prisma.invoice.updateMany({
      where: { orderId, status: { notIn: TERMINAL } },
      data: { status: "cancelled", updatedAt: new Date() },
    });
    if (done.count === 0) {
      // Sudah terminal duluan (mis. baru saja lunas via webhook) — kembalikan status sebenarnya.
      const fresh = await prisma.invoice.findUnique({ where: { orderId }, select: { status: true } });
      return NextResponse.json({ status: fresh?.status ?? "cancelled" });
    }
    if (invoice.subscriptionId) {
      await prisma.subscription.updateMany({
        where: { id: invoice.subscriptionId, status: "pending" },
        data: { status: "cancelled", updatedAt: new Date() },
      });
    }
    return NextResponse.json({ status: "cancelled" });
  }

  // ── Alur GUEST: belum ada invoice di DB ───────────────────────────────────
  const verified = await fetchTransactionStatus(orderId);
  if (!verified) {
    // Tak ada transaksi di Midtrans (mis. gagal charge / belum sempat) -> anggap batal.
    return NextResponse.json({ status: "cancelled" });
  }
  const st = resolveStatus(verified.transactionStatus, verified.fraudStatus);
  if (st === "paid") return NextResponse.json({ status: "paid" });
  if (st !== "pending") return NextResponse.json({ status: st });

  await cancelTransaction(orderId);
  return NextResponse.json({ status: "cancelled" });
}
