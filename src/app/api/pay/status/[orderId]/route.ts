import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchTransactionStatus, resolveStatus, type InvoiceStatus } from "@/lib/midtrans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Polling status pembayaran (Core API tidak punya callback popup seperti Snap).
// UI instruksi memanggil ini tiap beberapa detik sampai status terminal. Sengaja
// hanya mengembalikan status (bukan nominal/PII) supaya aman tanpa autentikasi.
//
// Strategi hemat panggilan Midtrans: baca DB dulu (diupdate webhook). Kalau invoice
// sudah terminal, pakai itu. Kalau masih pending / belum ada (guest sebelum lunas),
// verifikasi ke Get Status Midtrans (otoritatif).
const TERMINAL: InvoiceStatus[] = ["paid", "failed", "expired", "cancelled", "refunded"];

export async function GET(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  // Rate limit: endpoint publik (tanpa auth) yang jatuh ke Get Status Midtrans saat non-terminal.
  // Tanpa batas, bisa dipakai mengenumerasi status pesanan / mengamplifikasi panggilan ke Midtrans.
  // Polling sah = 12/menit/tab (interval 5 dtk); 90/menit menyisakan ruang beberapa tab per IP.
  const limited = rateLimit(req, "pay-status", { max: 90, windowMs: 60_000 });
  if (limited) return limited;

  const { orderId } = await ctx.params;
  if (!orderId) return NextResponse.json({ error: "orderId wajib." }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({
    where: { orderId },
    select: { status: true },
  });

  if (invoice && TERMINAL.includes(invoice.status as InvoiceStatus)) {
    return NextResponse.json({ status: invoice.status });
  }

  const verified = await fetchTransactionStatus(orderId);
  if (verified) {
    const status = resolveStatus(verified.transactionStatus, verified.fraudStatus);
    return NextResponse.json({ status });
  }

  // Belum ada info dari Midtrans (mis. baru dibuat / jaringan) -> anggap pending.
  return NextResponse.json({ status: invoice?.status ?? "pending" });
}
