import { NextResponse } from "next/server";
import { lookupBin } from "@/lib/midtrans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy BIN lookup (server key tak bocor ke browser). Hanya menerima 6-8 digit awal kartu
// (BIN), BUKAN nomor penuh -> tak ada PAN utuh yang menyentuh server kita. Rate-limited karena
// dipanggil saat mengetik; batas Midtrans sendiri 100/menit. Mengembalikan info advisory saja.
export async function GET(req: Request, ctx: { params: Promise<{ bin: string }> }) {
  const limited = rateLimit(req, "pay-bin", { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { bin } = await ctx.params;
  const digits = (bin ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length < 6) {
    return NextResponse.json({ error: "BIN minimal 6 digit." }, { status: 400 });
  }

  const info = await lookupBin(digits);
  if (!info) return NextResponse.json({ bank: null, brand: null, binType: null });
  // Sengaja hanya kembalikan field tampilan (bukan seluruh payload Midtrans).
  return NextResponse.json({
    bank: info.bank,
    bankCode: info.bankCode,
    brand: info.brand,
    binType: info.binType,
  });
}
