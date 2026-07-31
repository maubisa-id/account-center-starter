import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kirim ulang email akses (tautan atur kata sandi) untuk pembeli TAMU dari halaman
// /terima-kasih (§5 handoff checkout tamu). Email diambil dari INVOICE lewat orderId
// yang tak-tertebak (40-bit entropi), BUKAN dari body -> tak ada enumerasi email:
// penyerang tak bisa memicu email ke alamat sembarang. Hanya untuk invoice yang lunas.
// Jawaban selalu { ok: true } (seragam) supaya keberadaan pesanan tak bisa diprobe.
export async function POST(req: Request) {
  const limited = rateLimit(req, "pay-resend", { max: 5, windowMs: 10 * 60_000 });
  if (limited) return limited;

  let orderId = "";
  try {
    const body = (await req.json()) as { orderId?: string };
    orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  if (!orderId) {
    return NextResponse.json({ error: "Nomor pesanan tidak ada." }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { orderId },
    select: { status: true, user: { select: { email: true } } },
  });
  const email = invoice?.status === "paid" ? invoice.user?.email ?? null : null;
  if (email) {
    try {
      // Sama seperti webhook/provision: kirim tautan sekali pakai untuk atur kata sandi.
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: `${process.env.BETTER_AUTH_URL ?? ""}/reset-password` },
      });
    } catch {
      // Best-effort; jangan bocorkan detail ke klien.
    }
  }
  return NextResponse.json({ ok: true });
}
