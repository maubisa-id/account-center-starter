import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { listMethods, upsertSavedCard, brandFromNumber } from "@/lib/payment-methods";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true } });
}

// Daftar metode pembayaran tersimpan milik pengguna login.
export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const methods = await listMethods(user.id);
  return NextResponse.json({ methods });
}

// Simpan kartu baru dari hasil Card Registration (frontend registerCard -> saved_token_id).
// Server hanya menerima TOKEN + masked_card (bukan PAN/CVV). Verifikasi sesi + rate limit.
export async function POST(req: Request) {
  const limited = rateLimit(req, "payment-methods-add", { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    savedTokenId?: string;
    maskedCard?: string;
    bankCode?: string;
    expMonth?: number | string;
    expYear?: number | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const savedToken = typeof body.savedTokenId === "string" ? body.savedTokenId.trim() : "";
  if (!savedToken) return NextResponse.json({ error: "Token kartu tidak ada." }, { status: 400 });
  const masked = typeof body.maskedCard === "string" ? body.maskedCard.trim() : null;
  // Kode bank dari BIN lookup di klien (aman: hanya string kode, mis. "bca"). Divalidasi ketat.
  const bankCode =
    typeof body.bankCode === "string" && /^[a-z0-9_-]{1,16}$/i.test(body.bankCode.trim())
      ? body.bankCode.trim().toLowerCase()
      : null;

  const expMonth = body.expMonth != null ? Number(body.expMonth) : null;
  const expYear = body.expYear != null ? Number(body.expYear) : null;
  const validMonth = expMonth && expMonth >= 1 && expMonth <= 12 ? expMonth : null;
  const validYear = expYear && expYear >= 2000 && expYear <= 2100 ? expYear : null;

  const { id, isNew } = await upsertSavedCard(prisma, user.id, {
    savedToken,
    maskedCard: masked,
    brand: brandFromNumber(masked ?? ""),
    bankCode,
    expMonth: validMonth,
    expYear: validYear,
  });

  return NextResponse.json({ ok: true, id, isNew });
}
